import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import {
  Client, User, Project, Task, File, Folder, Message, Appointment, Proposal, Invoice, Ticket,
  Notification, Setting, AuditLog, CONTENT_MODELS, Order, Review, ClientRating, Lead, ChatConversation,
} from '../models/index.js';
import { crudRouter } from './crud.js';
import { requireModule, requireRole, projectScope } from '../middleware/auth.js';
import { asyncHandler, AppError, paginate, esc } from '../utils/http.js';
import { validate, upload, audit, UPLOAD_DIR, MEDIA_DIR } from '../middleware/common.js';
import { notifyUser, sendEmail } from '../services/notify.js';
import { ROLES } from '../config/permissions.js';
import { emit, emitAll } from '../realtime.js';
import { resetPriceCache } from '../services/pricing.js';
import multer from 'multer';
import { mirrorDiskStorage, removeUpload } from '../services/uploadMirror.js';
import crypto from 'crypto';
import orderRoutes from './orders.js';
import reviewRoutes from './reviews.js';

const r = Router();

// Helper: notify every portal user of a client
async function notifyClientUsers(clientId, payload) {
  const users = await User.find({ client: clientId, role: 'client', active: true }).select('_id');
  await Promise.all(users.map((u) => notifyUser(u._id, payload)));
}

// ---------------- Clients ----------------
const clients = Router();
clients.get(
  '/:id/overview',
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id).populate('accountManager', 'name email');
    if (!client) throw new AppError(404, 'Client not found');
    const [projects, invoices, proposals, users, tickets, messages, appointments] = await Promise.all([
      Project.find({ client: client._id }).select('name status progress deadline'),
      Invoice.find({ client: client._id }).select('number total amountPaid status dueDate currency'),
      Proposal.find({ client: client._id }).select('number title status total currency'),
      User.find({ client: client._id }).select('name email active lastLoginAt avatar title'),
      Ticket.find({ client: client._id }).select('ticketNo subject status priority createdAt'),
      Message.find({ client: client._id }).sort('-createdAt').limit(10).populate('from', 'name avatar title'),
      Appointment.find({ client: client._id }).sort('-startsAt').limit(10),
    ]);
    // two-way reviews, one row per completed order
    const [given, received, completed] = await Promise.all([
      ClientRating.find({ client: client._id }).lean(),
      Review.find({ client: client._id }).select('order overall status body createdAt').lean(),
      Order.find({ client: client._id, status: 'Completed' }).sort('-updatedAt').select('number serviceTitle packageName updatedAt').lean(),
    ]);
    const byOrder = (list) => Object.fromEntries(list.map((x) => [String(x.order), x]));
    const g = byOrder(given);
    const rcv = byOrder(received);
    const reviews = completed.map((o) => ({ order: o, mine: g[String(o._id)] || null, theirs: rcv[String(o._id)] || null }));
    const avg = given.length ? Math.round((given.reduce((s, x) => s + x.overall, 0) / given.length) * 10) / 10 : null;
    res.json({ client, projects, invoices, proposals, users, tickets, messages, appointments, reviews, clientRating: avg });
  })
);
clients.post(
  '/:id/users',
  validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8) })),
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) throw new AppError(404, 'Client not found');
    if (await User.findOne({ email: req.body.email.toLowerCase() })) throw new AppError(409, 'Email already in use');
    const u = await User.create({ ...req.body, role: 'client', client: client._id });
    await audit(req, 'create_portal_user', 'User', u._id, { client: client._id });
    await sendEmail({ to: u.email, subject: 'Your Zeviro client portal access', html: `Hi ${esc(u.name)},<br/>Your portal account is ready: <a href="${process.env.CLIENT_URL}/login">${process.env.CLIENT_URL}/login</a><br/>Email: ${u.email}<br/>Temporary password: ${req.body.password}` });
    res.status(201).json(u.toSafeJSON());
  })
);
clients.patch(
  '/:id/users/:userId',
  asyncHandler(async (req, res) => {
    const u = await User.findOne({ _id: req.params.userId, client: req.params.id });
    if (!u) throw new AppError(404, 'User not found');
    if (req.body.active !== undefined) u.active = !!req.body.active;
    if (req.body.password) u.password = req.body.password;
    await u.save();
    await audit(req, u.active ? 'activate_portal_user' : 'revoke_portal_user', 'User', u._id);
    res.json(u.toSafeJSON());
  })
);
// ---- Deleting (super admin + admin only) ----
const adminOnly = (req, _res, next) => (['superadmin', 'admin'].includes(req.user?.role) ? next() : next(new AppError(403, 'Only an administrator can delete clients or users')));

