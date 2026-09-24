import { Router } from 'express';
import { z } from 'zod';
import { CONTENT_MODELS, Setting, Appointment, Event, Review } from '../models/index.js';
import { asyncHandler, AppError, esc } from '../utils/http.js';
import { validate, formLimiter } from '../middleware/common.js';
import { upsertLead } from '../services/leads.js';
import { notifyRoles, sendEmail } from '../services/notify.js';
import { pricesVisible, hidePrices } from '../services/pricing.js';

const r = Router();

r.get(
  '/settings',
  asyncHandler(async (_req, res) => {
    const s = (await Setting.findOne({ key: 'site' }).lean()) || {};
    // only expose public-safe fields
    const { siteName, tagline, contactEmail, contactPhone, address, socials, stats, techStack, calendlyUrl, liveChatEmbed, gaMeasurementId, gtmId, chatbotEnabled, chatbotGreeting, marketplaces } = s;
    res.json({ siteName, tagline, contactEmail, contactPhone, address, socials, stats, techStack, calendlyUrl, liveChatEmbed, gaMeasurementId, gtmId, chatbotEnabled, chatbotGreeting, marketplaces, statsHistory: (s.statsHistory || []).slice(-24), showPrices: !!s.payments?.showPrices, paymentProvider: s.payments?.provider || 'manual' });
  })
);

// Navigation (mega menu) built from CMS
r.get(
  '/nav',
  asyncHandler(async (_req, res) => {
    const pick = (M) => M.find({ published: true }).sort('order title').select('title slug icon excerpt image packages.price').lean();
    const [services, solutions, industries, policies] = await Promise.all([pick(CONTENT_MODELS.services), pick(CONTENT_MODELS.solutions), pick(CONTENT_MODELS.industries), pick(CONTENT_MODELS.policies)]);
    const show = await pricesVisible();
    res.json({ services: show ? services : services.map(hidePrices), solutions, industries, policies });
  })
);

r.get(
  '/content/:type',
  asyncHandler(async (req, res) => {
    const M = CONTENT_MODELS[req.params.type];
    if (!M) throw new AppError(404, 'Unknown content type');
    const q = { published: true };
    for (const f of ['category', 'type', 'service', 'industry', 'featured', 'platform']) if (req.query[f]) q[f] = req.query[f];
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 100);
    const sort = req.params.type === 'blog' ? '-publishedAt' : 'order title';
    const docs = await M.find(q).sort(sort).limit(limit).lean();
    res.json((await pricesVisible()) ? docs : docs.map(hidePrices));
  })
);

r.get(
  '/content/:type/:slug',
  asyncHandler(async (req, res) => {
    const M = CONTENT_MODELS[req.params.type];
    if (!M) throw new AppError(404, 'Unknown content type');
    const doc = await M.findOne({ slug: req.params.slug, published: true }).lean();
    if (!doc) throw new AppError(404, 'Page not found');
    res.json((await pricesVisible()) ? doc : hidePrices(doc));
  })
);

// Published client reviews (+ averages) for a service page
r.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const q = { status: 'published' };
    if (req.query.service) q.serviceSlug = String(req.query.service);
    const items = await Review.find(q).sort('-publishedAt').limit(Math.min(parseInt(req.query.limit, 10) || 50, 100)).select('reviewerName country serviceTitle serviceSlug packageName ratings overall body publishedAt createdAt user').populate('user', 'name').lean();
    // reviewer = the client's own (current) name; the user id is never sent to the public
    for (const it of items) {
      it.reviewerName = it.user?.name?.trim() || it.reviewerName;
      delete it.user;
    }
    const n = items.length;
    const avg = (k) => (n ? Math.round((items.reduce((s, x) => s + (k ? x.ratings[k] : x.overall), 0) / n) * 10) / 10 : 0);
    const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: items.filter((x) => Math.round(x.overall) === s).length }));
    res.json({ count: n, overall: avg(), communication: avg('communication'), satisfaction: avg('satisfaction'), value: avg('value'), distribution: dist, items });
  })
);

