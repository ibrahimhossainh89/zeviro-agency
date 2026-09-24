import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, Search, Copy } from 'lucide-react';
import { api } from '../../api/http';
import { Badge, Button, Modal, PageHeader, Pagination, Select, Spinner, Empty, ErrorBox } from '../../components/ui';
import { ResourceForm } from '../../components/Resource';
import { useFetch, timeAgo, fmtDate, cn, SERVICES, INDUSTRIES, COUNTRIES, BUDGETS, TIMELINES } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export const LEAD_FIELDS = [
  { name: 'fullName', label: 'Full name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'company', label: 'Company' },
  { name: 'phone', label: 'Phone' },
  { name: 'website', label: 'Website' },
  { name: 'country', label: 'Country', type: 'select', options: COUNTRIES },
  { name: 'industry', label: 'Industry', type: 'select', options: INDUSTRIES },
  { name: 'service', label: 'Service', type: 'select', options: SERVICES },
  { name: 'budget', label: 'Budget', type: 'select', options: BUDGETS },
  { name: 'timeline', label: 'Timeline', type: 'select', options: TIMELINES },
  { name: 'source', label: 'Source', type: 'select', options: ['Manual', 'Referral', 'Website', 'AI Chatbot', 'Live Chat', 'Book a Call', 'Offline Inquiry', 'Other'] },
  { name: 'description', label: 'Description / notes', type: 'textarea' },
];

export default function Leads() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [creating, setCreating] = useState(false);
  const meta = useFetch('/leads/meta');

  const filters = Object.fromEntries(['status', 'source', 'service', 'industry', 'country', 'owner', 'from', 'to', 'followUp', 'duplicates', 'sort', 'page', 'q'].filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
  const { data, loading, error, reload } = useFetch('/leads', { limit: 25, ...filters });

  useEffect(() => {
    const t = setTimeout(() => setF('q', q), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setF(k, v) {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    if (k !== 'page') n.delete('page');
    setParams(n, { replace: true });
  }

  const exportCsv = () => {
    const qs = new URLSearchParams(filters).toString();
    window.location.href = `/api/v1/leads/export.csv${qs ? `?${qs}` : ''}`;
  };

  const statuses = meta.data?.statuses || [];
  const counts = data?.byStatus || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Leads / CRM"
        subtitle="Every inquiry from the website, chatbot, live chat and bookings."
        actions={
          <>
            {['superadmin', 'admin', 'sales'].includes(user.role) && <Button variant="ghost" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>}
            <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Add lead</Button>
          </>
        }
      />

      {/* pipeline */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setF('status', '')} className={cn('shrink-0 rounded-xl border px-4 py-2 text-left', !filters.status ? 'border-brand-500 bg-brand-500/15' : 'border-ink-600 bg-ink-800/60')}>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">All</p><p className="font-display text-lg font-semibold text-white">{total}</p>
        </button>
        {statuses.map((s) => (
          <button key={s} onClick={() => setF('status', s)} className={cn('shrink-0 rounded-xl border px-4 py-2 text-left', filters.status === s ? 'border-brand-500 bg-brand-500/15' : 'border-ink-600 bg-ink-800/60')}>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">{s}</p><p className="font-display text-lg font-semibold text-white">{counts[s] || 0}</p>
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <input className="input pl-9" placeholder="Search name, email, company, ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={filters.source || ''} onChange={(e) => setF('source', e.target.value)} options={meta.data?.sources || []} placeholder="All sources" />
        <Select value={filters.service || ''} onChange={(e) => setF('service', e.target.value)} options={SERVICES} placeholder="All services" />
        <Select value={filters.owner || ''} onChange={(e) => setF('owner', e.target.value)} options={[{ value: 'me', label: 'Assigned to me' }, { value: 'none', label: 'Unassigned' }, ...(meta.data?.owners || []).map((o) => ({ value: o._id, label: o.name }))]} placeholder="Any owner" />
        <Select value={filters.sort || ''} onChange={(e) => setF('sort', e.target.value)} options={[{ value: 'createdAt', label: 'Oldest first' }, { value: 'fullName', label: 'Name A–Z' }, { value: 'followUpDate', label: 'Follow-up date' }, { value: '-updatedAt', label: 'Recently updated' }]} placeholder="Newest first" />
        <div className="flex gap-2 lg:col-span-2">
          <input type="date" className="input" value={filters.from || ''} onChange={(e) => setF('from', e.target.value)} aria-label="From date" />
          <input type="date" className="input" value={filters.to || ''} onChange={(e) => setF('to', e.target.value)} aria-label="To date" />
        </div>
        <Select value={filters.industry || ''} onChange={(e) => setF('industry', e.target.value)} options={INDUSTRIES} placeholder="All industries" />
        <Select value={filters.country || ''} onChange={(e) => setF('country', e.target.value)} options={COUNTRIES} placeholder="All countries" />
        <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" className="accent-violet-500" checked={filters.followUp === 'due'} onChange={(e) => setF('followUp', e.target.checked ? 'due' : '')} /> Follow-up due</label>
        <label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" className="accent-violet-500" checked={filters.duplicates === '1'} onChange={(e) => setF('duplicates', e.target.checked ? '1' : '')} /> Repeat inquiries</label>
      </div>

      <ErrorBox>{error}</ErrorBox>
      <div className="card overflow-x-auto">
        {loading && !data ? <div className="flex justify-center p-10"><Spinner /></div> : !data?.items.length ? <div className="p-6"><Empty title="No leads match these filters" /></div> : (
          <table className="table-x">
            <thead><tr><th>Lead</th><th>Company</th><th>Service</th><th>Budget</th><th>Source</th><th>Status</th><th>Owner</th><th>Follow-up</th><th>Received</th></tr></thead>
            <tbody>
              {data.items.map((l) => (
                <tr key={l._id} className="cursor-pointer" onClick={() => nav(`/admin/leads/${l._id}`)}>
                  <td>
                    <p className="font-medium text-white">{l.fullName} {l.duplicateCount > 0 && <span title={`${l.duplicateCount} repeat inquiries`} className="ml-1 inline-flex items-center gap-0.5 text-xs text-amber-300"><Copy className="h-3 w-3" />{l.duplicateCount}</span>}</p>
                    <p className="text-xs text-slate-500">{l.email}</p>
                    <p className="font-mono text-[10px] text-slate-600">{l.leadId}</p>
                  </td>
                  <td className="text-slate-300">{l.company || '—'}<div className="text-xs text-slate-500">{l.country}</div></td>
                  <td className="text-slate-300">{l.service || '—'}</td>
                  <td className="text-slate-400">{l.budget || '—'}</td>
                  <td className="text-slate-400">{l.source}</td>
                  <td><Badge>{l.status}</Badge></td>
                  <td className="text-slate-400">{l.owner?.name || <span className="text-slate-600">Unassigned</span>}</td>
                  <td className={cn('text-xs', l.followUpDate && new Date(l.followUpDate) < new Date() ? 'text-amber-300' : 'text-slate-500')}>{l.followUpDate ? fmtDate(l.followUpDate) : '—'}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={(p) => setF('page', String(p))} />

      <Modal open={creating} onClose={() => setCreating(false)} title="Add lead" wide>
        <ResourceForm
          fields={LEAD_FIELDS}
          initial={{ source: 'Manual' }}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            const r = await api.post('/leads', body);
            setCreating(false);
            if (r.duplicateOf) alert(`Heads up: this looks like a duplicate of ${r.duplicateOf.leadId} (${r.duplicateOf.fullName}).`);
            reload();
          }}
        />
      </Modal>
    </div>
  );
}
