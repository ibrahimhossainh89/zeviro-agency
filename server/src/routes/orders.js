// Staff: order management
import { Router } from 'express';
import { z } from 'zod';
import { Order, Invoice, Review, ClientRating, ORDER_STATUSES } from '../models/index.js';
import { asyncHandler, AppError, paginate, esc } from '../utils/http.js';
import { validate, audit } from '../middleware/common.js';
import { notifyOrderClient, pushTimeline, quoteOrder, projectFromOrder, markOrderRead } from '../services/orders.js';
import { markInvoicePaid } from '../services/payments.js';
import { syncOrderProject } from '../services/orderProject.js';

const r = Router();
const load = async (id) => {
  const o = await Order.findById(id);
  if (!o) throw new AppError(404, 'Order not found');
  return o;
};
const full = (id) =>
  Order.findById(id).populate('client', 'name country').populate('placedBy', 'name email phone').populate('invoice').populate('project', 'name status progress').populate('assignee', 'name title avatar').populate('timeline.by', 'name role avatar');

r.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req);
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.client) q.client = req.query.client;
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ number: rx }, { serviceTitle: rx }, { packageName: rx }];
    }
    const [items, total, counts, unread] = await Promise.all([
      Order.find(q).sort('-updatedAt').skip(skip).limit(limit).populate('client', 'name').populate('placedBy', 'name email').populate('invoice', 'number status total amountPaid').lean(),
      Order.countDocuments(q),
      Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      Order.countDocuments({ readBy: { $ne: req.user._id } }),
    ]);
    const me = String(req.user._id);
    res.json({ items: items.map((o) => ({ ...o, unread: !(o.readBy || []).some((u) => String(u) === me) })), total, page, pages: Math.ceil(total / limit) || 1, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), unread });
  })
);
r.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const o = await full(req.params.id);
    if (!o) throw new AppError(404, 'Order not found');
    await markOrderRead(o, req.user._id);
    res.json(o);
  })
);

// ---------- Two-way reviews for one order ----------
// theirs = the client's review of Zeviro, mine = Zeviro's review of the client
r.get(
  '/:id/reviews',
  asyncHandler(async (req, res) => {
    const o = await load(req.params.id);
    const [theirs, mine] = await Promise.all([
      Review.findOne({ order: o._id }).select('ratings overall body status createdAt editedAt autoPublished original').lean(),
      ClientRating.findOne({ order: o._id }).populate('by', 'name').populate('editedBy', 'name').lean(),
    ]);
    res.json({ theirs, mine, canReview: o.status === 'Completed', canEdit: req.user.role === 'superadmin' });
  })
);
r.put(
  '/:id/client-rating',
  validate(
    z.object({
      communication: z.number().int().min(1).max(5),
      requirements: z.number().int().min(1).max(5),
      again: z.number().int().min(1).max(5),
      body: z.string().trim().min(10, 'Please write a few words (at least 10 characters)').max(2000),
    })
  ),
  asyncHandler(async (req, res) => {
    if (!['superadmin', 'admin'].includes(req.user.role)) throw new AppError(403, 'Only an administrator can review clients');
    const o = await load(req.params.id);
    if (o.status !== 'Completed') throw new AppError(409, 'You can review the client once the order is completed');
    const ratings = { communication: req.body.communication, requirements: req.body.requirements, again: req.body.again };
    let cr = await ClientRating.findOne({ order: o._id });
    if (cr) {
      if (req.user.role !== 'superadmin') throw new AppError(409, 'This client has already been reviewed for this order');
      cr.ratings = ratings;
      cr.body = req.body.body;
      cr.editedAt = new Date();
      cr.editedBy = req.user._id;
      await cr.save();
      await audit(req, 'client_rating_edit', 'ClientRating', cr._id);
      await notifyOrderClient(o, { title: `Zeviro updated its review of order ${o.number}`, body: `${cr.overall}★ — ${esc(cr.body.slice(0, 140))}`, email: false });
    } else {
      cr = await ClientRating.create({ order: o._id, client: o.client, serviceTitle: o.serviceTitle, packageName: o.packageName, ratings, body: req.body.body, by: req.user._id });
      await audit(req, 'client_rating_create', 'ClientRating', cr._id);
      await notifyOrderClient(o, { title: `Zeviro left you a ${cr.overall}★ review`, body: `For order ${o.number} (${esc(o.serviceTitle)}): ${esc(cr.body.slice(0, 140))}` });
    }
    res.json(cr);
  })
);

