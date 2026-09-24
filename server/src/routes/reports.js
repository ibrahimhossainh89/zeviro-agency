import { Router } from 'express';
import { Lead, Client, Project, Task, ChatConversation, Appointment, Invoice, Proposal, Ticket, Event, Order, Review } from '../models/index.js';
import { asyncHandler, AppError } from '../utils/http.js';
import { projectScope } from '../middleware/auth.js';
import { can } from '../config/permissions.js';

const r = Router();
const daysAgo = (n) => new Date(Date.now() - n * 864e5);

// Grouping done in JS so it works on MongoDB, Atlas, FerretDB and Cosmos alike.
function countBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) m.set(keyFn(r), (m.get(keyFn(r)) || 0) + 1);
  return [...m.entries()].map(([_id, n]) => ({ _id, n })).sort((a, b) => b.n - a.n);
}
function countByDay(rows) {
  return countBy(rows, (r) => new Date(r.createdAt).toISOString().slice(0, 10)).sort((a, b) => a._id.localeCompare(b._id));
}

// ---------- Order revenue dashboard ----------
// Completed = revenue earned (by completion date), Active = In Progress + Delivered, Revision = Revision Requested,
// Cancelled = value lost (by cancellation date). Active / Revision count orders started (paid) in the period.
const RANGES = ['7d', '15d', '30d', '60d', '90d', '6m', 'ytd', 'year', 'all', 'custom'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const round2 = (n) => Math.round(n * 100) / 100;
const parseDay = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
/** Bucket size that keeps the chart readable for a window of this length. */
const autoBucket = (days) => (days <= 62 ? 'day' : days <= 190 ? 'week' : days <= 1100 ? 'month' : 'year');

/** Works out the window { from, to, bucket } and the previous window of the same kind (for the % change). */
function rangeWindow(q, now = new Date()) {
  const today = startOfDay(now);
  const lastN = (n) => {
    const from = addDays(today, -(n - 1));
    return { from, to: now, bucket: autoBucket(n), prev: { from: addDays(from, -n), to: from } };
  };
  switch (q.range) {
    case '7d': return lastN(7);
    case '15d': return lastN(15);
    case '60d': return lastN(60);
    case '90d': return lastN(90);
    case '6m': {
      const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return { from, to: now, bucket: 'month', prev: { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: from } };
    }
    case 'ytd': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: now, bucket: 'month', prev: { from: new Date(now.getFullYear() - 1, 0, 1), to: endOfDay(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())) } };
    }
    case 'year': {
      const y = Math.min(Math.max(parseInt(q.year, 10) || now.getFullYear(), 2000), now.getFullYear());
      const from = new Date(y, 0, 1);
      return { year: y, from, to: y === now.getFullYear() ? now : endOfDay(new Date(y, 11, 31)), bucket: 'month', prev: { from: new Date(y - 1, 0, 1), to: from } };
    }
    case 'all': return { from: null, to: now, bucket: 'year', prev: null };
    case 'custom': {
      let from = parseDay(q.from);
      let to = parseDay(q.to);
      if (!from || !to) throw new AppError(400, 'Choose a start and an end date');
      if (from > to) [from, to] = [to, from];
      if (to > today) to = today;
      const days = Math.round((to - from) / 864e5) + 1;
      return { from, to: endOfDay(to), bucket: autoBucket(days), prev: { from: addDays(from, -days), to: from } };
    }
    default: return lastN(30);
  }
}
function eventDate(o) {
  if (o.status === 'Completed') return o.completedAt || o.updatedAt;
  if (o.status === 'Cancelled') return o.cancelledAt || [...(o.timeline || [])].reverse().find((t) => t.status === 'Cancelled')?.at || o.updatedAt;
  return o.paidAt || o.createdAt;
}
function makeBuckets(bucket, from, to, firstYear) {
  const out = [];
  const multiYear = from && from.getFullYear() !== to.getFullYear();
  if (bucket === 'day' || bucket === 'week') {
    const step = bucket === 'day' ? 1 : 7;
    for (let d = new Date(from); d <= to; d = addDays(d, step)) out.push({ start: d, label: `${MONTHS[d.getMonth()]} ${d.getDate()}${multiYear && d.getMonth() === 0 && d.getDate() <= step ? ` '${String(d.getFullYear()).slice(2)}` : ''}` });
  } else if (bucket === 'month') {
    for (let d = new Date(from.getFullYear(), from.getMonth(), 1); d <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push({ start: d < from ? from : d, label: multiYear ? `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` : MONTHS[d.getMonth()] });
  } else {
    const first = from ? from.getFullYear() : Math.min(firstYear, to.getFullYear() - 1);
    for (let y = first; y <= to.getFullYear(); y++) out.push({ start: from && y === first ? from : new Date(y, 0, 1), label: String(y) });
  }
  return out;
}
function bucketIndex(buckets, d) {
  let i = -1;
  for (let k = 0; k < buckets.length && buckets[k].start <= d; k++) i = k;
  return i;
}

r.get(
  '/revenue',
  asyncHandler(async (req, res) => {
    if (!can(req.user.role, 'orders') && !can(req.user.role, 'invoices')) throw new AppError(403, 'Not allowed');
    const range = RANGES.includes(req.query.range) ? req.query.range : '30d';
    const now = new Date();
    const win = rangeWindow({ ...req.query, range }, now);
    const { from, to, bucket, prev } = win;
    const orders = await Order.find({ status: { $in: ['In Progress', 'Delivered', 'Revision Requested', 'Completed', 'Cancelled'] } })
      .select('status price createdAt updatedAt paidAt completedAt cancelledAt timeline.status timeline.at')
      .lean();

    const rows = orders.map((o) => ({ status: o.status, price: Number(o.price) || 0, at: new Date(eventDate(o)) }));
    // every year that has orders, up to this year — a new year appears automatically on 1 January
    const firstYear = Math.min(rows.reduce((y, r) => Math.min(y, r.at.getFullYear()), now.getFullYear()), now.getFullYear());
    const years = [];
    for (let y = now.getFullYear(); y >= firstYear; y--) years.push(y);

    const buckets = makeBuckets(bucket, from, to, firstYear);
    const series = buckets.map((b) => ({ label: b.label, completed: 0, cancelled: 0, orders: 0 }));
    const group = { completed: ['Completed'], active: ['In Progress', 'Delivered'], revision: ['Revision Requested'], cancelled: ['Cancelled'] };
    const totals = Object.fromEntries(Object.keys(group).map((k) => [k, { count: 0, amount: 0 }]));

    for (const r of rows) {
      if ((from && r.at < from) || r.at > to) continue;
      const g = Object.keys(group).find((k) => group[k].includes(r.status));
      totals[g].count += 1;
      totals[g].amount += r.price;
      const i = bucketIndex(buckets, r.at);
      if (i < 0) continue;
      if (g === 'completed') { series[i].completed += r.price; series[i].orders += 1; }
      if (g === 'cancelled') series[i].cancelled += r.price;
    }
    // compare completed revenue with the previous period
    const prevAmount = prev ? rows.filter((r) => r.status === 'Completed' && r.at >= prev.from && r.at < prev.to).reduce((s, r) => s + r.price, 0) : null;
    for (const k of Object.keys(totals)) totals[k].amount = round2(totals[k].amount);
    totals.completed.prevAmount = prevAmount;
    totals.completed.change = prevAmount ? Math.round(((totals.completed.amount - prevAmount) / prevAmount) * 1000) / 10 : null;
    res.json({
      range, year: win.year, bucket, currency: 'USD', years,
      from: from ? dayKey(from) : null, to: dayKey(to),
      totals,
      series: series.map((x) => ({ ...x, completed: round2(x.completed), cancelled: round2(x.cancelled) })),
    });
  })
);

// Admin dashboard KPIs (Spec §9 Dashboard)
r.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const since = daysAgo(30);
    const pScope = projectScope(req.user);
    const [
      newLeads, qualifiedLeads, totalLeads, openChats, escalatedChats, upcomingAppointments,
      activeClients, activeProjects, overdueInvoices, openTickets, myTasks, recentLeads, upcoming, followUps, leadsByDay,
    ] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: since } }),
      Lead.countDocuments({ status: { $in: ['Qualified', 'Meeting Booked', 'Proposal Sent'] } }),
      Lead.countDocuments(),
      ChatConversation.countDocuments({ status: { $ne: 'closed' }, lastMessageAt: { $gte: daysAgo(1) } }),
      ChatConversation.countDocuments({ status: 'escalated', unreadByAgent: { $gt: 0 } }),
      Appointment.countDocuments({ startsAt: { $gte: new Date() }, status: { $in: ['Requested', 'Confirmed'] } }),
      Client.countDocuments({ status: 'active' }),
      Project.countDocuments({ ...pScope, status: { $in: ['In Progress', 'Review', 'Revision', 'Not Started'] } }),
      Invoice.countDocuments({ status: 'Overdue' }),
      Ticket.countDocuments({ status: { $in: ['Open', 'In Progress', 'Waiting'] } }),
      Task.countDocuments({ assignee: req.user._id, status: { $ne: 'Done' } }),
      Lead.find().sort('-createdAt').limit(6).select('fullName company service status source createdAt leadId'),
      Appointment.find({ startsAt: { $gte: new Date() }, status: { $in: ['Requested', 'Confirmed'] } }).sort('startsAt').limit(5),
      Lead.find({ followUpDate: { $lte: daysAgo(-1) }, status: { $nin: ['Won', 'Lost'] } }).sort('followUpDate').limit(5).select('fullName followUpDate leadId'),
      Lead.find({ createdAt: { $gte: since } }).select('createdAt').lean().then(countByDay),
    ]);
    const leadAccess = can(req.user.role, 'leads');
    res.json({
      kpis: { newLeads, qualifiedLeads, totalLeads, openChats, escalatedChats, upcomingAppointments, activeClients, activeProjects, overdueInvoices, openTickets, myTasks },
      recentLeads: leadAccess ? recentLeads : [],
      upcoming: can(req.user.role, 'appointments') ? upcoming : [],
      followUps: leadAccess ? followUps : [],
      leadsByDay,
    });
  })
);

