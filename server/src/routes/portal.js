// Client Portal API (Spec §10 & §11). Every query is scoped to req.clientId — Client A only sees Client A data.
import { Router } from 'express';
import { z } from 'zod';
import { Client, User, Project, Task, File, Folder, Message, Proposal, Invoice, Appointment, Ticket, Notification, Order, Setting, Review, ClientRating } from '../models/index.js';
import { placeOrder, notifyOrderClient, pushTimeline, markOrderRead } from '../services/orders.js';
import { createCheckout } from '../services/payments.js';
import { asyncHandler, AppError, esc } from '../utils/http.js';
import { validate, upload, audit } from '../middleware/common.js';
import { notifyRoles, notifyUser } from '../services/notify.js';
import { emit, emitAll } from '../realtime.js';

const r = Router();

async function clientProjectIds(clientId) {
  return (await Project.find({ client: clientId }).select('_id')).map((p) => p._id);
}
async function ownProject(req, id) {
  const p = await Project.findOne({ _id: id, client: req.clientId });
  if (!p) throw new AppError(404, 'Project not found');
  return p;
}
async function notifyTeam(project, payload) {
  const ids = project ? [project.manager, ...(project.team || [])].filter(Boolean) : [];
  if (ids.length) await Promise.all(ids.map((u) => notifyUser(u, payload)));
  else await notifyRoles(['admin', 'pm'], payload);
}

// ---------- Overview ----------
r.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const cid = req.clientId;
    const pids = await clientProjectIds(cid);
    const [client, projects, pendingTasks, meetings, messages, invoices, files, notifications, unreadMessages] = await Promise.all([
      Client.findById(cid).populate('accountManager', 'name email title avatar'),
      Project.find({ client: cid, status: { $ne: 'Completed' } }).select('name status progress deadline milestones').populate('manager', 'name'),
      Task.find({ project: { $in: pids }, visibleToClient: true, status: { $ne: 'Done' } }).sort('dueDate').limit(6).select('title status priority dueDate project').populate('project', 'name'),
      Appointment.find({ client: cid, startsAt: { $gte: new Date() }, status: { $in: ['Requested', 'Confirmed', 'Rescheduled'] } }).sort('startsAt').limit(4),
      Message.find({ client: cid }).sort('-createdAt').limit(5).populate('from', 'name avatar title'),
      Invoice.find({ client: cid, status: { $in: ['Pending', 'Overdue', 'Partially Paid'] } }).select('number total amountPaid currency status dueDate'),
      File.find({ client: cid, visibleToClient: true }).sort('-createdAt').limit(5).select('originalName size category createdAt url'),
      Notification.find({ user: req.user._id }).sort('-createdAt').limit(6),
      Message.countDocuments({ client: cid, fromClient: false, readByClient: false }),
    ]);
    const upcomingDeadline = projects.filter((p) => p.deadline).sort((a, b) => a.deadline - b.deadline)[0] || null;
    const overallProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0;
    res.json({ user: req.user.toSafeJSON(), client, projects, overallProgress, upcomingDeadline, pendingTasks, meetings, messages, invoices, files, notifications, unreadMessages });
  })
);

// ---------- Projects ----------
r.get('/projects', asyncHandler(async (req, res) => res.json(await Project.find({ client: req.clientId }).sort('-createdAt').select('-activity').populate('manager', 'name'))));
r.get(
  '/projects/:id',
  asyncHandler(async (req, res) => {
    const p = await Project.findOne({ _id: req.params.id, client: req.clientId }).populate('manager', 'name email title avatar').populate('team', 'name role title avatar').populate('activity.by', 'name avatar');
    if (!p) throw new AppError(404, 'Project not found');
    const tasks = await Task.find({ project: p._id, visibleToClient: true }).select('title status priority dueDate');
    const obj = p.toObject();
    obj.activity = obj.activity.filter((a) => a.visibleToClient !== false).reverse();
    obj.taskStats = { total: tasks.length, done: tasks.filter((t) => t.status === 'Done').length };
    obj.tasks = tasks;
    res.json(obj);
  })
);