/** Everything that belongs to a client — used for the delete preview and the delete itself. */
async function clientFootprint(clientId) {
  const [projects, users] = await Promise.all([Project.find({ client: clientId }).select('_id'), User.find({ client: clientId }).select('_id')]);
  const projectIds = projects.map((p) => p._id);
  const userIds = users.map((u) => u._id);
  const q = {
    users: [User, { _id: { $in: userIds } }],
    projects: [Project, { client: clientId }],
    tasks: [Task, { project: { $in: projectIds } }],
    files: [File, { $or: [{ client: clientId }, { project: { $in: projectIds } }] }],
    folders: [Folder, { project: { $in: projectIds } }],
    messages: [Message, { client: clientId }],
    orders: [Order, { client: clientId }],
    invoices: [Invoice, { client: clientId }],
    proposals: [Proposal, { client: clientId }],
    tickets: [Ticket, { client: clientId }],
    appointments: [Appointment, { client: clientId }],
    reviews: [Review, { client: clientId }],
    clientRatings: [ClientRating, { client: clientId }],
    notifications: [Notification, { user: { $in: userIds } }],
  };
  return { q, userIds };
}

clients.get(
  '/:id/delete-preview',
  adminOnly,
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id).select('name');
    if (!client) throw new AppError(404, 'Client not found');
    const { q } = await clientFootprint(client._id);
    const counts = {};
    await Promise.all(Object.entries(q).map(async ([k, [M, f]]) => { counts[k] = await M.countDocuments(f); }));
    res.json({ name: client.name, counts });
  })
);

// Permanently delete a client and ALL of their data (portal users, orders, invoices, projects, files, messages…)
clients.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id);
    if (!client) throw new AppError(404, 'Client not found');
    const confirm = String(req.query.confirm ?? req.body?.confirm ?? '');
    if (confirm.trim() !== client.name.trim()) throw new AppError(400, 'Type the client name exactly to confirm');
    const { q } = await clientFootprint(client._id);
    // remove uploaded files from disk first
    const stored = await File.find(q.files[1]).select('storedName').lean();
    await Promise.all(stored.filter((f) => f.storedName).map((f) => removeUpload(path.join(UPLOAD_DIR, f.storedName))));
    const deleted = {};
    for (const [k, [M, f]] of Object.entries(q)) deleted[k] = (await M.deleteMany(f)).deletedCount || 0;
    await client.deleteOne();
    await audit(req, 'delete_client', 'Client', client._id, { name: client.name, deleted });
    emit('order-staff', 'order:stats', {}); // revenue dashboard
    if (deleted.reviews) emitAll('site:update', { type: 'reviews' });
    res.json({ ok: true, deleted });
  })
);

// Permanently delete one portal user (the client company and its orders stay)
clients.delete(
  '/:id/users/:userId',
  adminOnly,
  asyncHandler(async (req, res) => {
    const u = await User.findOne({ _id: req.params.userId, client: req.params.id, role: 'client' });
    if (!u) throw new AppError(404, 'User not found');
    await Notification.deleteMany({ user: u._id });
    await u.deleteOne();
    emit(`user:${u._id}`, 'session:ended', {}); // an open session is logged out on its next request
    await audit(req, 'delete_portal_user', 'User', u._id, { email: u.email, client: req.params.id });
    res.json({ ok: true });
  })
);

clients.use('/', crudRouter(Client, { search: ['name', 'website', 'primaryContact.email', 'primaryContact.name'], filters: ['status', 'industry'], populate: { path: 'accountManager', select: 'name' } }));
r.use('/clients', requireModule('clients'), clients);

