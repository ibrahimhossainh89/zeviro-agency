import { Order, Invoice, Service, Setting, User, Project } from '../models/index.js';
import { AppError, esc } from '../utils/http.js';
import { notifyRoles, notifyUser } from './notify.js';
import { emit } from '../realtime.js';
import { pricesVisible } from './pricing.js';

const money = (n, cur = 'USD') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export async function notifyOrderClient(order, { title, body, email = true }) {
  const users = await User.find({ client: order.client, role: 'client', active: true }).select('_id');
  await Promise.all(users.map((u) => notifyUser(u._id, { type: 'order', title, body, link: `/portal/orders/${order._id}`, email })));
  emit(`client:${order.client}`, 'order:update', { orderId: order._id, status: order.status });
  emit('order-staff', 'order:update', { orderId: order._id, status: order.status });
}

export function pushTimeline(order, status, note, by) {
  order.timeline.push({ status, note, by });
  order.readBy = by ? [by] : []; // new activity → unread for everyone except the person who did it
}

/** Mark an order as read by this user and tell their open tabs to refresh the badges. */
export async function markOrderRead(order, userId) {
  if ((order.readBy || []).some((u) => String(u) === String(userId))) return;
  await Order.updateOne({ _id: order._id }, { $addToSet: { readBy: userId } });
  emit(`user:${userId}`, 'order:read', { orderId: order._id });
}

async function createInvoiceFor(order) {
  const s = (await Setting.findOne({ key: 'site' }).lean()) || {};
  const due = Number(s.payments?.invoiceDueDays) || 3;
  const inv = await Invoice.create({
    client: order.client,
    items: [{ description: `${order.serviceTitle} — ${order.packageTitle || order.packageName} (Order ${order.number})`, quantity: 1, unitPrice: order.price }],
    currency: order.currency,
    dueDate: new Date(Date.now() + due * 864e5),
    notes: `Order ${order.number}`,
  });
  order.invoice = inv._id;
  return inv;
}

/** Client places an order. Price always comes from the database, never from the browser. */
export async function placeOrder({ user, clientId, serviceSlug, packageName, requirements, referenceLinks = [], preferredDeadline }) {
  const service = await Service.findOne({ slug: serviceSlug, published: true });
  if (!service || service.orderable === false) throw new AppError(404, 'This service is not available for online ordering');
  const pkg = (service.packages || []).find((p) => p.name === packageName);
  if (!pkg) throw new AppError(422, 'Please choose a package');
  const quote = !pkg.price || !(await pricesVisible()); // "Request price" mode → the team sends a price first
  const order = new Order({
    client: clientId,
    placedBy: user._id,
    service: service._id,
    serviceTitle: service.title,
    serviceSlug: service.slug,
    packageName: pkg.name,
    packageTitle: pkg.title || pkg.name,
    features: pkg.features,
    price: quote ? 0 : pkg.price,
    deliveryDays: pkg.deliveryDays,
    revisions: pkg.revisions,
    requirements,
    referenceLinks: referenceLinks.filter(Boolean),
    preferredDeadline: preferredDeadline || undefined,
    status: quote ? 'Awaiting Quote' : 'Pending Payment',
  });
  pushTimeline(order, order.status, quote ? 'Order request received — we will send you a price and timeline' : 'Order placed — waiting for payment', user._id);
  await order.save(); // generates the order number
  if (!quote) {
    await createInvoiceFor(order);
    await order.save();
  }
  await notifyRoles(['admin', 'sales', 'pm'], {
    type: 'order_new',
    title: `New order ${order.number}: ${service.title} (${pkg.name})`,
    body: `${esc(user.name)} ordered ${esc(service.title)} — ${esc(pkg.title || pkg.name)}${quote ? ' (custom quote)' : ` · ${money(order.price)}`}.`,
    link: `/admin/orders/${order._id}`,
    email: true,
  });
  emit('order-staff', 'order:new', { orderId: order._id });
  await notifyOrderClient(order, {
    title: `Order ${order.number} received`,
    body: quote
      ? `Thanks! We received your request for <b>${esc(service.title)}</b>. Our team will review your requirements and send a quote shortly.`
      : `Thanks! Your order for <b>${esc(service.title)} — ${esc(pkg.title || pkg.name)}</b> (${money(order.price)}) is placed. Complete the payment from your portal to start the work.`,
  });
  return order;
}

/** Staff sends a price for a custom-quote order → creates the invoice. */
export async function quoteOrder(order, { price, deliveryDays, note }, by) {
  if (order.status !== 'Awaiting Quote') throw new AppError(409, 'This order already has a price');
  order.price = price;
  if (deliveryDays) order.deliveryDays = deliveryDays;
  order.status = 'Pending Payment';
  await createInvoiceFor(order);
  pushTimeline(order, 'Pending Payment', note || `Quote sent: ${money(price, order.currency)}`, by);
  await order.save();
  await notifyOrderClient(order, { title: `Quote ready for order ${order.number}`, body: `Price: <b>${money(price, order.currency)}</b>${deliveryDays ? ` · Delivery: ${deliveryDays} days` : ''}.${note ? `<br/>${esc(note)}` : ''}<br/>Pay from your portal to start the work.` });
  return order;
}

/** Create a delivery project (visible in the client portal) from an order. */
export async function projectFromOrder(order, managerId) {
  if (order.project) return Project.findById(order.project);
  const p = await Project.create({
    name: `${order.serviceTitle} — ${order.number}`,
    description: order.requirements,
    client: order.client,
    service: order.serviceTitle,
    status: 'In Progress',
    startDate: new Date(),
    deadline: order.dueDate,
    manager: managerId,
    milestones: [
      { title: 'Requirements confirmed', status: 'Completed', completedAt: new Date() },
      { title: 'Work in progress', status: 'In Progress', dueDate: order.dueDate },
      { title: 'Delivery & review', status: 'Pending', dueDate: order.dueDate },
    ],
  });
  order.project = p._id;
  await order.save();
  return p;
}