// ---------- Tasks (client-visible only) ----------
const visibleTask = async (req, id) => {
  const pids = await clientProjectIds(req.clientId);
  const t = await Task.findOne({ _id: id, project: { $in: pids }, visibleToClient: true });
  if (!t) throw new AppError(404, 'Task not found');
  return t;
};
const cleanTask = (t) => {
  const o = t.toObject();
  o.comments = (o.comments || []).filter((c) => !c.internal);
  return o;
};
r.get(
  '/tasks',
  asyncHandler(async (req, res) => {
    const pids = await clientProjectIds(req.clientId);
    const q = { project: { $in: pids }, visibleToClient: true };
    if (req.query.project) q.project = req.query.project;
    if (req.query.status) q.status = req.query.status;
    const tasks = await Task.find(q).sort('dueDate').populate('project', 'name').populate('comments.by', 'name role avatar title').populate('attachments', 'originalName size url');
    res.json(tasks.filter((t) => pids.some((id) => String(id) === String(t.project._id))).map(cleanTask));
  })
);
r.post(
  '/tasks/:id/comments',
  validate(z.object({ text: z.string().trim().min(1).max(5000), attachments: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    const t = await visibleTask(req, req.params.id);
    t.comments.push({ text: req.body.text, by: req.user._id, attachments: req.body.attachments });
    await t.save();
    const p = await Project.findById(t.project);
    await notifyTeam(p, { type: 'task_comment', title: `Client commented on "${t.title}"`, body: esc(req.body.text.slice(0, 200)), link: '/admin/tasks' });
    await t.populate('comments.by', 'name role avatar title');
    res.json(cleanTask(t));
  })
);

// ---------- Files ----------
r.get(
  '/files',
  asyncHandler(async (req, res) => {
    const q = { client: req.clientId, visibleToClient: true };
    if (req.query.project) q.project = req.query.project;
    if (req.query.category) q.category = req.query.category;
    if (req.query.folder) q.folder = req.query.folder;
    const pids = await clientProjectIds(req.clientId);
    const [files, folders] = await Promise.all([
      File.find(q).sort('-createdAt').populate('project', 'name').populate('uploadedBy', 'name role'),
      Folder.find({ project: { $in: pids } }).sort('name'),
    ]);
    res.json({ files, folders });
  })
);
r.post(
  '/files',
  upload.array('files', 5),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new AppError(400, 'No files uploaded');
    let project = null;
    if (req.body.project) project = await ownProject(req, req.body.project);
    const docs = await File.insertMany(
      req.files.map((f) => ({
        originalName: f.originalname,
        storedName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        category: ['Requirements', 'Document', 'Attachment', 'Other'].includes(req.body.category) ? req.body.category : 'Requirements',
        project: project?._id,
        client: req.clientId,
        visibleToClient: true,
        uploadedBy: req.user._id,
      }))
    );
    for (const d of docs) {
      d.url = `/api/v1/files/${d._id}/download`;
      await d.save();
    }
    await notifyTeam(project, { type: 'file', title: `Client uploaded ${docs.length} file(s)`, link: '/admin/media' });
    await audit(req, 'client_upload', 'File', docs[0]._id, { count: docs.length });
    res.status(201).json(docs);
  })
);