const str = (max = 200) => z.string().trim().max(max);
const leadSchema = z.object({
  fullName: str(100).min(2, 'Please enter your full name'),
  company: str(120).optional().default(''),
  email: z.string().trim().toLowerCase().email('Please enter a valid business email'),
  phone: str(40).optional().default(''),
  website: str(200).optional().default(''),
  country: str(80).optional().default(''),
  industry: str(80).optional().default(''),
  service: str(80).min(1, 'Please choose a service'),
  budget: str(40).optional().default(''),
  timeline: str(40).optional().default(''),
  description: str(5000).min(10, 'Tell us a little more about your project (10+ characters)'),
  leadSource: str(80).optional().default(''),
  // honeypot + timing trap
  company_website: z.string().optional(),
  startedAt: z.number().optional(),
  page: str(300).optional(),
});

const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|proton|mail)\./i;

function isSpam(body) {
  if (body.company_website) return true; // honeypot filled by bots
  if (body.startedAt && Date.now() - body.startedAt < 2500) return true; // submitted too fast
  const links = (body.description.match(/https?:\/\//g) || []).length;
  if (links > 3) return true;
  return false;
}

r.post(
  '/leads',
  formLimiter,
  validate(leadSchema),
  asyncHandler(async (req, res) => {
    if (isSpam(req.body)) return res.status(201).json({ ok: true }); // silently drop
    const { company_website, startedAt, page, ...data } = req.body;
    const { lead, duplicate } = await upsertLead(data, {
      source: 'Website',
      meta: { ip: req.ip, userAgent: req.get('user-agent'), page },
    });
    await Event.create({ type: 'form_submit', path: page, meta: { service: data.service, industry: data.industry, freeMail: FREE_MAIL.test(data.email) } });
    res.status(201).json({ ok: true, reference: lead.leadId, duplicate });
  })
);

r.post(
  '/appointments',
  formLimiter,
  validate(
    z.object({
      name: str(100).min(2),
      email: z.string().trim().toLowerCase().email(),
      company: str(120).optional().default(''),
      phone: str(40).optional().default(''),
      website: str(200).optional().default(''),
      service: str(80).optional().default(''),
      startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
      timezone: str(60).optional(),
      agenda: str(2000).optional().default(''),
      company_website: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.company_website) return res.status(201).json({ ok: true });
    const when = new Date(req.body.startsAt);
    if (when < new Date()) throw new AppError(422, 'Please pick a future date/time');
    const { lead } = await upsertLead(
      {
        fullName: req.body.name,
        email: req.body.email,
        company: req.body.company,
        phone: req.body.phone,
        website: req.body.website,
        service: req.body.service,
        description: `Discovery call requested for ${when.toISOString()}.\n${req.body.agenda}`,
      },
      { source: 'Book a Call', status: 'Meeting Booked', notifyTitle: 'New discovery call', autoReply: false }
    );
    const appt = await Appointment.create({
      title: 'Discovery Call',
      name: req.body.name,
      email: req.body.email,
      company: req.body.company,
      phone: req.body.phone,
      startsAt: when,
      timezone: req.body.timezone,
      agenda: req.body.agenda,
      lead: lead._id,
    });
    await notifyRoles(['admin', 'sales'], {
      type: 'appointment_new',
      title: `Discovery call requested: ${req.body.name}`,
      body: `${esc(req.body.name)} requested a call on ${when.toUTCString()}.`,
      link: `/admin/appointments`,
    });
    await sendEmail({
      to: req.body.email,
      subject: 'Your discovery call request — Zeviro',
      html: `Hi ${esc(req.body.name.split(' ')[0])},<br/><br/>We received your request for a discovery call on <b>${when.toUTCString()}</b>. We'll confirm the slot and send a meeting link shortly.<br/><br/>— The Zeviro Team`,
    });
    res.status(201).json({ ok: true, id: appt._id });
  })
);

// Lightweight first-party analytics
r.post(
  '/events',
  asyncHandler(async (req, res) => {
    const { type, path, referrer, source, visitorId, meta } = req.body || {};
    if (!['pageview', 'cta_click', 'chat_open'].includes(type)) return res.json({ ok: true });
    await Event.create({ type, path: String(path || '').slice(0, 300), referrer: String(referrer || '').slice(0, 300), source: String(source || '').slice(0, 80), visitorId: String(visitorId || '').slice(0, 64), meta });
    res.json({ ok: true });
  })
);

export default r;