// Reports & analytics (Spec §9 Reports + §19 Analytics)
r.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 90, 1), 365);
    const since = daysAgo(days);
    const prevSince = daysAgo(days * 2);
    const group = (field, match = {}) =>
      Lead.aggregate([{ $match: { createdAt: { $gte: since }, ...match } }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $sort: { n: -1 } }]);
    const [bySource, byStatus, byService, byIndustry, byCountry, total, won, pageviews, formSubmits, chatOpens, chatMessages, trafficBySource, topPages, projectsByStatus, revenue, proposals, appts] =
      await Promise.all([
        group('source'),
        group('status'),
        group('service'),
        group('industry'),
        group('country'),
        Lead.countDocuments({ createdAt: { $gte: since } }),
        Lead.countDocuments({ createdAt: { $gte: since }, status: 'Won' }),
        Event.countDocuments({ type: 'pageview', createdAt: { $gte: since } }),
        Event.countDocuments({ type: 'form_submit', createdAt: { $gte: since } }),
        Event.countDocuments({ type: 'chat_open', createdAt: { $gte: since } }),
        Event.countDocuments({ type: 'chat_message', createdAt: { $gte: since } }),
        Event.find({ type: 'pageview', createdAt: { $gte: since } }).select('source').lean().then((rows) => countBy(rows, (e) => e.source || 'direct').slice(0, 8)),
        Event.aggregate([{ $match: { type: 'pageview', createdAt: { $gte: since } } }, { $group: { _id: '$path', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]),
        Project.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        Invoice.aggregate([{ $match: { issueDate: { $gte: since } } }, { $group: { _id: '$status', total: { $sum: '$total' }, paid: { $sum: '$amountPaid' }, n: { $sum: 1 } } }]),
        Proposal.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
        Appointment.countDocuments({ createdAt: { $gte: since } }),
      ]);
    // ---- previous period (for the % change on every KPI) ----
    const inPrev = { $gte: prevSince, $lt: since };
    const [pPageviews, pLeads, pWon, pForms, pAppts] = await Promise.all([
      Event.countDocuments({ type: 'pageview', createdAt: inPrev }),
      Lead.countDocuments({ createdAt: inPrev }),
      Lead.countDocuments({ createdAt: inPrev, status: 'Won' }),
      Event.countDocuments({ type: 'form_submit', createdAt: inPrev }),
      Appointment.countDocuments({ createdAt: inPrev }),
    ]);
    // ---- daily trend (JS grouping works on every MongoDB flavour) ----
    const [pvRows, leadRows, orderRows, allOrders, pubReviews] = await Promise.all([
      Event.find({ type: 'pageview', createdAt: { $gte: since } }).select('createdAt').lean(),
      Lead.find({ createdAt: { $gte: since } }).select('createdAt').lean(),
      Order.find({ createdAt: { $gte: prevSince } }).select('createdAt client status price').lean(),
      Order.find({}).select('client status price createdAt completedAt deliveredAt dueDate timeline.status').lean(),
      Review.find({ status: 'published' }).select('overall createdAt').lean(),
    ]);
    const key = (d) => new Date(d).toISOString().slice(0, 10);
    const bucket = (rows) => rows.reduce((m, r) => m.set(key(r.createdAt), (m.get(key(r.createdAt)) || 0) + 1), new Map());
    const pv = bucket(pvRows);
    const ld = bucket(leadRows);
    const od = bucket(orderRows.filter((o) => new Date(o.createdAt) >= since));
    const trend = Array.from({ length: days }, (_, i) => {
      const k = key(Date.now() - (days - 1 - i) * 864e5);
      return { day: k.slice(5), visitors: pv.get(k) || 0, leads: ld.get(k) || 0, orders: od.get(k) || 0 };
    });
    // ---- order health ----
    const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
    const cur = orderRows.filter((o) => new Date(o.createdAt) >= since && o.status !== 'Awaiting Quote');
    const prv = orderRows.filter((o) => new Date(o.createdAt) < since && o.status !== 'Awaiting Quote');
    const paid = (list) => list.filter((o) => !['Pending Payment', 'Cancelled'].includes(o.status));
    const aov = (list) => { const l = paid(list).filter((o) => o.price > 0); return l.length ? Math.round((l.reduce((s, o) => s + o.price, 0) / l.length) * 100) / 100 : 0; };
    const finished = allOrders.filter((o) => o.status === 'Completed' && (o.completedAt || o.createdAt) >= since);
    const withDue = finished.filter((o) => o.dueDate && o.deliveredAt);
    const delivered = allOrders.filter((o) => ['Delivered', 'Revision Requested', 'Completed'].includes(o.status) && new Date(o.createdAt) >= since);
    const revised = delivered.filter((o) => (o.timeline || []).some((t) => t.status === 'Revision Requested'));
    const closed = allOrders.filter((o) => ['Completed', 'Cancelled'].includes(o.status) && new Date(o.createdAt) >= since);
    const perClient = allOrders.filter((o) => o.status !== 'Cancelled').reduce((m, o) => m.set(String(o.client), (m.get(String(o.client)) || 0) + 1), new Map());
    const activeClients = [...new Set(cur.map((o) => String(o.client)))];
    const ratings = pubReviews.map((r) => r.overall).filter(Boolean);
    const orders = {
      placed: cur.length, prevPlaced: prv.length,
      aov: aov(cur), prevAov: aov(prv),
      completionRate: pct(closed.filter((o) => o.status === 'Completed').length, closed.length),
      onTimeRate: pct(withDue.filter((o) => new Date(o.deliveredAt) <= new Date(o.dueDate)).length, withDue.length),
      revisionRate: pct(revised.length, delivered.length),
      cancelRate: pct(closed.filter((o) => o.status === 'Cancelled').length, closed.length),
      repeatRate: pct(activeClients.filter((c) => (perClient.get(c) || 0) > 1).length, activeClients.length),
      avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      reviews: ratings.length,
    };
    const prev = { pageviews: pPageviews, leads: pLeads, won: pWon, formSubmits: pForms, appointments: pAppts };
    const qualified = byStatus.filter((s) => ['Qualified', 'Meeting Booked', 'Proposal Sent', 'Won'].includes(s._id)).reduce((a, b) => a + b.n, 0);
    const meetings = byStatus.filter((s) => ['Meeting Booked', 'Proposal Sent', 'Won'].includes(s._id)).reduce((a, b) => a + b.n, 0);
    const proposalsSent = byStatus.filter((s) => ['Proposal Sent', 'Won'].includes(s._id)).reduce((a, b) => a + b.n, 0);
    res.json({
      days,
      funnel: [
        { stage: 'Visitors (pageviews)', n: pageviews },
        { stage: 'Leads', n: total },
        { stage: 'Qualified', n: qualified },
        { stage: 'Meeting booked', n: meetings },
        { stage: 'Proposal sent', n: proposalsSent },
        { stage: 'Won', n: won },
      ],
      conversionRate: total ? Math.round((won / total) * 1000) / 10 : 0,
      bySource, byStatus, byService, byIndustry, byCountry,
      analytics: { pageviews, formSubmits, chatOpens, chatMessages, trafficBySource, topPages, appointments: appts },
      projectsByStatus, revenue, proposals,
      prev, trend, orders,
    });
  })
);

export default r;
