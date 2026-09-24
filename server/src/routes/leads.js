import { Router } from 'express';
import { z } from 'zod';
import { Lead, Client, User, LEAD_STATUSES, LEAD_SOURCES } from '../models/index.js';
import { asyncHandler, AppError, paginate, escapeRegex, normalizeDomain, esc } from '../utils/http.js';
import { validate, audit } from '../middleware/common.js';
import { notifyUser, sendEmail } from '../services/notify.js';
import { findDuplicate } from '../services/leads.js';

const r = Router();

function buildQuery(req) {
  const q = {};
  const { status, source, service, industry, country, owner, from, to, followUp, q: search, duplicates } = req.query;
  if (status) q.status = status;
  if (source) q.source = source;
  if (service) q.service = service;
  if (industry) q.industry = industry;
  if (country) q.country = country;
  if (owner) q.owner = owner === 'me' ? req.user._id : owner === 'none' ? null : owner;
  if (from || to) q.createdAt = { ...(from && { $gte: new Date(from) }), ...(to && { $lte: new Date(`${to}T23:59:59`) }) };
  if (followUp === 'due') q.followUpDate = { $lte: new Date() };
  if (duplicates === '1') q.duplicateCount = { $gt: 0 };
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    q.$or = [{ fullName: rx }, { email: rx }, { company: rx }, { leadId: rx }, { website: rx }, { phone: rx }];
  }
  // Chat agents only see leads assigned to them
  if (req.user.role === 'chat_agent') q.owner = req.user._id;
  return q;
}

r.get(
  '/meta',
  asyncHandler(async (_req, res) => {
    const owners = await User.find({ role: { $in: ['superadmin', 'admin', 'sales', 'chat_agent'] }, active: true }).select('name role');
    res.json({ statuses: LEAD_STATUSES, sources: LEAD_SOURCES, owners });
  })
);

r.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req);
    const q = buildQuery(req);
    const [items, total, byStatus] = await Promise.all([
      Lead.find(q).sort(req.query.sort || '-createdAt').skip(skip).limit(limit).select('-activities').populate('owner', 'name'),
      Lead.countDocuments(q),
      Lead.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit), byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.n])) });
  })
);

// CSV export (authorized users only — sales/admin/superadmin)
r.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    if (!['superadmin', 'admin', 'sales'].includes(req.user.role)) throw new AppError(403, 'Not allowed to export');
    const leads = await Lead.find(buildQuery(req)).sort('-createdAt').populate('owner', 'name').lean();
    const cols = ['leadId', 'createdAt', 'fullName', 'company', 'email', 'phone', 'website', 'country', 'industry', 'service', 'budget', 'timeline', 'source', 'leadSource', 'status', 'owner', 'followUpDate', 'description'];
    const esc = (v) => {
      let s = v == null ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? v.name || '' : String(v);
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // CSV injection guard
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [cols.join(','), ...leads.map((l) => cols.map((c) => esc(l[c])).join(','))].join('\n');
    await audit(req, 'export', 'Lead', null, { count: leads.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="zeviro-leads-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  })
);

r.post(
  '/',
  validate(
    z.object({
      fullName: z.string().min(2),
      email: z.string().email(),
      company: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      country: z.string().optional(),
      industry: z.string().optional(),
      service: z.string().optional(),
      budget: z.string().optional(),
      timeline: z.string().optional(),
      description: z.string().optional(),
      source: z.enum(LEAD_SOURCES).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const dup = await findDuplicate(req.body);
    const lead = await Lead.create({
      ...req.body,
      source: req.body.source || 'Manual',
      domain: normalizeDomain(req.body.website || ''),
      owner: req.user._id,
      isDuplicateOf: dup?._id || null,
      activities: [{ type: 'system', text: `Lead added manually${dup ? ` (possible duplicate of ${dup.leadId})` : ''}`, by: req.user._id }],
    });
    await audit(req, 'create', 'Lead', lead._id);
    res.status(201).json({ lead, duplicateOf: dup });
  })
);

r.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = await Lead.findOne({ _id: req.params.id, ...(req.user.role === 'chat_agent' && { owner: req.user._id }) })
      .populate('owner', 'name email')
      .populate('activities.by', 'name')
      .populate('convertedClient', 'name');
    if (!lead) throw new AppError(404, 'Lead not found');
    const duplicates = await Lead.find({ _id: { $ne: lead._id }, $or: [{ email: lead.email }, ...(lead.domain ? [{ domain: lead.domain }] : [])] }).select('leadId fullName createdAt status');
    res.json({ lead, duplicates });
  })
);

