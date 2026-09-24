import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, DollarSign, CalendarDays, List, Video } from 'lucide-react';
import Resource, { ResourceForm } from '../../components/Resource';
import { Badge, Modal, Button, Tabs, PageHeader } from '../../components/ui';
import { api, errMsg } from '../../api/http';
import { fmtDate, fmtDateTime, fmtMoney, useFetch, cn } from '../../lib/utils';

// ---------------- Appointments ----------------
const APPT_STATUSES = ['Requested', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'];
const APPT_FIELDS = [
  { name: 'title', label: 'Title', required: true, default: 'Discovery Call' },
  { name: 'startsAt', label: 'Date & time', type: 'datetime', required: true },
  { name: 'durationMin', label: 'Duration (min)', type: 'number', default: 30 },
  { name: 'status', label: 'Status', type: 'select', options: APPT_STATUSES, default: 'Confirmed', required: true },
  { name: 'name', label: 'Contact name' },
  { name: 'email', label: 'Contact email', type: 'email' },
  { name: 'company', label: 'Company' },
  { name: 'client', label: 'Client (portal)', type: 'ref', ref: { endpoint: '/clients' } },
  { name: 'host', label: 'Host', type: 'ref', ref: { endpoint: '/staff' } },
  { name: 'meetingLink', label: 'Meeting link', placeholder: 'https://meet.google.com/…' },
  { name: 'agenda', label: 'Agenda', type: 'textarea' },
  { name: 'notes', label: 'Internal notes', type: 'textarea' },
];

function Calendar() {
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const { data } = useFetch('/appointments', { limit: 200, sort: 'startsAt' });
  const items = data?.items || [];
  const start = new Date(month);
  start.setDate(1 - ((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const same = (a, b) => a.toDateString() === b.toDateString();
  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>←</Button>
        <p className="font-semibold text-white">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
        <Button size="sm" variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>→</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-slate-500">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const evs = items.filter((a) => same(new Date(a.startsAt), d));
          return (
            <div key={d.toISOString()} className={cn('min-h-[88px] rounded-lg border p-1.5 text-left', d.getMonth() === month.getMonth() ? 'border-ink-600' : 'border-transparent opacity-40', same(d, new Date()) && 'border-brand-500')}>
              <p className="text-xs text-slate-400">{d.getDate()}</p>
              {evs.map((a) => (
                <p key={a._id} className={cn('mt-1 truncate rounded px-1 py-0.5 text-[10px]', a.status === 'Cancelled' ? 'bg-slate-700 text-slate-400 line-through' : a.status === 'Requested' ? 'bg-amber-500/20 text-amber-200' : 'bg-brand-500/25 text-brand-100')} title={`${a.title} — ${a.name || ''}`}>
                  {new Date(a.startsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} {a.name || a.title}
                </p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Appointments() {
  const [view, setView] = useState('list');
  return (
    <div>
      <div className="mb-4 flex justify-end"><Tabs tabs={[{ value: 'list', label: <span className="flex items-center gap-1"><List className="h-3.5 w-3.5" /> List</span> }, { value: 'calendar', label: <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Calendar</span> }]} value={view} onChange={setView} /></div>
      {view === 'calendar' ? (<><PageHeader title="Appointments" subtitle="Calendar view" /><Calendar /></>) : (
        <Resource
          endpoint="/appointments"
          title="Appointments"
          createLabel="New meeting"
          fields={APPT_FIELDS}
          filters={[{ name: 'status', label: 'All statuses', options: APPT_STATUSES }]}
          rowActions={(r, reload) => r.status === 'Requested' && <Button size="sm" variant="ghost" onClick={async () => { await api.patch(`/appointments/${r._id}`, { status: 'Confirmed' }); reload(); }}>Confirm</Button>}
          columns={[
            { label: 'When', render: (r) => <span className="whitespace-nowrap text-white">{fmtDateTime(r.startsAt)}</span> },
            { label: 'Meeting', render: (r) => <><p className="text-slate-200">{r.title}</p><p className="text-xs text-slate-500">{r.durationMin} min{r.timezone ? ` · ${r.timezone}` : ''}</p></> },
            { label: 'With', render: (r) => <><p className="text-slate-200">{r.name || r.client?.name || '—'}</p><p className="text-xs text-slate-500">{r.email}{r.company ? ` · ${r.company}` : ''}</p></> },
            { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
            { label: 'Host', render: (r) => r.host?.name || '—' },
            { label: 'Link', render: (r) => (r.meetingLink ? <a href={r.meetingLink} target="_blank" rel="noopener noreferrer" className="text-brand-300" onClick={(e) => e.stopPropagation()}><Video className="h-4 w-4" /></a> : '—') },
          ]}
        />
      )}
    </div>
  );
}

// ---------------- Proposals ----------------
const PROPOSAL_STATUSES = ['Draft', 'Sent', 'Viewed', 'Accepted', 'Declined', 'Expired'];
const PROPOSAL_FIELDS = [
  { name: 'title', label: 'Title', required: true },
  { name: 'client', label: 'Client', type: 'ref', ref: { endpoint: '/clients' } },
  { name: 'lead', label: 'Lead (optional)', type: 'ref', ref: { endpoint: '/leads', label: (l) => `${l.fullName}${l.company ? ` — ${l.company}` : ''}` } },
  { name: 'currency', label: 'Currency', type: 'select', options: ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'BDT'], default: 'USD', required: true },
  { name: 'validUntil', label: 'Valid until', type: 'date' },
  { name: 'timeline', label: 'Timeline', placeholder: 'e.g. 6 weeks' },
  { name: 'status', label: 'Status', type: 'select', options: PROPOSAL_STATUSES, default: 'Draft', required: true },
  { name: 'summary', label: 'Summary', type: 'textarea', rows: 2 },
  { name: 'scope', label: 'Scope of work', type: 'textarea' },
  { name: 'deliverables', label: 'Deliverables', type: 'lines' },
  { name: 'items', label: 'Pricing', type: 'items' },
];

export function Proposals() {
  return (
    <Resource
      endpoint="/proposals"
      title="Proposals"
      createLabel="New proposal"
      fields={PROPOSAL_FIELDS}
      filters={[{ name: 'status', label: 'All statuses', options: PROPOSAL_STATUSES }]}
      rowActions={(r, reload) =>
        ['Draft', 'Sent', 'Viewed'].includes(r.status) && r.client && (
          <Button size="sm" variant="ghost" onClick={async () => { try { await api.post(`/proposals/${r._id}/send`); reload(); } catch (e) { alert(errMsg(e)); } }}>
            <Send className="h-3.5 w-3.5" /> {r.status === 'Draft' ? 'Send' : 'Resend'}
          </Button>
        )
      }
      columns={[
        { label: 'Proposal', render: (r) => <><p className="font-medium text-white">{r.title}</p><p className="font-mono text-xs text-slate-500">{r.number}</p></> },
        { label: 'Client / lead', render: (r) => r.client?.name || r.lead?.fullName || '—' },
        { label: 'Total', render: (r) => fmtMoney(r.total, r.currency) },
        { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        { label: 'Valid until', render: (r) => fmtDate(r.validUntil) },
        { label: 'Response', render: (r) => <span className="text-xs text-slate-400">{r.respondedAt ? `${fmtDate(r.respondedAt)}${r.responseNote ? ` — “${r.responseNote}”` : ''}` : r.viewedAt ? `Viewed ${fmtDate(r.viewedAt)}` : '—'}</span> },
      ]}
    />
  );
}

// ---------------- Invoices ----------------
const INVOICE_STATUSES = ['Draft', 'Pending', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'];
const INVOICE_FIELDS = [
  { name: 'client', label: 'Client', type: 'ref', ref: { endpoint: '/clients' }, required: true },
  { name: 'project', label: 'Project', type: 'ref', ref: { endpoint: '/projects' } },
  { name: 'currency', label: 'Currency', type: 'select', options: ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'BDT'], default: 'USD', required: true },
  { name: 'taxRate', label: 'Tax %', type: 'number', default: 0 },
  { name: 'issueDate', label: 'Issue date', type: 'date' },
  { name: 'dueDate', label: 'Due date', type: 'date', required: true },
  { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Pending', 'Cancelled'], default: 'Pending', hint: 'Paid/Overdue are set automatically from payments & due date.' },
  { name: 'paymentLink', label: 'Payment link', placeholder: 'Stripe/PayPal link (Phase 2 gateway)' },
  { name: 'items', label: 'Line items', type: 'items' },
  { name: 'notes', label: 'Notes', type: 'textarea', rows: 2 },
];

export function Invoices() {
  const [params] = useSearchParams();
  const [paying, setPaying] = useState(null);
  const [version, setVersion] = useState(0);
  return (
    <>
      <Resource
        key={version}
        endpoint="/invoices"
        title="Invoices"
        createLabel="New invoice"
        fields={INVOICE_FIELDS}
        params={params.get('status') ? { status: params.get('status') } : {}}
        filters={[{ name: 'status', label: 'All statuses', options: INVOICE_STATUSES }]}
        rowActions={(r, reload) => (
          <>
            {r.status === 'Draft' && <Button size="sm" variant="ghost" onClick={async () => { await api.post(`/invoices/${r._id}/send`); reload(); }}><Send className="h-3.5 w-3.5" /> Issue</Button>}
            {!['Paid', 'Cancelled', 'Draft'].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => setPaying(r)}><DollarSign className="h-3.5 w-3.5" /> Record payment</Button>}
          </>
        )}
        columns={[
          { label: 'Invoice', render: (r) => <span className="font-mono text-white">{r.number}</span> },
          { label: 'Client', render: (r) => <><p className="text-slate-200">{r.client?.name}</p><p className="text-xs text-slate-500">{r.project?.name}</p></> },
          { label: 'Total', render: (r) => fmtMoney(r.total, r.currency) },
          { label: 'Paid', render: (r) => <span className="text-emerald-300">{fmtMoney(r.amountPaid, r.currency)}</span> },
          { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { label: 'Due', render: (r) => fmtDate(r.dueDate) },
        ]}
      />
      <Modal open={!!paying} onClose={() => setPaying(null)} title={`Record payment — ${paying?.number}`}>
        {paying && (
          <>
            <p className="mb-4 text-sm text-slate-400">Balance due: <span className="text-white">{fmtMoney(paying.total - paying.amountPaid, paying.currency)}</span></p>
            <ResourceForm
              fields={[{ name: 'amount', label: 'Amount', type: 'number', required: true }, { name: 'method', label: 'Method', type: 'select', options: ['Bank Transfer', 'Card', 'PayPal', 'Stripe', 'Wise', 'Payoneer', 'Cash', 'Other'], default: 'Bank Transfer' }, { name: 'reference', label: 'Reference' }, { name: 'paidAt', label: 'Paid on', type: 'date' }]}
              initial={{ amount: paying.total - paying.amountPaid, method: 'Bank Transfer', paidAt: new Date() }}
              onCancel={() => setPaying(null)}
              onSubmit={async (b) => { await api.post(`/invoices/${paying._id}/payments`, b); setPaying(null); setVersion((v) => v + 1); }}
              submitLabel="Save payment"
            />
          </>
        )}
      </Modal>
    </>
  );
}