// ---------------- Projects ----------------
const projects = Router();
projects.post(
  '/:id/milestones',
  asyncHandler(async (req, res) => {
    const p = await Project.findOne({ _id: req.params.id, ...projectScope(req.user) });
    if (!p) throw new AppError(404, 'Project not found');
    p.milestones.push(req.body);
    p.activity.push({ text: `Milestone added: ${req.body.title}`, by: req.user._id });
    await p.save();
    res.json(p);
  })
);
projects.patch(
  '/:id/milestones/:mid',
  asyncHandler(async (req, res) => {
    const p = await Project.findOne({ _id: req.params.id, ...projectScope(req.user) });
    if (!p) throw new AppError(404, 'Project not found');
    const m = p.milestones.id(req.params.mid);
    if (!m) throw new AppError(404, 'Milestone not found');
    const wasDone = m.status === 'Completed';
    m.set(req.body);
    if (m.status === 'Completed' && !wasDone) {
      m.completedAt = new Date();
      p.activity.push({ text: `Milestone completed: ${m.title} ✅`, by: req.user._id });
      await notifyClientUsers(p.client, { type: 'milestone', title: `Milestone completed: ${m.title}`, body: `Project ${p.name}`, link: `/portal/projects/${p._id}` });
    }
    await p.save();
    res.json(p);
  })
);
projects.delete(
  '/:id/milestones/:mid',
  asyncHandler(async (req, res) => {
    const p = await Project.findOne({ _id: req.params.id, ...projectScope(req.user) });
    if (!p) throw new AppError(404, 'Project not found');
    p.milestones.pull(req.params.mid);
    await p.save();
    res.json(p);
  })
);
projects.post(
  '/:id/activity',
  asyncHandler(async (req, res) => {
    const p = await Project.findOne({ _id: req.params.id, ...projectScope(req.user) });
    if (!p) throw new AppError(404, 'Project not found');
    p.activity.push({ text: req.body.text, visibleToClient: req.body.visibleToClient !== false, by: req.user._id });
    await p.save();
    res.json(p);
  })
);
projects.use(
  '/',
  crudRouter(Project, {
    search: ['name', 'description'],
    filters: ['status', 'client', 'manager'],
    scope: (req) => projectScope(req.user),
    populate: [{ path: 'client', select: 'name' }, { path: 'manager', select: 'name' }, { path: 'team', select: 'name role' }, { path: 'activity.by', select: 'name' }],
    hooks: {
      afterCreate: async (req, doc) => {
        await notifyClientUsers(doc.client, { type: 'project_new', title: `New project: ${doc.name}`, body: 'A new project was created in your portal.', link: `/portal/projects/${doc._id}`, email: true });
        for (const u of [doc.manager, ...(doc.team || [])].filter(Boolean)) await notifyUser(u, { type: 'project_new', title: `Added to project: ${doc.name}`, link: `/admin/projects/${doc._id}` });
      },
      afterUpdate: async (req, doc, before) => {
        if (before.status !== doc.status) {
          doc.activity.push({ text: `Status: ${before.status} → ${doc.status}`, by: req.user._id });
          await doc.save();
          await notifyClientUsers(doc.client, { type: 'project_status', title: `${doc.name} is now "${doc.status}"`, link: `/portal/projects/${doc._id}` });
        }
      },
    },
  })
);
r.use('/projects', requireModule('projects'), projects);