r.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new AppError(404, 'Lead not found');
    const allowed = ['fullName', 'company', 'email', 'phone', 'website', 'country', 'industry', 'service', 'budget', 'timeline', 'description', 'status', 'owner', 'followUpDate', 'tags', 'source'];
    const changes = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (changes.status && changes.status !== lead.status) {
      if (!LEAD_STATUSES.includes(changes.status)) throw new AppError(422, 'Invalid status');
      lead.activities.push({ type: 'status', text: `Status changed: ${lead.status} → ${changes.status}`, by: req.user._id });
    }
    if (changes.owner !== undefined && String(changes.owner || '') !== String(lead.owner || '')) {
      const owner = changes.owner ? await User.findById(changes.owner) : null;
      lead.activities.push({ type: 'assign', text: owner ? `Assigned to ${owner.name}` : 'Unassigned', by: req.user._id });
      if (owner) await notifyUser(owner._id, { type: 'lead_assigned', title: `Lead assigned: ${lead.fullName}`, body: `${req.user.name} assigned lead ${lead.leadId} to you.`, link: `/admin/leads/${lead._id}`, email: true });
      if (!changes.owner) changes.owner = null;
    }
    if (changes.followUpDate !== undefined && String(changes.followUpDate) !== String(lead.followUpDate))
      lead.activities.push({ type: 'note', text: changes.followUpDate ? `Follow-up set for ${new Date(changes.followUpDate).toDateString()}` : 'Follow-up cleared', by: req.user._id });
    if (changes.website !== undefined) changes.domain = normalizeDomain(changes.website);
    lead.set(changes);
    await lead.save();
    await audit(req, 'update', 'Lead', lead._id, { fields: Object.keys(changes) });
    res.json(await lead.populate([{ path: 'owner', select: 'name email' }, { path: 'activities.by', select: 'name' }]));
  })
);

r.post(
  '/:id/notes',
  validate(z.object({ text: z.string().trim().min(1).max(5000), type: z.enum(['note', 'call', 'email', 'meeting']).optional() })),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new AppError(404, 'Lead not found');
    lead.activities.push({ type: req.body.type || 'note', text: req.body.text, by: req.user._id });
    if (lead.status === 'New' && ['call', 'email'].includes(req.body.type)) {
      lead.activities.push({ type: 'status', text: 'Status changed: New → Contacted', by: req.user._id });
      lead.status = 'Contacted';
    }
    await lead.save();
    res.json(await lead.populate([{ path: 'owner', select: 'name email' }, { path: 'activities.by', select: 'name' }]));
  })
);

// Convert a won lead into a Client (+ optional portal login)
r.post(
  '/:id/convert',
  validate(z.object({ createPortalUser: z.boolean().optional(), password: z.string().min(8).optional() })),
  asyncHandler(async (req, res) => {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new AppError(404, 'Lead not found');
    if (lead.convertedClient) throw new AppError(409, 'Lead already converted');
    const client = await Client.create({
      name: lead.company || lead.fullName,
      website: lead.website,
      industry: lead.industry,
      country: lead.country,
      primaryContact: { name: lead.fullName, email: lead.email, phone: lead.phone },
      contacts: [{ name: lead.fullName, email: lead.email, phone: lead.phone, role: 'Primary' }],
      accountManager: lead.owner || req.user._id,
      fromLead: lead._id,
    });
    let portalUser = null;
    if (req.body.createPortalUser) {
      const exists = await User.findOne({ email: lead.email });
      if (exists) throw new AppError(409, 'A user with this email already exists');
      const password = req.body.password || `Zv-${Math.random().toString(36).slice(2, 8)}A1`;
      portalUser = await User.create({ name: lead.fullName, email: lead.email, password, role: 'client', client: client._id });
      await sendEmail({
        to: lead.email,
        subject: 'Your Zeviro client portal is ready',
        html: `Hi ${esc(lead.fullName.split(' ')[0])},<br/><br/>Your secure client portal is ready. Log in at <a href="${process.env.CLIENT_URL}/login">${process.env.CLIENT_URL}/login</a> with:<br/>Email: <b>${lead.email}</b><br/>Temporary password: <b>${password}</b><br/><br/>Please change your password after your first login.`,
      });
    }
    lead.status = 'Won';
    lead.convertedClient = client._id;
    lead.activities.push({ type: 'system', text: `Converted to client "${client.name}"${portalUser ? ' with portal access' : ''}`, by: req.user._id });
    await lead.save();
    await audit(req, 'convert_lead', 'Client', client._id, { lead: lead._id });
    res.status(201).json({ client, portalUser: portalUser && portalUser.toSafeJSON() });
  })
);

r.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!['superadmin', 'admin'].includes(req.user.role)) throw new AppError(403, 'Only admins can delete leads');
    await Lead.findByIdAndDelete(req.params.id);
    await audit(req, 'delete', 'Lead', req.params.id);
    res.json({ ok: true });
  })
);

export default r;