// Update status / internal notes / assignee
r.patch(
  '/:id',
  validate(
    z.object({
      status: z.enum(ORDER_STATUSES).optional(),
      note: z.string().trim().max(4000).optional(),
      deliveryNote: z.string().trim().max(8000).optional(),
      staffNotes: z.string().max(8000).optional(),
      assignee: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const o = await load(req.params.id);
    const { status, note, deliveryNote, staffNotes, assignee, dueDate } = req.body;
    if (staffNotes !== undefined) o.staffNotes = staffNotes;
    if (assignee !== undefined) o.assignee = assignee || undefined;
    if (dueDate !== undefined) o.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (status && status !== o.status) {
      o.status = status;
      if (status === 'Delivered') {
        o.deliveredAt = new Date();
        if (deliveryNote) o.deliveryNote = deliveryNote;
      }
      if (status === 'Completed') o.completedAt = new Date();
      if (status === 'Cancelled' && o.invoice) await Invoice.findByIdAndUpdate(o.invoice, { status: 'Cancelled' });
      pushTimeline(o, status, note || deliveryNote, req.user._id);
      await o.save();
      const msg = {
        'In Progress': 'Our team is working on your order.',
        Delivered: `Your order has been delivered.${deliveryNote ? `<br/><br/>${esc(deliveryNote)}` : ''}<br/>Please review it and accept or request a revision in your portal.`,
        Completed: 'Your order is complete. Thank you for working with Zeviro!',
        Cancelled: `Your order was cancelled.${note ? ` ${esc(note)}` : ''}`,
        'Revision Requested': 'We are working on your revision.',
      }[status];
      if (msg) await notifyOrderClient(o, { title: `Order ${o.number}: ${status}`, body: msg });
    } else {
      if (note) pushTimeline(o, o.status, note, req.user._id);
      await o.save();
    }
    await audit(req, 'order_update', 'Order', o._id, { status });
    res.json(await full(o._id));
  })
);

r.post(
  '/:id/quote',
  validate(z.object({ price: z.number().positive(), deliveryDays: z.number().int().positive().optional(), note: z.string().max(2000).optional() })),
  asyncHandler(async (req, res) => {
    const o = await load(req.params.id);
    await quoteOrder(o, req.body, req.user._id);
    await audit(req, 'order_quote', 'Order', o._id, req.body);
    res.json(await full(o._id));
  })
);

// Record an offline payment (bank transfer, Payoneer, Wise…) → order starts automatically
r.post(
  '/:id/mark-paid',
  validate(z.object({ method: z.string().max(60).optional(), reference: z.string().max(120).optional() })),
  asyncHandler(async (req, res) => {
    const o = await load(req.params.id);
    if (!o.invoice) throw new AppError(409, 'This order has no invoice yet — send a quote first');
    await markInvoicePaid(o.invoice, { method: req.body.method || 'Bank Transfer', reference: req.body.reference });
    const fresh = await load(o._id);
    await notifyOrderClient(fresh, { title: `Payment received for ${fresh.number}`, body: 'Thank you! Your order is now in progress.' });
    await audit(req, 'order_paid', 'Order', o._id, req.body);
    res.json(await full(o._id));
  })
);

r.post(
  '/:id/project',
  asyncHandler(async (req, res) => {
    const o = await load(req.params.id);
    const p = (await syncOrderProject(o)) || (await projectFromOrder(o, o.assignee || req.user._id));
    await audit(req, 'order_project', 'Order', o._id, { project: p._id });
    res.json(await full(o._id));
  })
);

export default r;