// ---------------- Tasks ----------------
async function allowedProjectIds(user) {
  const s = projectScope(user);
  if (!Object.keys(s).length) return null;
  return (await Project.find(s).select('_id')).map((p) => p._id);
}
const tasks = Router();
tasks.post(
  '/:id/comments',
  validate(z.object({ text: z.string().trim().min(1).max(5000), internal: z.boolean().optional(), attachments: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    const ids = await allowedProjectIds(req.user);
    const t = await Task.findOne({ _id: req.params.id, ...(ids && { project: { $in: ids } }) }).populate('project', 'client name');
    if (!t) throw new AppError(404, 'Task not found');
    t.comments.push({ text: req.body.text, internal: !!req.body.internal, attachments: req.body.attachments, by: req.user._id });
    await t.save();
    if (t.visibleToClient && !req.body.internal)
      await notifyClientUsers(t.project.client, { type: 'task_comment', title: `New comment on "${t.title}"`, link: `/portal/tasks` });
    res.json(await t.populate([{ path: 'comments.by', select: 'name role' }, { path: 'assignee', select: 'name' }]));
  })
);
tasks.use(
  '/',
  crudRouter(Task, {
    search: ['title', 'description'],
    filters: ['status', 'priority', 'project', 'assignee'],
    scope: async (req) => {
      const ids = await allowedProjectIds(req.user);
      const q = ids ? { project: { $in: ids } } : {};
      if (req.query.mine === '1') q.assignee = req.user._id;
      return q;
    },
    populate: [{ path: 'project', select: 'name client' }, { path: 'assignee', select: 'name' }, { path: 'comments.by', select: 'name role' }, { path: 'attachments', select: 'originalName size mimeType' }],
    hooks: {
      beforeCreate: async (req, data) => {
        const ids = await allowedProjectIds(req.user);
        if (ids && !ids.some((id) => String(id) === String(data.project))) throw new AppError(403, 'Not a member of that project');
        return data;
      },
      afterCreate: async (req, doc) => {
        if (doc.assignee) await notifyUser(doc.assignee, { type: 'task_assigned', title: `Task assigned: ${doc.title}`, link: `/admin/tasks`, email: true });
      },
      afterUpdate: async (req, doc, before) => {
        if (String(before.assignee || '') !== String(doc.assignee || '') && doc.assignee)
          await notifyUser(doc.assignee, { type: 'task_assigned', title: `Task assigned: ${doc.title}`, link: `/admin/tasks` });
        if (before.status !== 'Done' && doc.status === 'Done') {
          doc.completedAt = new Date();
          await doc.save();
        }
      },
    },
  })
);
r.use('/tasks', requireModule('tasks'), tasks);

// ---------------- Files / Media ----------------
const files = Router();
files.post(
  '/',
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError(400, 'No files uploaded');
    let clientId = req.body.client || undefined;
    if (req.body.project) {
      const p = await Project.findOne({ _id: req.body.project, ...projectScope(req.user) });
      if (!p) throw new AppError(403, 'Not allowed for this project');
      clientId = p.client;
    }
    const docs = await File.insertMany(
      req.files.map((f) => ({
        originalName: f.originalname,
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        category: req.body.category || 'Other',
        project: req.body.project || undefined,
        folder: req.body.folder || undefined,
        client: clientId,
        visibleToClient: req.body.visibleToClient !== 'false',
        uploadedBy: req.user._id,
      }))
    );
    for (const d of docs) {
      d.url = `/api/v1/files/${d._id}/download`;
      await d.save();
    }
    if (clientId && req.body.visibleToClient !== 'false')
      await notifyClientUsers(clientId, { type: 'file', title: `${docs.length} new file(s) shared with you`, link: '/portal/files' });
    await audit(req, 'upload', 'File', docs[0]._id, { count: docs.length });
    res.status(201).json(docs);
  })
);
files.get(
  '/folders',
  asyncHandler(async (req, res) => res.json(await Folder.find(req.query.project ? { project: req.query.project } : {}).sort('name')))
);
files.post(
  '/folders',
  asyncHandler(async (req, res) => res.status(201).json(await Folder.create({ name: req.body.name, project: req.body.project })))
);
files.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const f = await File.findByIdAndDelete(req.params.id);
    if (f?.storedName) removeUpload(path.join(UPLOAD_DIR, f.storedName));
    await audit(req, 'delete', 'File', req.params.id);
    res.json({ ok: true });
  })
);
files.use(
  '/',
  crudRouter(File, {
    search: ['originalName'],
    filters: ['project', 'client', 'category', 'folder'],
    populate: [{ path: 'project', select: 'name' }, { path: 'uploadedBy', select: 'name' }],
    writable: ['category', 'visibleToClient', 'folder', 'originalName'],
    scope: async (req) => {
      const ids = await allowedProjectIds(req.user);
      return ids ? { project: { $in: ids } } : {};
    },
  })
);
r.use('/files', requireModule('files'), files);

