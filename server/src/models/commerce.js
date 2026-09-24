import mongoose from 'mongoose';

const { Schema } = mongoose;

const lineItemSchema = new Schema({
  description: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
});

const proposalSchema = new Schema(
  {
    number: String,
    title: { type: String, required: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    summary: String,
    scope: String,
    deliverables: [String],
    timeline: String,
    milestones: [{ title: String, amount: Number, dueInDays: Number }],
    items: [lineItemSchema],
    currency: { type: String, default: 'USD' },
    total: Number,
    validUntil: Date,
    status: { type: String, enum: ['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired'], default: 'Draft' },
    sentAt: Date,
    viewedAt: Date,
    respondedAt: Date,
    responseNote: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
proposalSchema.pre('save', function calc(next) {
  if (!this.number) this.number = `PRP-${Date.now().toString(36).toUpperCase()}`;
  if (this.items?.length) this.total = this.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  next();
});
export const Proposal = mongoose.model('Proposal', proposalSchema);

const paymentSchema = new Schema(
  {
    amount: Number,
    method: { type: String, default: 'Bank Transfer' },
    reference: String,
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const invoiceSchema = new Schema(
  {
    number: String,
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    items: [lineItemSchema],
    currency: { type: String, default: 'USD' },
    subtotal: Number,
    taxRate: { type: Number, default: 0 },
    total: Number,
    amountPaid: { type: Number, default: 0 },
    issueDate: { type: Date, default: Date.now },
    dueDate: Date,
    status: { type: String, enum: ['Draft', 'Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'], default: 'Pending' },
    paymentLink: String, // filled when a payment gateway is integrated (Phase 2)
    payments: [paymentSchema],
    notes: String,
  },
  { timestamps: true }
);
invoiceSchema.pre('save', function calc(next) {
  if (!this.number) this.number = `INV-${new Date().getFullYear()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  this.subtotal = (this.items || []).reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  this.total = Math.round(this.subtotal * (1 + (this.taxRate || 0) / 100) * 100) / 100;
  this.amountPaid = (this.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
  if (this.status !== 'Cancelled' && this.status !== 'Draft') {
    if (this.amountPaid >= this.total && this.total > 0) this.status = 'Paid';
    else if (this.amountPaid > 0) this.status = 'Partially Paid';
    else if (this.dueDate && this.dueDate < new Date()) this.status = 'Overdue';
    else this.status = 'Pending';
  }
  next();
});
// When an order's invoice becomes fully paid, the order moves to "In Progress" automatically.
invoiceSchema.post('save', async function syncOrder(doc) {
  try {
    if (doc.status !== 'Paid') return;
    const order = await mongoose.model('Order').findOne({ invoice: doc._id, status: 'Pending Payment' });
    if (!order) return;
    order.paymentStatus = 'Paid';
    order.status = 'In Progress';
    order.paidAt = new Date();
    if (order.deliveryDays) order.dueDate = new Date(Date.now() + order.deliveryDays * 864e5);
    order.timeline.push({ status: 'In Progress', note: 'Payment received — work has started' });
    order.readBy = [];
    await order.save();
  } catch (e) {
    console.error('[order-sync]', e.message);
  }
});
export const Invoice = mongoose.model('Invoice', invoiceSchema);

// ---------- Orders (placed by clients from service packages) ----------
export const ORDER_STATUSES = ['Awaiting Quote', 'Pending Payment', 'In Progress', 'Delivered', 'Revision Requested', 'Completed', 'Cancelled'];
const orderSchema = new Schema(
  {
    number: { type: String, unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    placedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    serviceTitle: String,
    serviceSlug: String,
    packageName: String,
    packageTitle: String,
    features: [String],
    price: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    deliveryDays: Number,
    revisions: String,
    requirements: String,
    referenceLinks: [String],
    preferredDeadline: Date,
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending Payment', index: true },
    paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    assignee: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: Date,
    dueDate: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    deliveryNote: String,
    cancelReason: String,
    staffNotes: String, // internal only — never sent to the client
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }], // users who have seen the latest update (drives the unread badge)
    reviewedAt: Date, // set once when the client submits a review (one review per order, no edits)
    timeline: [
      {
        status: String,
        note: String,
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
// Remember when an order was completed / cancelled (drives the revenue dashboard)
orderSchema.pre('save', function stamps(next) {
  this.$locals.live = this.isNew || this.isModified('status') || this.isModified('price');
  this.$locals.statusChanged = this.isModified('status') || this.isModified('assignee') || this.isModified('dueDate');
  if (this.isModified('status')) {
    if (this.status === 'Completed' && !this.completedAt) this.completedAt = new Date();
    if (this.status === 'Cancelled') this.cancelledAt = new Date();
  }
  next();
});
// Live revenue dashboard: tell staff dashboards to refresh whenever an order's status or price changes
orderSchema.post('save', function live(doc) {
  // paid → project + tasks created; delivered / revision / completed / cancelled → project follows
  if (doc.$locals?.statusChanged) import('../services/orderProject.js').then((m) => m.syncOrderProject(doc)).catch((e) => console.error('[projects]', e.message));
  if (doc.$locals?.live) import('../realtime.js').then((m) => m.emit('order-staff', 'order:stats', { id: doc._id })).catch(() => {});
});
orderSchema.pre('save', function num(next) {
  if (!this.number) this.number = `ZO-${new Date().getFullYear()}-${Date.now().toString(36).slice(-6).toUpperCase()}`;
  next();
});
export const Order = mongoose.model('Order', orderSchema);

// ---------- Client reviews (moderated: pending → published, or rejected = deleted) ----------
const star = { type: Number, min: 1, max: 5, required: true };
const reviewSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    service: { type: Schema.Types.ObjectId, ref: 'Service', index: true },
    serviceSlug: { type: String, index: true },
    serviceTitle: String,
    packageName: String,
    ratings: { communication: star, satisfaction: star, value: star },
    overall: Number, // average of the three, 1 decimal
    body: { type: String, maxlength: 2000 },
    reviewerName: String, // client's name — shown publicly
    country: String,
    // pending → published, or → trashed (rejected / removed). Trash is emptied automatically after 30 days.
    status: { type: String, enum: ['pending', 'published', 'trashed'], default: 'pending', index: true },
    previousStatus: String,
    trashedAt: Date,
    publishedAt: Date,
    autoPublished: { type: Boolean, default: false }, // 5★ on all three ratings → published without approval
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    // What the client originally wrote. The client only ever sees this version; the public sees the (possibly edited) one.
    original: { ratings: { communication: Number, satisfaction: Number, value: Number }, body: String },
    editedAt: Date,
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
reviewSchema.pre('save', function avg(next) {
  const r = this.ratings || {};
  this.overall = Math.round(((r.communication + r.satisfaction + r.value) / 3) * 10) / 10;
  next();
});
export const Review = mongoose.model('Review', reviewSchema);

// ---------- Zeviro's review of the client (one per completed order; the client sees it on that order) ----------
const clientRatingSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', unique: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', index: true },
    serviceTitle: String,
    packageName: String,
    ratings: { communication: star, requirements: star, again: star },
    overall: Number,
    body: { type: String, maxlength: 2000 },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    editedAt: Date,
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
clientRatingSchema.pre('save', function avg(next) {
  const r = this.ratings || {};
  this.overall = Math.round(((r.communication + r.requirements + r.again) / 3) * 10) / 10;
  next();
});
export const ClientRating = mongoose.model('ClientRating', clientRatingSchema);
