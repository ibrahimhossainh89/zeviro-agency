import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Globe, MapPin, Building2, Pencil, Trash2, UserPlus, StickyNote, PhoneCall, AtSign, Users, Cog, Flag, UserCheck } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, Modal, Select, Textarea, PageLoader, ErrorBox, Field, Input } from '../../components/ui';
import { ResourceForm } from '../../components/Resource';
import { useFetch, fmtDateTime, fmtDate, timeAgo, toInputDate, cn } from '../../lib/utils';
import { LEAD_FIELDS } from './Leads';
import { useAuth } from '../../context/AuthContext';

const ACT_ICON = { note: StickyNote, call: PhoneCall, email: AtSign, meeting: Users, system: Cog, status: Flag, assign: UserCheck };

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, setData } = useFetch(`/leads/${id}`);
  const meta = useFetch('/leads/meta');
  const [note, setNote] = useState({ text: '', type: 'note' });
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertOpts, setConvertOpts] = useState({ createPortalUser: true, password: '' });
  const [err, setErr] = useState('');

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const { lead, duplicates } = data;

  const patch = async (body) => {
    setErr('');
    try {
      const l = await api.patch(`/leads/${id}`, body);
      setData((d) => ({ ...d, lead: l }));
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  const addNote = async (e) => {
    e.preventDefault();
    if (!note.text.trim()) return;
    const l = await api.post(`/leads/${id}/notes`, note);
    setData((d) => ({ ...d, lead: l }));
    setNote({ text: '', type: 'note' });
  };
  const convert = async () => {
    try {
      const r = await api.post(`/leads/${id}/convert`, { createPortalUser: convertOpts.createPortalUser, ...(convertOpts.password && { password: convertOpts.password }) });
      nav(`/admin/clients/${r.client._id}`);
    } catch (e) {
      setErr(errMsg(e));
      setConverting(false);
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this lead permanently?')) return;
    await api.del(`/leads/${id}`);
    nav('/admin/leads');
  };

  const info = [
    [Mail, lead.email, `mailto:${lead.email}`],
    [Phone, lead.phone, lead.phone && `tel:${lead.phone}`],
    [Globe, lead.website, lead.website && (lead.website.startsWith('http') ? lead.website : `https://${lead.website}`)],
    [Building2, lead.company],
    [MapPin, lead.country],
  ].filter(([, v]) => v);

  return (
    <div className="space-y-6">
      <Link to="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Leads</Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">{lead.fullName}</h1><Badge>{lead.status}</Badge>{lead.duplicateCount > 0 && <Badge tone="amber">{lead.duplicateCount} repeat inquiries</Badge>}</div>
          <p className="mt-1 font-mono text-xs text-slate-500">{lead.leadId} · received {fmtDateTime(lead.createdAt)} via {lead.source}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          {lead.convertedClient ? (
            <Button variant="ghost" size="sm" to={`/admin/clients/${lead.convertedClient._id}`}>View client: {lead.convertedClient.name}</Button>
          ) : (
            <Button size="sm" onClick={() => setConverting(true)}><UserPlus className="h-3.5 w-3.5" /> Convert to client</Button>
          )}
          {['superadmin', 'admin'].includes(user.role) && <Button variant="danger" size="sm" onClick={remove}><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>
      <ErrorBox>{err}</ErrorBox>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Pipeline</h2>
            <div className="flex flex-wrap gap-2">
              {(meta.data?.statuses || []).map((s) => (
                <button key={s} onClick={() => patch({ status: s })} className={cn('rounded-xl border px-3 py-1.5 text-xs transition', lead.status === s ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:text-white')}>{s}</button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Project details</h2>
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              {[['Service', lead.service], ['Budget', lead.budget], ['Timeline', lead.timeline], ['Industry', lead.industry], ['Heard about us', lead.leadSource], ['Page', lead.meta?.page]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 text-slate-200">{v || '—'}</dd></div>
              ))}
            </dl>
            {lead.description && <p className="mt-5 whitespace-pre-line rounded-xl bg-ink-900 p-4 text-sm text-slate-300">{lead.description}</p>}
          </div>

          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Activity</h2>
            <form onSubmit={addNote} className="mb-6 space-y-2">
              <Textarea rows={3} placeholder="Add a note, log a call or email…" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} />
              <div className="flex justify-between gap-2">
                <Select className="w-40" value={note.type} onChange={(e) => setNote({ ...note, type: e.target.value })} options={[{ value: 'note', label: 'Note' }, { value: 'call', label: 'Call' }, { value: 'email', label: 'Email' }, { value: 'meeting', label: 'Meeting' }]} />
                <Button size="sm" type="submit">Add activity</Button>
              </div>
            </form>
            <ol className="relative space-y-4 border-l border-ink-600 pl-6">
              {[...lead.activities].reverse().map((a) => {
                const I = ACT_ICON[a.type] || StickyNote;
                return (
                  <li key={a._id} className="relative">
                    <span className="absolute -left-[35px] top-0 rounded-full border border-ink-600 bg-ink-850 p-1.5 text-brand-300"><I className="h-3 w-3" /></span>
                    <p className="whitespace-pre-line text-sm text-slate-200">{a.text}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{a.by?.name || 'System'} · {timeAgo(a.createdAt)}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-3 p-5">
            <h2 className="font-semibold">Contact</h2>
            {info.map(([I, v, href]) => (
              <p key={v} className="flex items-center gap-2 text-sm"><I className="h-4 w-4 text-slate-500" />{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:underline">{v}</a> : <span className="text-slate-200">{v}</span>}</p>
            ))}
          </div>
          <div className="card space-y-4 p-5">
            <Field label="Owner">
              <Select value={lead.owner?._id || ''} onChange={(e) => patch({ owner: e.target.value || null })} options={(meta.data?.owners || []).map((o) => ({ value: o._id, label: o.name }))} placeholder="Unassigned" />
            </Field>
            <Field label="Follow-up date" hint={lead.followUpDate ? `Due ${fmtDate(lead.followUpDate)}` : undefined}>
              <Input type="date" value={toInputDate(lead.followUpDate)} onChange={(e) => patch({ followUpDate: e.target.value || null })} />
            </Field>
          </div>
          {duplicates.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold text-amber-300">Possible duplicates</h2>
              <ul className="space-y-2">
                {duplicates.map((d) => <li key={d._id}><Link to={`/admin/leads/${d._id}`} className="flex justify-between rounded-lg border border-ink-600 px-3 py-2 text-sm hover:border-brand-500/50"><span>{d.fullName}</span><span className="font-mono text-xs text-slate-500">{d.leadId}</span></Link></li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit lead" wide>
        <ResourceForm fields={LEAD_FIELDS} initial={lead} onCancel={() => setEditing(false)} onSubmit={async (b) => { await patch(b); setEditing(false); }} />
      </Modal>
      <Modal open={converting} onClose={() => setConverting(false)} title="Convert lead to client" footer={<><Button variant="ghost" onClick={() => setConverting(false)}>Cancel</Button><Button onClick={convert}>Convert</Button></>}>
        <p className="text-sm text-slate-400">Creates a client record for <span className="text-white">{lead.company || lead.fullName}</span> and marks this lead as Won.</p>
        <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-violet-500" checked={convertOpts.createPortalUser} onChange={(e) => setConvertOpts({ ...convertOpts, createPortalUser: e.target.checked })} /> Create client portal login for {lead.email}</label>
        {convertOpts.createPortalUser && (
          <Field label="Temporary password (optional)" hint="Leave empty to auto-generate. It's emailed to the client." className="mt-4">
            <Input type="text" value={convertOpts.password} onChange={(e) => setConvertOpts({ ...convertOpts, password: e.target.value })} />
          </Field>
        )}
      </Modal>
    </div>
  );
}