// ---------------- Messages (client <-> team) ----------------
const messages = Router();
messages.get(
  '/threads',
  asyncHandler(async (_req, res) => {
    const all = await Message.find().sort('-createdAt').select('client body createdAt fromClient readByTeam').populate('client', 'name logo').lean();
    const map = new Map();
    for (const m of all) {
      if (!m.client) continue;
      const k = String(m.client._id);
      if (!map.has(k)) map.set(k, { _id: m.client._id, client: m.client, last: { body: m.body, createdAt: m.createdAt, fromClient: m.fromClient }, unread: 0 });
      if (m.fromClient && !m.readByTeam) map.get(k).unread += 1;
    }
    const threads = [...map.values()];
    // show the client's portal user (photo + name) next to each thread
    const contacts = await User.find({ role: 'client', client: { $in: threads.map((t) => t._id) } }).sort('createdAt').select('name avatar title client').lean();
    for (const t of threads) t.contact = contacts.find((u) => String(u.client) === String(t._id)) || null;
    res.json(threads);
  })
);
messages.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.query.client) throw new AppError(400, 'client is required');
    const q = { client: req.query.client, ...(req.query.project && { project: req.query.project }) };
    const items = await Message.find(q).sort('createdAt').populate('from', 'name role avatar title').populate('attachments', 'originalName size').populate('project', 'name');
    const r2 = await Message.updateMany({ ...q, fromClient: true, readByTeam: false }, { readByTeam: true });
    if (r2.modifiedCount) {
      emit(`client:${req.query.client}`, 'msg:read', { clientId: String(req.query.client), by: 'team' });
      emit('msg-staff', 'msg:thread', { clientId: String(req.query.client) }); // refresh unread badges
    }
    res.json(items);
  })
);
messages.post(
  '/',
  validate(z.object({ client: z.string(), project: z.string().optional(), body: z.string().trim().min(1).max(5000), attachments: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    const m = await Message.create({ ...req.body, from: req.user._id, fromClient: false, readByTeam: true });
    await m.populate([{ path: 'from', select: 'name role avatar title' }, { path: 'attachments', select: 'originalName size url' }, { path: 'project', select: 'name' }]);
    emit(`client:${req.body.client}`, 'msg:new', { clientId: String(req.body.client), message: m });
    emit('msg-staff', 'msg:thread', { clientId: String(req.body.client) });
    res.status(201).json(m);
    notifyClientUsers(req.body.client, { type: 'message', title: `New message from ${req.user.name}`, body: esc(req.body.body.slice(0, 200)), link: '/portal/messages', email: true }).catch(() => {});
  })
);
r.use('/messages', requireModule('messages'), messages);

// ---------------- Appointments ----------------
r.use(
  '/appointments',
  requireModule('appointments'),
  crudRouter(Appointment, {
    search: ['name', 'email', 'company', 'title'],
    filters: ['status', 'client', 'host'],
    sort: 'startsAt',
    populate: [{ path: 'client', select: 'name' }, { path: 'host', select: 'name' }, { path: 'lead', select: 'fullName leadId' }],
    hooks: {
      afterUpdate: async (req, doc, before) => {
        if (before.status !== doc.status || String(before.startsAt) !== String(doc.startsAt)) {
          const to = doc.email;
          await sendEmail({
            to,
            subject: `Meeting ${doc.status.toLowerCase()}: ${doc.title}`,
            html: `Your meeting "${doc.title}" is <b>${doc.status}</b> for <b>${new Date(doc.startsAt).toUTCString()}</b>.${doc.meetingLink ? `<br/>Join link: <a href="${doc.meetingLink}">${doc.meetingLink}</a>` : ''}`,
          });
          if (doc.client) await notifyClientUsers(doc.client, { type: 'meeting', title: `Meeting ${doc.status}: ${doc.title}`, link: '/portal/meetings' });
        }
      },
      afterCreate: async (req, doc) => {
        if (doc.client) await notifyClientUsers(doc.client, { type: 'meeting', title: `Meeting scheduled: ${doc.title}`, link: '/portal/meetings', email: true });
      },
    },
  })
);

// ---------------- Proposals ----------------
const proposals = Router();
proposals.post(
  '/:id/send',
  asyncHandler(async (req, res) => {
    const p = await Proposal.findById(req.params.id);
    if (!p) throw new AppError(404, 'Proposal not found');
    if (!p.client) throw new AppError(422, 'Attach the proposal to a client before sending');
    p.status = 'Sent';
    p.sentAt = new Date();
    await p.save();
    await notifyClientUsers(p.client, { type: 'proposal', title: `New proposal: ${p.title}`, body: 'Please review and accept or decline in your portal.', link: `/portal/proposals`, email: true });
    await audit(req, 'send', 'Proposal', p._id);
    res.json(p);
  })
);
proposals.use('/', crudRouter(Proposal, { search: ['title', 'number'], filters: ['status', 'client'], populate: [{ path: 'client', select: 'name' }, { path: 'lead', select: 'fullName' }], hooks: { beforeCreate: (req, d) => ({ ...d, createdBy: req.user._id }) } }));
r.use('/proposals', requireModule('proposals'), proposals);

// ---------------- Invoices ----------------
const invoices = Router();
invoices.post(
  '/:id/payments',
  validate(z.object({ amount: z.number().positive(), method: z.string().optional(), reference: z.string().optional(), paidAt: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) throw new AppError(404, 'Invoice not found');
    inv.payments.push(req.body);
    await inv.save();
    await notifyClientUsers(inv.client, { type: 'payment', title: `Payment received for ${inv.number}`, body: `${inv.currency} ${req.body.amount}`, link: '/portal/invoices', email: true });
    await audit(req, 'payment', 'Invoice', inv._id, req.body);
    res.json(inv);
  })
);
invoices.post(
  '/:id/send',
  asyncHandler(async (req, res) => {
    const inv = await Invoice.findById(req.params.id);
    if (!inv) throw new AppError(404, 'Invoice not found');
    if (inv.status === 'Draft') inv.status = 'Pending';
    await inv.save();
    await notifyClientUsers(inv.client, { type: 'invoice', title: `Invoice ${inv.number} generated`, body: `Amount due: ${inv.currency} ${inv.total}`, link: `/portal/invoices`, email: true });
    res.json(inv);
  })
);
invoices.use('/', crudRouter(Invoice, { search: ['number'], filters: ['status', 'client', 'project'], populate: [{ path: 'client', select: 'name' }, { path: 'project', select: 'name' }] }));
r.use('/invoices', requireModule('invoices'), invoices);

// ---------------- Orders ----------------
r.use('/orders', requireModule('orders'), orderRoutes);
r.use('/reviews', requireModule('reviews'), reviewRoutes);

// ---------------- Support tickets ----------------
const tickets = Router();
tickets.post(
  '/:id/replies',
  validate(z.object({ body: z.string().trim().min(1).max(5000), status: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const t = await Ticket.findById(req.params.id);
    if (!t) throw new AppError(404, 'Ticket not found');
    t.replies.push({ body: req.body.body, by: req.user._id, fromClient: false });
    if (req.body.status) t.status = req.body.status;
    else if (t.status === 'Open') t.status = 'In Progress';
    await t.save();
    await notifyClientUsers(t.client, { type: 'ticket', title: `Update on ticket ${t.ticketNo}`, body: esc(req.body.body.slice(0, 200)), link: '/portal/support', email: true });
    res.json(await t.populate([{ path: 'replies.by', select: 'name role' }, { path: 'client', select: 'name' }]));
  })
);
tickets.use(
  '/',
  crudRouter(Ticket, {
    search: ['subject', 'ticketNo'],
    filters: ['status', 'priority', 'client', 'category', 'assignee'],
    populate: [{ path: 'client', select: 'name' }, { path: 'assignee', select: 'name' }, { path: 'replies.by', select: 'name role' }, { path: 'project', select: 'name' }],
    hooks: {
      afterUpdate: async (req, doc, before) => {
        if (before.status !== doc.status) await notifyClientUsers(doc.client, { type: 'ticket', title: `Ticket ${doc.ticketNo} is now ${doc.status}`, link: '/portal/support' });
      },
    },
  })
);
r.use('/tickets', requireModule('tickets'), tickets);

// ---------------- CMS ----------------
const cms = Router({ mergeParams: true });
// Tell every open website tab that content changed, so it updates live without a refresh
cms.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => res.statusCode < 400 && emitAll('site:update', { type: req.path.split('/')[1] }));
  next();
});
// Image upload for CMS content (gig images, covers, team photos…) — served publicly at /api/v1/media/<file>
const MEDIA_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };
const mediaUpload = multer({
  storage: mirrorDiskStorage({ destination: MEDIA_DIR, filename: (_q, f, cb) => cb(null, crypto.randomBytes(12).toString('hex') + MEDIA_TYPES[f.mimetype]) }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_q, f, cb) => (MEDIA_TYPES[f.mimetype] && f.mimetype !== 'image/svg+xml' ? cb(null, true) : cb(new AppError(415, 'Please upload a JPG, PNG, WEBP or GIF image (max 5 MB)'))),
});
cms.post('/upload', mediaUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'No image uploaded');
  await audit(req, 'upload', 'Media', req.file.filename);
  res.status(201).json({ url: `/api/v1/media/${req.file.filename}` });
}));
for (const [type, Model] of Object.entries(CONTENT_MODELS)) {
  cms.use(`/${type}`, crudRouter(Model, { search: ['title', 'excerpt'], filters: ['published', 'category'], sort: 'order -createdAt' }));
}
r.use('/cms', requireModule('cms'), cms);

