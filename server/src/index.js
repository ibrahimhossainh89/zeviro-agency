import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { backfillOrderProjects } from './services/orderProject.js';
import { restoreUploads } from './services/uploadMirror.js';
import { spawn } from 'child_process';
import { apiLimiter, notFound, errorHandler, UPLOAD_DIR, MEDIA_DIR } from './middleware/common.js';
import { protect, staffOnly, clientOnly, requireModule } from './middleware/auth.js';
import { asyncHandler, AppError } from './utils/http.js';
import { File, Project, CONTENT_MODELS, Invoice, Appointment, Order } from './models/index.js';
import { notifyOrderClient } from './services/orders.js';
import { emptyReviewTrash } from './routes/reviews.js';
import { projectScope } from './middleware/auth.js';
import { sendEmail } from './services/notify.js';
import http from 'http';
import { initRealtime } from './realtime.js';
import { handleWebhook } from './services/payments.js';

import authRoutes, { AVATAR_DIR } from './routes/auth.js';
import publicRoutes from './routes/public.js';
import chatRoutes, { checkUnansweredChats } from './routes/chat.js';
import leadRoutes from './routes/leads.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import portalRoutes from './routes/portal.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy server/.env.example to server/.env');
  process.exit(1);
}

export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: false, // SPA served separately / via CDN; configure CSP at the edge
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------- API v1 ----------
const v1 = express.Router();
v1.use(apiLimiter);
v1.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));
v1.use('/auth', authRoutes);
v1.use('/public', publicRoutes);
v1.use('/chat', chatRoutes);
v1.use('/leads', protect, staffOnly, requireModule('leads'), leadRoutes);
v1.use('/reports', protect, staffOnly, requireModule('dashboard'), reportRoutes);
v1.use('/portal', protect, clientOnly, portalRoutes);
// Payment gateway webhooks (see services/payments.js)
v1.post(
  '/payments/webhook/:provider',
  asyncHandler(async (req, res) => {
    const handled = await handleWebhook(req.params.provider, req);
    res.status(handled ? 200 : 501).json({ ok: handled });
  })
);

// Permission-checked file download (staff or owning client)
v1.get(
  '/files/:id/download',
  protect,
  asyncHandler(async (req, res) => {
    const f = await File.findById(req.params.id);
    if (!f) throw new AppError(404, 'File not found');
    if (req.user.role === 'client') {
      if (String(f.client) !== String(req.clientId) || !f.visibleToClient) throw new AppError(403, 'Access denied');
    } else {
      // PM / developer / etc. only for files in projects they belong to
      const scope = projectScope(req.user);
      if (Object.keys(scope).length && (!f.project || !(await Project.exists({ _id: f.project, ...scope })))) throw new AppError(403, 'Access denied');
    }
    const p = path.join(UPLOAD_DIR, f.storedName);
    if (!fs.existsSync(p)) throw new AppError(404, 'File missing on storage');
    res.download(p, f.originalName);
  })
);

// Profile photos (random file names; safe to serve publicly so chat visitors can see agent photos)
v1.use('/avatars', express.static(AVATAR_DIR, { maxAge: '7d', fallthrough: false }));
v1.use('/media', express.static(MEDIA_DIR, { maxAge: '30d', fallthrough: false }));
v1.use('/', protect, staffOnly, adminRoutes);
app.use('/api/v1', v1);