// ---------- Messages ----------
r.get(
  '/messages',
  asyncHandler(async (req, res) => {
    const q = { client: req.clientId };
    if (req.query.project) q.project = req.query.project;
    const items = await Message.find(q).sort('createdAt').populate('from', 'name role avatar title').populate('attachments', 'originalName size url').populate('project', 'name');
    const r2 = await Message.updateMany({ ...q, fromClient: false, readByClient: false }, { readByClient: true });
    if (r2.modifiedCount) emit(`client:${req.clientId}`, 'msg:read', { clientId: String(req.clientId), by: 'client' });
    res.json(items);
  })
);
r.post(
  '/messages',
  validate(z.object({ body: z.string().trim().min(1).max(5000), project: z.string().optional(), attachments: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    let project = null;
    if (req.body.project) project = await ownProject(req, req.body.project);
    const m = await Message.create({ client: req.clientId, project: project?._id, from: req.user._id, fromClient: true, body: req.body.body, attachments: req.body.attachments, readByClient: true });
    await m.populate([{ path: 'from', select: 'name role avatar title' }, { path: 'attachments', select: 'originalName size url' }, { path: 'project', select: 'name' }]);
    emit(`client:${req.clientId}`, 'msg:new', { clientId: String(req.clientId), message: m });
    emit('msg-staff', 'msg:thread', { clientId: String(req.clientId) });
    res.status(201).json(m);
    notifyTeam(project, { type: 'message', title: `New client message from ${req.user.name}`, body: esc(req.body.body.slice(0, 200)), link: `/admin/messages?client=${req.clientId}`, email: true }).catch(() => {});
  })
);

// ---------- Proposals ----------
r.get('/proposals', asyncHandler(async (req, res) => res.json(await Proposal.find({ client: req.clientId, status: { $ne: 'Draft' } }).sort('-createdAt'))));
r.get(
  '/proposals/:id',
  asyncHandler(async (req, res) => {
    const p = await Proposal.findOne({ _id: req.params.id, client: req.clientId, status: { $ne: 'Draft' } });
    if (!p) throw new AppError(404, 'Proposal not found');
    if (p.status === 'Sent') {
      p.status = 'Viewed';
      p.viewedAt = new Date();
      await p.save();
    }
    res.json(p);
  })
);
r.post(
  '/proposals/:id/respond',
  validate(z.object({ decision: z.enum(['Accepted', 'Declined']), note: z.string().max(2000).optional() })),
  asyncHandler(async (req, res) => {
    const p = await Proposal.findOne({ _id: req.params.id, client: req.clientId, status: { $in: ['Sent', 'Viewed'] } });
    if (!p) throw new AppError(404, 'Proposal not found or already answered');
    if (p.validUntil && p.validUntil < new Date()) {
      p.status = 'Expired';
      await p.save();
      throw new AppError(409, 'This proposal has expired. Please contact us for an updated version.');
    }
    p.status = req.body.decision;
    p.respondedAt = new Date();
    p.responseNote = req.body.note;
    await p.save();
    await notifyRoles(['admin', 'sales'], { type: 'proposal', title: `Proposal ${p.number} ${req.body.decision.toLowerCase()}`, body: esc(`${req.user.name}: ${req.body.note || ""}`), link: '/admin/proposals', email: true });
    await audit(req, `proposal_${req.body.decision.toLowerCase()}`, 'Proposal', p._id);
    res.json(p);
  })
);

// ---------- Invoices ----------
r.get('/invoices', asyncHandler(async (req, res) => res.json(await Invoice.find({ client: req.clientId, status: { $ne: 'Draft' } }).sort('-issueDate').populate('project', 'name'))));
r.get(
  '/invoices/:id',
  asyncHandler(async (req, res) => {
    const inv = await Invoice.findOne({ _id: req.params.id, client: req.clientId, status: { $ne: 'Draft' } }).populate('project', 'name').populate('client');
    if (!inv) throw new AppError(404, 'Invoice not found');
    res.json(inv);
  })
);

// ---------- Meetings ----------
r.get(
  '/meetings',
  asyncHandler(async (req, res) => {
    const all = await Appointment.find({ client: req.clientId }).sort('-startsAt').populate('host', 'name');
    const now = new Date();
    res.json({ upcoming: all.filter((a) => a.startsAt >= now && a.status !== 'Cancelled').reverse(), previous: all.filter((a) => a.startsAt < now || a.status === 'Cancelled') });
  })
);
r.post(
  '/meetings',
  validate(z.object({ title: z.string().min(2).max(120), startsAt: z.string(), agenda: z.string().max(2000).optional(), project: z.string().optional(), durationMin: z.number().min(15).max(180).optional() })),
  asyncHandler(async (req, res) => {
    const when = new Date(req.body.startsAt);
    if (Number.isNaN(+when) || when < new Date(Date.now() + 2 * 3600e3)) throw new AppError(422, 'Please pick a time at least 2 hours from now');
    if (req.body.project) await ownProject(req, req.body.project);
    const a = await Appointment.create({ ...req.body, startsAt: when, client: req.clientId, name: req.user.name, email: req.user.email, status: 'Requested' });
    await notifyRoles(['admin', 'pm'], { type: 'meeting', title: `Meeting requested by ${req.user.name}`, body: `${req.body.title} — ${when.toUTCString()}`, link: '/admin/appointments', email: true });
    res.status(201).json(a);
  })
);
// Cancellation / reschedule policy: allowed until 24h before the meeting.
r.patch(
  '/meetings/:id',
  validate(z.object({ action: z.enum(['cancel', 'reschedule']), startsAt: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const a = await Appointment.findOne({ _id: req.params.id, client: req.clientId });
    if (!a) throw new AppError(404, 'Meeting not found');
    if (a.startsAt - Date.now() < 24 * 3600e3) throw new AppError(409, 'Meetings can only be changed up to 24 hours in advance. Please message your project manager.');
    if (req.body.action === 'cancel') a.status = 'Cancelled';
    else {
      const when = new Date(req.body.startsAt);
      if (Number.isNaN(+when) || when < new Date()) throw new AppError(422, 'Invalid new time');
      a.startsAt = when;
      a.status = 'Rescheduled';
    }
    await a.save();
    await notifyRoles(['admin', 'pm'], { type: 'meeting', title: `Meeting ${a.status.toLowerCase()} by client`, body: `${a.title} — ${a.startsAt.toUTCString()}`, link: '/admin/appointments' });
    res.json(a);
  })
);

// ---------- Support tickets ----------
r.get('/tickets', asyncHandler(async (req, res) => res.json(await Ticket.find({ client: req.clientId }).sort('-updatedAt').populate('project', 'name').populate('replies.by', 'name role avatar title'))));
r.post(
  '/tickets',
  validate(
    z.object({
      subject: z.string().trim().min(3).max(200),
      description: z.string().trim().min(5).max(5000),
      category: z.enum(['Technical', 'Billing', 'Change Request', 'Bug', 'General']).default('General'),
      priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
      project: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.project) await ownProject(req, req.body.project);
    const t = await Ticket.create({ ...req.body, client: req.clientId, createdBy: req.user._id });
    await notifyRoles(['admin', 'pm'], { type: 'ticket', title: `New ${t.priority} ticket: ${t.subject}`, body: `${req.user.name} opened ${t.ticketNo}`, link: '/admin/tickets', email: true });
    res.status(201).json(t);
  })
);
r.post(
  '/tickets/:id/replies',
  validate(z.object({ body: z.string().trim().min(1).max(5000), attachments: z.array(z.string()).optional() })),
  asyncHandler(async (req, res) => {
    const t = await Ticket.findOne({ _id: req.params.id, client: req.clientId });
    if (!t) throw new AppError(404, 'Ticket not found');
    if (t.status === 'Closed') throw new AppError(409, 'This ticket is closed. Please open a new one.');
    t.replies.push({ body: req.body.body, by: req.user._id, fromClient: true, attachments: req.body.attachments });
    if (['Waiting', 'Resolved'].includes(t.status)) t.status = 'Open';
    await t.save();
    if (t.assignee) await notifyUser(t.assignee, { type: 'ticket', title: `Client replied on ${t.ticketNo}`, link: '/admin/tickets' });
    else await notifyRoles(['admin', 'pm'], { type: 'ticket', title: `Client replied on ${t.ticketNo}`, link: '/admin/tickets' });
    res.json(await t.populate('replies.by', 'name role avatar title'));
  })
);


// ---------- Orders ----------
r.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const me = String(req.user._id);
    const list = await Order.find({ client: req.clientId }).sort('-updatedAt').select('-staffNotes').populate('invoice', 'number total amountPaid status currency').lean();
    res.json(list.map((o) => ({ ...o, unread: !(o.readBy || []).some((u) => String(u) === me), readBy: undefined })));
  })
);
r.get('/orders-unread', asyncHandler(async (req, res) => res.json({ unread: await Order.countDocuments({ client: req.clientId, readBy: { $ne: req.user._id } }) })));
r.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const o = await Order.findOne({ _id: req.params.id, client: req.clientId }).select('-staffNotes').populate('invoice').populate('project', 'name status progress').populate('timeline.by', 'name role avatar title');
    if (!o) throw new AppError(404, 'Order not found');
    await markOrderRead(o, req.user._id);
    // The client sees their own review only once it is published — always in the words they wrote
    const rv = o.reviewedAt ? await Review.findOne({ order: o._id, status: 'published' }).lean() : null;
    const myReview = rv ? { ratings: rv.original?.ratings?.communication ? rv.original.ratings : rv.ratings, body: rv.original?.body || rv.body, createdAt: rv.createdAt } : null;
    const cr = await ClientRating.findOne({ order: o._id }).select('ratings overall body createdAt').lean();
    const zeviroReview = cr ? { ratings: cr.ratings, overall: cr.overall, body: cr.body, createdAt: cr.createdAt } : null;
    res.json({ ...o.toObject(), myReview, zeviroReview });
  })
);
r.post(
  '/orders',
  validate(
    z.object({
      serviceSlug: z.string().min(1).max(200),
      packageName: z.string().min(1).max(40),
      requirements: z.string().trim().min(20, 'Please describe your requirements (at least 20 characters)').max(8000),
      referenceLinks: z.array(z.string().trim().max(500)).max(10).optional().default([]),
      preferredDeadline: z.string().optional().refine((v) => !v || !Number.isNaN(Date.parse(v)), 'Invalid date'),
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await placeOrder({ user: req.user, clientId: req.clientId, ...req.body });
    await audit(req, 'order_place', 'Order', order._id);
    res.status(201).json(order);
  })
);
async function ownOrder(req) {
  const o = await Order.findOne({ _id: req.params.id, client: req.clientId });
  if (!o) throw new AppError(404, 'Order not found');
  return o;
}
r.post(
  '/orders/:id/pay',
  asyncHandler(async (req, res) => {
    const o = await ownOrder(req);
    if (o.status !== 'Pending Payment' || !o.invoice) throw new AppError(409, 'This order has nothing to pay right now');
    const invoice = await Invoice.findById(o.invoice);
    const settings = await Setting.findOne({ key: 'site' }).lean();
    const site = (process.env.SITE_URL || '').replace(/\/$/, '');
    const result = await createCheckout({ order: o, invoice, settings, successUrl: `${site}/portal/orders/${o._id}?paid=1`, cancelUrl: `${site}/portal/orders/${o._id}` });
    res.json({ ...result, invoice: { _id: invoice._id, number: invoice.number, total: invoice.total, currency: invoice.currency } });
  })
);
r.post(
  '/orders/:id/cancel',
  validate(z.object({ reason: z.string().trim().max(1000).optional().default('') })),
  asyncHandler(async (req, res) => {
    const o = await ownOrder(req);
    if (!['Awaiting Quote', 'Pending Payment'].includes(o.status)) throw new AppError(409, 'Paid orders can only be cancelled by our team — please message us');
    o.status = 'Cancelled';
    o.cancelReason = req.body.reason;
    pushTimeline(o, 'Cancelled', req.body.reason ? `Cancelled by client: ${req.body.reason}` : 'Cancelled by client', req.user._id);
    await o.save();
    if (o.invoice) await Invoice.findByIdAndUpdate(o.invoice, { status: 'Cancelled' });
    await notifyRoles(['admin', 'sales', 'pm'], { type: 'order', title: `Order ${o.number} cancelled by client`, body: esc(req.body.reason || ''), link: `/admin/orders/${o._id}` });
    res.json(o);
  })
);
r.post(
  '/orders/:id/accept',
  asyncHandler(async (req, res) => {
    const o = await ownOrder(req);
    if (o.status !== 'Delivered') throw new AppError(409, 'Only delivered orders can be accepted');
    o.status = 'Completed';
    o.completedAt = new Date();
    pushTimeline(o, 'Completed', 'Delivery accepted by client', req.user._id);
    await o.save();
    await notifyRoles(['admin', 'pm'], { type: 'order', title: `Order ${o.number} completed 🎉`, body: 'The client accepted the delivery.', link: `/admin/orders/${o._id}` });
    res.json(o);
  })
);
// One review per completed order. After submitting, the client can't edit, delete or review again.
// The client is never told whether the team published or rejected it.
r.post(
  '/orders/:id/review',
  validate(
    z.object({
      communication: z.number().int().min(1).max(5),
      satisfaction: z.number().int().min(1).max(5),
      value: z.number().int().min(1).max(5),
      body: z.string().trim().min(10, 'Please write a few words (at least 10 characters)').max(2000),
    })
  ),
  asyncHandler(async (req, res) => {
    const o = await ownOrder(req);
    if (o.status !== 'Completed') throw new AppError(409, 'You can leave a review once the order is completed');
    if (o.reviewedAt) throw new AppError(409, 'You have already reviewed this order');
    const client = await Client.findById(req.clientId).select('country');
    // All three ratings are 5 stars → published straight away (no approval needed)
    const perfect = [req.body.communication, req.body.satisfaction, req.body.value].every((n) => n === 5);
    const rv = await Review.create({
      ...(perfect ? { status: 'published', publishedAt: new Date(), autoPublished: true } : {}),
      order: o._id,
      client: req.clientId,
      user: req.user._id,
      service: o.service,
      serviceSlug: o.serviceSlug,
      serviceTitle: o.serviceTitle,
      packageName: o.packageName,
      ratings: { communication: req.body.communication, satisfaction: req.body.satisfaction, value: req.body.value },
      body: req.body.body,
      reviewerName: req.user.name.trim(),
      country: client?.country,
      original: { ratings: { communication: req.body.communication, satisfaction: req.body.satisfaction, value: req.body.value }, body: req.body.body },
    });
    o.reviewedAt = new Date();
    await o.save();
    await audit(req, 'review_submit', 'Review', rv._id);
    await notifyRoles(['admin', 'sales', 'pm'], perfect
      ? { type: 'review', title: 'New 5★ review published automatically', body: `${esc(req.user.name)} reviewed ${esc(o.serviceTitle)}.`, link: '/admin/reviews' }
      : { type: 'review', title: `New ${rv.overall}★ review waiting for approval`, body: `${esc(req.user.name)} reviewed ${esc(o.serviceTitle)}.`, link: '/admin/reviews' });
    emit('review-staff', 'review:new', { id: rv._id });
    if (perfect) emitAll('site:update', { type: 'reviews' });
    res.status(201).json({ ok: true, reviewedAt: o.reviewedAt });
  })
);
r.post(
  '/orders/:id/revision',
  validate(z.object({ note: z.string().trim().min(5, 'Tell us what to change').max(4000) })),
  asyncHandler(async (req, res) => {
    const o = await ownOrder(req);
    if (o.status !== 'Delivered') throw new AppError(409, 'You can request a revision after delivery');
    o.status = 'Revision Requested';
    pushTimeline(o, 'Revision Requested', req.body.note, req.user._id);
    await o.save();
    await notifyRoles(['admin', 'pm'], { type: 'order', title: `Revision requested on ${o.number}`, body: esc(req.body.note), link: `/admin/orders/${o._id}` });
    res.json(o);
  })
);

// ---------- Profile & company ----------
r.get('/profile', asyncHandler(async (req, res) => res.json({ user: req.user.toSafeJSON(), client: await Client.findById(req.clientId).populate('accountManager', 'name title avatar role') })));
r.put(
  '/company',
  validate(z.object({ name: z.string().min(2).max(120).optional(), website: z.string().max(200).optional(), address: z.string().max(300).optional(), country: z.string().max(80).optional(), logo: z.string().max(500).optional() })),
  asyncHandler(async (req, res) => {
    const c = await Client.findByIdAndUpdate(req.clientId, req.body, { new: true });
    await audit(req, 'client_update_company', 'Client', c._id);
    res.json(c);
  })
);

// ---------- Notifications ----------
r.get('/notifications', asyncHandler(async (req, res) => res.json(await Notification.find({ user: req.user._id }).sort('-createdAt').limit(50))));
// mark one notification read, or all notifications that point to the page the user just opened
r.patch('/notifications/:id', asyncHandler(async (req, res) => { await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true }); emit(`user:${req.user._id}`, 'notification:read', {}); res.json({ ok: true }); }));
r.post('/notifications/read-link', asyncHandler(async (req, res) => {
  const link = String(req.body?.link || '').slice(0, 300);
  const r2 = link ? await Notification.updateMany({ user: req.user._id, read: false, link }, { read: true }) : { modifiedCount: 0 };
  if (r2.modifiedCount) emit(`user:${req.user._id}`, 'notification:read', {});
  res.json({ ok: true, updated: r2.modifiedCount });
}));
r.post('/notifications/read-all', asyncHandler(async (req, res) => { await Notification.updateMany({ user: req.user._id }, { read: true }); emit(`user:${req.user._id}`, 'notification:read', {}); res.json({ ok: true }); }));

export default r;