// ---------------- Users (Super Admin) ----------------
const users = Router();
users.post(
  '/',
  validate(z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), role: z.enum(ROLES), title: z.string().optional(), client: z.string().optional() })),
  asyncHandler(async (req, res) => {
    if (await User.findOne({ email: req.body.email.toLowerCase() })) throw new AppError(409, 'Email already in use');
    const u = await User.create(req.body);
    await audit(req, 'create', 'User', u._id, { role: u.role });
    res.status(201).json(u.toSafeJSON());
  })
);
users.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) throw new AppError(404, 'User not found');
    if (String(u._id) === String(req.user._id) && (req.body.active === false || (req.body.role && req.body.role !== 'superadmin')))
      throw new AppError(400, "You can't deactivate or demote yourself");
    for (const k of ['name', 'role', 'active', 'title', 'phone', 'client']) if (req.body[k] !== undefined) u[k] = req.body[k];
    if (req.body.password) u.password = req.body.password;
    await u.save();
    await audit(req, 'update', 'User', u._id, { fields: Object.keys(req.body).filter((k) => k !== 'password') });
    res.json(u.toSafeJSON());
  })
);
// Permanently delete a user (super admin only). Their open work is unassigned, not deleted.
users.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const u = await User.findById(req.params.id);
    if (!u) throw new AppError(404, 'User not found');
    if (String(u._id) === String(req.user._id)) throw new AppError(400, "You can't delete your own account");
    if (u.role === 'superadmin' && (await User.countDocuments({ role: 'superadmin', active: true, _id: { $ne: u._id } })) === 0) throw new AppError(400, "You can't delete the last super admin");
    const id = u._id;
    await Promise.all([
      Lead.updateMany({ owner: id }, { $unset: { owner: 1 } }),
      Client.updateMany({ accountManager: id }, { $unset: { accountManager: 1 } }),
      Appointment.updateMany({ host: id }, { $unset: { host: 1 } }),
      ChatConversation.updateMany({ assignedAgent: id }, { $unset: { assignedAgent: 1 } }),
      Project.updateMany({ manager: id }, { $unset: { manager: 1 } }),
      Project.updateMany({ team: id }, { $pull: { team: id } }),
      Task.updateMany({ assignee: id }, { $unset: { assignee: 1 } }),
      Ticket.updateMany({ assignee: id }, { $unset: { assignee: 1 } }),
      Order.updateMany({ assignee: id }, { $unset: { assignee: 1 } }),
      Notification.deleteMany({ user: id }),
    ]);
    await u.deleteOne();
    await audit(req, 'delete_user', 'User', id, { email: u.email, role: u.role });
    res.json({ ok: true });
  })
);
users.use('/', crudRouter(User, { search: ['name', 'email'], filters: ['role', 'active', 'client'], populate: { path: 'client', select: 'name' }, readOnly: true }));
r.use('/users', requireRole(), users); // superadmin only
// Minimal staff directory for dropdowns (any staff)
r.get('/staff', asyncHandler(async (_req, res) => res.json(await User.find({ role: { $ne: 'client' }, active: true }).select('name role email title avatar').sort('name'))));