// ---------- SEO: sitemap.xml + robots.txt ----------
app.get(
  '/sitemap.xml',
  asyncHandler(async (_req, res) => {
    const base = (process.env.SITE_URL || 'https://zeviro.agency').replace(/\/$/, '');
    const staticPaths = ['', '/services', '/solutions', '/industries', '/portfolio', '/hire-us', '/resources', '/faq', '/about', '/team', '/how-we-work', '/why-zeviro', '/contact', '/book-a-call', '/policies', '/signup', '/login'];
    const dyn = [];
    const map = { services: '/services', solutions: '/solutions', industries: '/industries', 'case-studies': '/portfolio', blog: '/resources', policies: '/policies' };
    for (const [type, prefix] of Object.entries(map)) {
      const docs = await CONTENT_MODELS[type].find({ published: true }).select('slug updatedAt').lean();
      docs.forEach((d) => dyn.push({ loc: `${prefix}/${d.slug}`, lastmod: d.updatedAt }));
    }
    const urls = [...staticPaths.map((p) => ({ loc: p })), ...dyn]
      .map((u) => `<url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}</url>`)
      .join('');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  })
);
app.get('/robots.txt', (req, res) => {
  if (/^(admin|team)\./i.test(req.hostname)) return res.type('text/plain').send('User-agent: *\nDisallow: /\n'); // private portals
  const base = (process.env.SITE_URL || 'https://zeviro.agency').replace(/\/$/, '');
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /portal\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
});

// ---------- Serve built frontend in production ----------
const clientDist = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: '7d', index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use('/api', notFound);
app.use(errorHandler);

// ---------- Background jobs ----------
async function runJobs() {
  try {
    // mark overdue invoices
    await Invoice.updateMany({ status: { $in: ['Pending', 'Partially Paid'] }, dueDate: { $lt: new Date() } }, { status: 'Overdue' });
    // 24h appointment reminders
    const soon = await Appointment.find({ reminderSent: false, status: { $in: ['Confirmed', 'Rescheduled'] }, startsAt: { $gte: new Date(), $lte: new Date(Date.now() + 24 * 3600e3) } });
    for (const a of soon) {
      await sendEmail({ to: a.email, subject: `Reminder: ${a.title} tomorrow`, html: `Your meeting "${a.title}" starts at <b>${a.startsAt.toUTCString()}</b>.${a.meetingLink ? `<br/>Join: <a href="${a.meetingLink}">${a.meetingLink}</a>` : ''}` });
      a.reminderSent = true;
      await a.save();
    }
    await checkUnansweredChats();
    await emptyReviewTrash(); // reviews rejected more than 30 days ago are deleted permanently
    // Delivered orders are completed automatically after 5 days without a response (see Revision & Delivery Policy)
    const stale = await Order.find({ status: 'Delivered', deliveredAt: { $lt: new Date(Date.now() - 5 * 864e5) } }).limit(50);
    for (const o of stale) {
      o.status = 'Completed';
      o.completedAt = new Date();
      o.timeline.push({ status: 'Completed', note: 'Automatically completed 5 days after delivery' });
      o.readBy = [];
      await o.save();
      await notifyOrderClient(o, { title: `Order ${o.number} completed`, body: 'Your order was marked as complete 5 days after delivery. Need anything else? Just message us.', email: false });
    }
  } catch (e) {
    console.error('[jobs]', e.message);
  }
}

/** First start on an empty database (e.g. a fresh MongoDB Atlas cluster): create the super admin + website content. */
async function autoSeed() {
  const { User } = await import('./models/index.js');
  if (await User.exists({ role: 'superadmin' })) return;
  console.log('[seed] empty database — creating the super admin and website content…');
  await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.resolve(__dirname, 'seed.js')], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env: process.env });
    child.on('exit', resolve);
    child.on('error', resolve);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = process.env.PORT || 5000;
  connectDB()
    .then(async () => {
      await restoreUploads().catch((e) => console.error('[uploads] restore failed', e.message));
      await autoSeed();
      const server = http.createServer(app);
      initRealtime(server);
      server.listen(port, () => console.log(`[api] http://localhost:${port}/api/v1`));
      setInterval(runJobs, 60 * 1000);
      backfillOrderProjects().catch((e) => console.error('[projects]', e.message)); // paid orders without a project get one
    })
    .catch((e) => {
      console.error('Failed to start:', e);
      process.exit(1);
    });
}
