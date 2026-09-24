import { Lead } from '../models/index.js';
import { normalizeDomain, escapeRegex, esc } from '../utils/http.js';
import { notifyRoles, sendEmail } from './notify.js';
import { Setting } from '../models/index.js';

// Find an existing lead by email, website domain or company name (Spec §5 duplicate detection).
export async function findDuplicate({ email, website, company }) {
  const or = [];
  if (email) or.push({ email: email.toLowerCase() });
  const domain = normalizeDomain(website || '');
  if (domain) or.push({ domain });
  if (company && company.trim().length > 2) or.push({ company: new RegExp(`^${escapeRegex(company.trim())}$`, 'i') });
  if (!or.length) return null;
  return Lead.findOne({ $or: or, isDuplicateOf: null }).sort({ createdAt: 1 });
}

/**
 * Creates a lead, or — if a duplicate exists — logs the new inquiry on the existing lead.
 * Returns { lead, duplicate: boolean }.
 */
export async function upsertLead(data, { source = 'Website', status, notifyTitle = 'New website lead', autoReply = true, meta } = {}) {
  const existing = await findDuplicate(data);
  if (existing) {
    existing.duplicateCount += 1;
    // fill blanks with new information
    for (const k of ['phone', 'website', 'country', 'industry', 'service', 'budget', 'timeline', 'company']) {
      if (!existing[k] && data[k]) existing[k] = data[k];
    }
    if (existing.website && !existing.domain) existing.domain = normalizeDomain(existing.website);
    if (status && ['New', 'Contacted'].includes(existing.status)) existing.status = status;
    existing.activities.push({ type: 'system', text: `Repeat inquiry via ${source}: ${data.description || data.service || ''}`.slice(0, 2000) });
    await existing.save();
    await notifyRoles(['admin', 'sales'], {
      type: 'lead_duplicate',
      title: `Returning lead: ${existing.fullName}`,
      body: `${esc(existing.fullName)} (${esc(existing.email)}) submitted again via ${source}.`,
      link: `/admin/leads/${existing._id}`,
    });
    return { lead: existing, duplicate: true };
  }

  const lead = await Lead.create({
    ...data,
    domain: normalizeDomain(data.website || ''),
    source,
    status: status || 'New',
    meta,
    activities: [{ type: 'system', text: `Lead created via ${source}` }],
  });

  await notifyRoles(['admin', 'sales'], {
    type: 'lead_new',
    title: `${notifyTitle}: ${lead.fullName}`,
    body: `<b>${esc(lead.fullName)}</b> ${lead.company ? `from ${esc(lead.company)}` : ''} is interested in <b>${esc(lead.service || 'our services')}</b>. Budget: ${esc(lead.budget || '—')}, timeline: ${esc(lead.timeline || '—')}.`,
    link: `/admin/leads/${lead._id}`,
    email: true,
  });

  const settings = await Setting.findOne({ key: 'site' });
  if (autoReply && settings?.autoReplyEnabled !== false) {
    await sendEmail({
      to: lead.email,
      subject: 'Thanks for contacting Zeviro',
      html: `Hi ${esc(lead.fullName.split(' ')[0])},<br/><br/>Thanks for reaching out about <b>${esc(lead.service || 'your project')}</b>. A Zeviro specialist will review your request and reply within one business day.<br/><br/>Your reference: <b>${lead.leadId}</b><br/><br/>— The Zeviro Team`,
    });
  }
  return { lead, duplicate: false };
}