// ---------------- Notifications (own) ----------------
r.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req);
    const [items, unread, total] = await Promise.all([
      Notification.find({ user: req.user._id }).sort('-createdAt').skip(skip).limit(limit),
      Notification.countDocuments({ user: req.user._id, read: false }),
      Notification.countDocuments({ user: req.user._id }),
    ]);
    res.json({ items, unread, total, page, pages: Math.ceil(total / limit) });
  })
);
r.post('/notifications/read-all', asyncHandler(async (req, res) => { await Notification.updateMany({ user: req.user._id, read: false }, { read: true }); emit(`user:${req.user._id}`, 'notification:read', {}); res.json({ ok: true }); }));
r.patch('/notifications/:id', asyncHandler(async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true }); emit(`user:${req.user._id}`, 'notification:read', {}); res.json({ ok: true }); }));
r.post('/notifications/read-link', asyncHandler(async (req, res) => {
  const link = String(req.body?.link || '').slice(0, 300);
  const r2 = link ? await Notification.updateMany({ user: req.user._id, read: false, link }, { read: true }) : { modifiedCount: 0 };
  if (r2.modifiedCount) emit(`user:${req.user._id}`, 'notification:read', {});
  res.json({ ok: true, updated: r2.modifiedCount });
}));

// ---------------- Settings ----------------
r.get('/settings', requireModule('settings'), asyncHandler(async (_req, res) => res.json((await Setting.findOne({ key: 'site' })) || (await Setting.create({ key: 'site' })))));
r.put(
  '/settings',
  requireModule('settings'),
  asyncHandler(async (req, res) => {
    const { _id, key, createdAt, updatedAt, statsHistory, ...data } = req.body;
    const before = await Setting.findOne({ key: 'site' }).lean();
    const s = await Setting.findOneAndUpdate({ key: 'site' }, data, { new: true, upsert: true, runValidators: true });
    // record a snapshot whenever the marketplace numbers change (drives the live growth chart on the website)
    const snap = (x) => ({ fiverrRating: x?.marketplaces?.fiverr?.rating, fiverrReviews: x?.marketplaces?.fiverr?.reviews, upworkRating: x?.marketplaces?.upwork?.rating, upworkJobs: x?.marketplaces?.upwork?.jobs });
    if (JSON.stringify(snap(before)) !== JSON.stringify(snap(s))) {
      s.statsHistory.push({ at: new Date(), ...snap(s) });
      if (s.statsHistory.length > 60) s.statsHistory = s.statsHistory.slice(-60);
      await s.save();
    }
    resetPriceCache();
    emitAll('site:update', { type: 'settings' }); // every open website tab refreshes these numbers instantly
    await audit(req, 'update', 'Setting', s._id, { fields: Object.keys(data) });
    res.json(s);
  })
);

// ---------------- Audit logs ----------------
r.get(
  '/audit-logs',
  requireModule('audit'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req);
    const q = {};
    if (req.query.entity) q.entity = req.query.entity;
    if (req.query.action) q.action = req.query.action;
    const [items, total] = await Promise.all([AuditLog.find(q).sort('-createdAt').skip(skip).limit(limit).populate('user', 'name email role'), AuditLog.countDocuments(q)]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  })
);

export default r;
