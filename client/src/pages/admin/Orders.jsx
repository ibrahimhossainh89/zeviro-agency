import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, FolderPlus, Search, Send, Truck } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, Modal, PageHeader, PageLoader, ErrorBox, SuccessBox, Empty, Pagination, Field, Input, Textarea, Select } from '../../components/ui';
import { useFetch, fmtDate, fmtDateTime, fmtMoney, timeAgo, cn, toInputDate } from '../../lib/utils';
import { useSocketEvent } from '../../lib/realtime';
import { ORDER_TONE } from '../portal/Orders';
import OrderReviews from './OrderReviews';

const STATUSES = ['Awaiting Quote', 'Pending Payment', 'In Progress', 'Delivered', 'Revision Requested', 'Completed', 'Cancelled'];

export function Orders() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState(() => params.get('status') || '');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useFetch('/orders', { status: status || undefined, q: q || undefined, page, limit: 20 });
  useSocketEvent('order:new', reload);
  useSocketEvent('order:update', reload);
  useSocketEvent('order:read', reload);
  const counts = data?.counts || {};
  const open = (counts['Awaiting Quote'] || 0) + (counts['Pending Payment'] || 0) + (counts['In Progress'] || 0) + (counts['Revision Requested'] || 0);
  return (
    <div>
      <PageHeader title="Orders" subtitle={`${open} open order${open === 1 ? '' : 's'} · placed by clients from service packages`} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {['', ...STATUSES].map((s) => (
            <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={cn('rounded-full border px-3 py-1.5 text-xs transition', status === s ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:text-white')}>
              {s || 'All'}{s && counts[s] ? <span className="ml-1.5 text-slate-500">{counts[s]}</span> : null}
            </button>
          ))}
        </div>
        <div className="relative lg:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input className="input pl-9" placeholder="Order #, service…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></div>
      </div>
      {loading && !data ? <PageLoader /> : !data?.items?.length ? <Empty title="No orders here yet" text="Orders appear here as soon as a client orders a service package." /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-ink-600/60 text-left text-xs uppercase tracking-wide text-slate-500"><th className="p-4">Order</th><th>Client</th><th>Service</th><th>Total</th><th>Status</th><th>Due</th><th>Placed</th></tr></thead>
            <tbody className="divide-y divide-ink-700/60">
              {data.items.map((o) => (
                <tr key={o._id} className={cn('hover:bg-ink-700/30', o.unread && 'bg-brand-500/5')}>
                  <td className="p-4"><Link to={`/admin/orders/${o._id}`} className="flex items-center gap-2 font-mono text-xs text-brand-300 hover:underline">{o.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-fuchsia-400" title="New activity" />}{o.number}</Link></td>
                  <td><p className="text-white">{o.client?.name}</p><p className="text-xs text-slate-500">{o.placedBy?.email}</p></td>
                  <td><p className="text-slate-200">{o.serviceTitle}</p><p className="text-xs text-slate-500">{o.packageName}</p></td>
                  <td className="text-white">{o.price ? fmtMoney(o.price, o.currency) : '—'}</td>
                  <td><Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge></td>
                  <td className="text-xs text-slate-400">{o.dueDate ? fmtDate(o.dueDate) : '—'}</td>
                  <td className="text-xs text-slate-500">{timeAgo(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data?.pages > 1 && <Pagination page={page} pages={data.pages} onChange={setPage} />}
    </div>
  );
}

function ActionModal({ open, onClose, title, children }) {
  return <Modal open={open} onClose={onClose} title={title}>{children}</Modal>;
}

export function OrderDetail() {
  const { id } = useParams();
  const { data: o, loading, error, reload, setData } = useFetch(`/orders/${id}`);
  const staff = useFetch('/staff');
  const [modal, setModal] = useState('');
  const [form, setForm] = useState({});
  const [state, setState] = useState({ loading: false, error: '', ok: '' });
  useSocketEvent('order:update', (d) => String(d.orderId) === id && reload());
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;

  const run = async (fn, ok) => {
    setState({ loading: true, error: '', ok: '' });
    try {
      const d = await fn();
      setData(d);
      setModal('');
      setForm({});
      setState({ loading: false, error: '', ok });
    } catch (e) {
      setState({ loading: false, error: errMsg(e), ok: '' });
    }
  };
  const staffOptions = (staff.data || []).map((u) => ({ value: u._id, label: `${u.name}${u.title ? ` — ${u.title}` : ''}` }));

  return (
    <div className="space-y-6">
      <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <SuccessBox>{state.ok}</SuccessBox>
      {!modal && <ErrorBox>{state.error}</ErrorBox>}
      <div className="card flex flex-col justify-between gap-4 p-6 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-slate-500">{o.number}</span><Badge tone={ORDER_TONE[o.status]}>{o.status}</Badge><Badge tone={o.paymentStatus === 'Paid' ? 'green' : 'gray'}>{o.paymentStatus}</Badge></div>
          <h1 className="mt-2 text-2xl font-semibold">{o.serviceTitle} <span className="text-slate-400">· {o.packageName}</span></h1>
          <p className="text-sm text-slate-400">Placed {fmtDateTime(o.createdAt)} by {o.placedBy?.name} ({o.placedBy?.email})</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {o.status === 'Awaiting Quote' && <Button onClick={() => setModal('quote')}><Send className="h-4 w-4" /> Send price</Button>}
          {o.status === 'Pending Payment' && <Button onClick={() => setModal('paid')}><CreditCard className="h-4 w-4" /> Mark as paid</Button>}
          {['In Progress', 'Revision Requested'].includes(o.status) && <Button onClick={() => setModal('deliver')}><Truck className="h-4 w-4" /> Deliver order</Button>}
          {!o.project && o.paymentStatus === 'Paid' && <Button variant="ghost" loading={state.loading && modal === ''} onClick={() => run(() => api.post(`/orders/${o._id}/project`), 'Project created and shared with the client.')}><FolderPlus className="h-4 w-4" /> Create project</Button>}
          <Button variant="ghost" onClick={() => { setForm({ status: o.status, note: '' }); setModal('status'); }}>Change status</Button>
        </div>
      </div>

      <OrderReviews key={o.status} order={o} />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-3 font-semibold">Client requirements</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{o.requirements}</p>
            {o.referenceLinks?.length > 0 && <ul className="mt-4 space-y-1.5">{o.referenceLinks.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-sm text-brand-300 hover:underline">{l} <ExternalLink className="h-3.5 w-3.5" /></a></li>)}</ul>}
            {o.preferredDeadline && <p className="mt-4 text-sm text-slate-400">Client's preferred deadline: <span className="text-white">{fmtDate(o.preferredDeadline)}</span></p>}
          </div>
          <div className="card p-6">
            <h2 className="mb-4 font-semibold">Timeline</h2>
            <ol className="relative space-y-5 border-l border-ink-600 pl-5">
              {[...o.timeline].reverse().map((t) => (
                <li key={t._id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-ink-900 bg-brand-500" />
                  <p className="text-sm font-medium text-white">{t.status}</p>
                  {t.note && <p className="whitespace-pre-line text-sm text-slate-400">{t.note}</p>}
                  <p className="text-xs text-slate-500">{fmtDateTime(t.at)}{t.by?.name ? ` · ${t.by.name}` : ''}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="card space-y-2.5 p-6 text-sm">
            <h2 className="mb-1 font-semibold">Summary</h2>
            <p className="flex justify-between"><span className="text-slate-500">Client</span><Link to={`/admin/clients/${o.client?._id}`} className="text-brand-300 hover:underline">{o.client?.name}</Link></p>
            <p className="flex justify-between"><span className="text-slate-500">Price</span><span className="text-white">{o.price ? fmtMoney(o.price, o.currency) : 'Price not sent yet'}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{o.deliveryDays ? `${o.deliveryDays} days` : '—'}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Revisions</span><span>{o.revisions || '—'}</span></p>
            <p className="flex justify-between"><span className="text-slate-500">Due date</span><span>{o.dueDate ? fmtDate(o.dueDate) : '—'}</span></p>
            {o.invoice && <p className="flex justify-between"><span className="text-slate-500">Invoice</span><Link to="/admin/invoices" className="text-brand-300 hover:underline">{o.invoice.number} · {o.invoice.status}</Link></p>}
            {o.project && <p className="flex justify-between"><span className="text-slate-500">Project</span><Link to={`/admin/projects/${o.project._id}`} className="text-brand-300 hover:underline">{o.project.name}</Link></p>}
          </div>
          <form
            className="card space-y-3 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(() => api.patch(`/orders/${o._id}`, { assignee: fd.get('assignee') || null, dueDate: fd.get('dueDate') || null, staffNotes: fd.get('staffNotes') }), 'Saved.');
            }}
          >
            <h2 className="font-semibold">Team only</h2>
            <Field label="Assigned to"><Select name="assignee" defaultValue={o.assignee?._id || ''} options={staffOptions} placeholder="— Unassigned —" /></Field>
            <Field label="Due date"><Input type="date" name="dueDate" defaultValue={toInputDate(o.dueDate)} /></Field>
            <Field label="Internal notes" hint="Never shown to the client"><Textarea name="staffNotes" rows={4} defaultValue={o.staffNotes || ''} /></Field>
            <Button type="submit" variant="ghost" className="w-full">Save</Button>
          </form>
        </aside>
      </div>

      <ActionModal open={modal === 'quote'} onClose={() => setModal('')} title="Send price to client">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/orders/${o._id}/quote`, { price: Number(form.price), deliveryDays: form.deliveryDays ? Number(form.deliveryDays) : undefined, note: form.note }), 'Price sent — the client can now pay.'); }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (USD)"><Input type="number" min="1" step="0.01" required value={form.price || ''} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label="Delivery (days)"><Input type="number" min="1" value={form.deliveryDays || ''} onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })} /></Field>
          </div>
          <Field label="Message to client"><Textarea rows={4} value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <ErrorBox>{state.error}</ErrorBox>
          <Button type="submit" loading={state.loading} className="w-full">Send price & create invoice</Button>
        </form>
      </ActionModal>

      <ActionModal open={modal === 'paid'} onClose={() => setModal('')} title="Record payment">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => api.post(`/orders/${o._id}/mark-paid`, form), 'Payment recorded — the order is now in progress.'); }}>
          <Field label="Method"><Select value={form.method || 'Bank Transfer'} onChange={(e) => setForm({ ...form, method: e.target.value })} options={['Bank Transfer', 'Payoneer', 'Wise', 'PayPal', 'Stripe', 'bKash', 'Other']} /></Field>
          <Field label="Reference / transaction ID"><Input value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          <ErrorBox>{state.error}</ErrorBox>
          <Button type="submit" loading={state.loading} className="w-full"><CheckCircle2 className="h-4 w-4" /> Confirm payment of {fmtMoney(o.invoice?.total ?? o.price, o.currency)}</Button>
        </form>
      </ActionModal>

      <ActionModal open={modal === 'deliver'} onClose={() => setModal('')} title="Deliver order">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => api.patch(`/orders/${o._id}`, { status: 'Delivered', deliveryNote: form.deliveryNote }), 'Delivered — the client has been notified.'); }}>
          <p className="text-sm text-slate-400">Upload the delivery files to the client's Files first (Media & Files or the project), then add a short delivery message.</p>
          <Field label="Delivery message"><Textarea rows={6} required value={form.deliveryNote || ''} onChange={(e) => setForm({ ...form, deliveryNote: e.target.value })} placeholder="Hi! Your 500 verified leads are ready in the shared Google Sheet…" /></Field>
          <ErrorBox>{state.error}</ErrorBox>
          <Button type="submit" loading={state.loading} className="w-full"><Truck className="h-4 w-4" /> Deliver</Button>
        </form>
      </ActionModal>

      <ActionModal open={modal === 'status'} onClose={() => setModal('')} title="Change status">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(() => api.patch(`/orders/${o._id}`, { status: form.status, note: form.note }), 'Status updated.'); }}>
          <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES} /></Field>
          <Field label="Note (visible to the client)"><Textarea rows={3} value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <ErrorBox>{state.error}</ErrorBox>
          <Button type="submit" loading={state.loading} className="w-full">Update</Button>
        </form>
      </ActionModal>
    </div>
  );
}
