import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, CreditCard, ExternalLink, FolderKanban, MessageSquare, Package, Receipt, RefreshCcw, ShoppingBag, XCircle } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, Modal, PageHeader, PageLoader, ErrorBox, SuccessBox, Empty, Textarea, Field, Markdown } from '../../components/ui';
import { useFetch, fmtDate, fmtDateTime, fmtMoney, timeAgo, cn } from '../../lib/utils';
import { useSocketEvent } from '../../lib/realtime';
import { StarInput, StarRow, RATING_KEYS, CLIENT_RATING_KEYS } from '../../components/Stars';

// What clients see for each status
export const ORDER_LABEL = { 'Awaiting Quote': 'Price requested' };
export const ORDER_TONE = {
  'Awaiting Quote': 'blue',
  'Pending Payment': 'amber',
  'In Progress': 'violet',
  Delivered: 'pink',
  'Revision Requested': 'amber',
  Completed: 'green',
  Cancelled: 'gray',
};

const STEPS = ['Placed', 'Paid', 'In progress', 'Delivered', 'Completed'];
function stepIndex(o) {
  if (o.status === 'Completed') return 4;
  if (o.status === 'Delivered') return 3;
  if (['In Progress', 'Revision Requested'].includes(o.status)) return 2;
  return 0;
}

export function Orders() {
  const { data, loading, error, reload } = useFetch('/portal/orders');
  useSocketEvent('order:update', reload);
  return (
    <div>
      <PageHeader title="My Orders" subtitle="Everything you've ordered from Zeviro" actions={<Button to="/services" variant="primary"><ShoppingBag className="h-4 w-4" /> Order a service</Button>} />
      {loading ? <PageLoader /> : error ? <ErrorBox>{error}</ErrorBox> : !data?.length ? (
        <Empty icon={Package} title="No orders yet" text="Choose a service and package to place your first order." action={<Button to="/services">Browse services</Button>} />
      ) : (
        <div className="grid gap-4">
          {data.map((o) => (
            <Link key={o._id} to={`/portal/orders/${o._id}`} className="card card-hover flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {o.unread && <span className="h-2 w-2 rounded-full bg-fuchsia-400" title="New update" />}
                  <span className="font-mono text-xs text-slate-500">{o.number}</span>
                  <Badge tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status] || o.status}</Badge>
                </div>
                <p className="mt-1 truncate font-semibold text-white">{o.serviceTitle}</p>
                <p className="text-sm text-slate-400">{o.packageName}{o.packageTitle && o.packageTitle !== o.packageName ? ` · ${o.packageTitle}` : ''} · ordered {timeAgo(o.createdAt)}</p>
              </div>
              <div className="flex items-center gap-6 sm:text-right">
                {o.dueDate && !['Completed', 'Cancelled'].includes(o.status) && <div><p className="text-xs text-slate-500">Due</p><p className="text-sm text-slate-200">{fmtDate(o.dueDate)}</p></div>}
                <div><p className="text-xs text-slate-500">Total</p><p className="font-display text-lg font-semibold text-white">{o.price ? fmtMoney(o.price, o.currency) : 'Price pending'}</p></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PayBox({ order, onDone }) {
  const [state, setState] = useState({ loading: false, error: '', manual: null, unavailable: false });
  const pay = async () => {
    setState({ loading: true, error: '', manual: null, unavailable: false });
    try {
      const r = await api.post(`/portal/orders/${order._id}/pay`);
      if (r.mode === 'redirect') window.location.href = r.url;
      else if (r.mode === 'manual') setState({ loading: false, error: '', manual: r, unavailable: false });
      else setState({ loading: false, error: '', manual: null, unavailable: true });
    } catch (e) {
      setState({ loading: false, error: errMsg(e), manual: null, unavailable: false });
    }
  };
  return (
    <div className="card border-amber-500/40 bg-amber-500/5 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white"><CreditCard className="h-5 w-5 text-amber-400" /> Payment required to start</h3>
          <p className="mt-1 text-sm text-slate-400">Invoice {order.invoice?.number} · {fmtMoney(order.invoice?.total ?? order.price, order.currency)}{order.invoice?.dueDate ? ` · due ${fmtDate(order.invoice.dueDate)}` : ''}</p>
        </div>
        <div className="flex gap-2">
          {order.invoice && <Button variant="ghost" to={`/portal/invoices/${order.invoice._id}`}><Receipt className="h-4 w-4" /> Invoice</Button>}
          <Button onClick={pay} loading={state.loading}>Pay now</Button>
        </div>
      </div>
      <ErrorBox>{state.error}</ErrorBox>
      {state.unavailable && <p className="mt-4 rounded-xl border border-ink-600 bg-ink-800 p-4 text-sm text-slate-300">Online payment isn't switched on yet. Our team will send you a secure payment link for invoice {order.invoice?.number} shortly — or message us from this page.</p>}
      <Modal open={!!state.manual} onClose={() => setState((s) => ({ ...s, manual: null }))} title="How to pay">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Please pay <b className="text-white">{fmtMoney(state.manual?.invoice?.total, state.manual?.invoice?.currency)}</b> and use <b className="font-mono text-white">{state.manual?.invoice?.number}</b> as the payment reference.</p>
          <div className="rounded-xl border border-ink-600 bg-ink-900 p-4"><Markdown text={state.manual?.instructions || ''} /></div>
          <p className="text-xs text-slate-500">Once we confirm your payment the order starts automatically and you'll be notified.</p>
          <Button className="w-full" onClick={() => { setState((s) => ({ ...s, manual: null })); onDone?.(); }}>Done</Button>
        </div>
      </Modal>
    </div>
  );
}

/** Zeviro's review of the client for this order. */
function ZeviroReview({ r }) {
  return (
    <div className="card space-y-3 border-brand-500/30 bg-brand-500/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-white">Zeviro's review of you</h2>
        <span className="flex items-center gap-2"><StarRow value={r.overall} /><span className="text-sm font-semibold text-white">{r.overall?.toFixed(1)}</span></span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
        {CLIENT_RATING_KEYS.map(([k, l]) => <span key={k} className="flex items-center gap-1.5">{l} <StarRow value={r.ratings?.[k]} className="h-3 w-3" /></span>)}
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">“{r.body}”</p>
      <p className="text-xs text-slate-500">{fmtDate(r.createdAt)}</p>
    </div>
  );
}

function ReviewBox({ order, onDone }) {
  const [f, setF] = useState({ communication: 0, satisfaction: 0, value: 0, body: '' });
  const [state, setState] = useState({ loading: false, error: '' });
  const mine = order.myReview;
  if (mine) {
    const avg = Math.round(((mine.ratings.communication + mine.ratings.satisfaction + mine.ratings.value) / 3) * 10) / 10;
    return (
      <div className="card space-y-3 border-emerald-500/30 bg-emerald-500/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-white"><CheckCircle2 className="h-5 w-5 text-emerald-400" /> Your review</h2>
          <span className="flex items-center gap-2"><StarRow value={avg} /><span className="text-sm font-semibold text-white">{avg.toFixed(1)}</span></span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
          {RATING_KEYS.map(([k, l]) => <span key={k} className="flex items-center gap-1.5">{l} <StarRow value={mine.ratings[k]} className="h-3 w-3" /></span>)}
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">“{mine.body}”</p>
        <p className="text-xs text-slate-500">{fmtDate(mine.createdAt)}</p>
      </div>
    );
  }
  if (order.reviewedAt) {
    return (
      <div className="card flex gap-3 border-emerald-500/30 bg-emerald-500/5 p-5 text-sm text-slate-300">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        <p>Thank you for your review!</p>
      </div>
    );
  }
  const ready = f.communication && f.satisfaction && f.value && f.body.trim().length >= 10;
  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await api.post(`/portal/orders/${order._id}/review`, { ...f, body: f.body.trim() });
      onDone?.();
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };
  return (
    <form onSubmit={submit} className="card space-y-5 border-amber-500/30 bg-amber-500/5 p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">How did we do?</h2>
        <p className="mt-1 text-sm text-slate-400">Rate your experience with this order. Your review helps other clients and helps us improve.</p>
      </div>
      <div className="space-y-3">
        {RATING_KEYS.map(([k, label]) => (
          <div key={k} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-slate-200">{label}</span>
            <StarInput value={f[k]} onChange={(n) => setF({ ...f, [k]: n })} label={label} />
          </div>
        ))}
      </div>
      <Field label="Your review"><Textarea rows={4} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="What went well? Would you recommend Zeviro?" /></Field>
      <ErrorBox>{state.error}</ErrorBox>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">One review per order — once submitted it can't be edited or removed.</p>
        <Button type="submit" loading={state.loading} disabled={!ready}>Submit review</Button>
      </div>
    </form>
  );
}

export function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: o, loading, error, reload } = useFetch(`/portal/orders/${id}`);
  const [revision, setRevision] = useState({ open: false, note: '', loading: false, error: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  useSocketEvent('order:update', (d) => String(d.orderId) === id && reload());
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;

  const act = async (path, body, okText) => {
    setBusy(path);
    try {
      await api.post(`/portal/orders/${o._id}/${path}`, body);
      setMsg(okText);
      reload();
    } catch (e) {
      setMsg(errMsg(e));
    } finally {
      setBusy('');
    }
  };
  const step = stepIndex(o);
  const cancelled = o.status === 'Cancelled';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/portal/orders" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> My orders</Link>
      {params.get('new') && <SuccessBox>Order {o.number} placed! {o.status === 'Pending Payment' ? 'Complete the payment below to start the work.' : 'We will review your requirements and send you a fixed price soon.'}</SuccessBox>}
      {msg && <SuccessBox>{msg}</SuccessBox>}

      <div className="card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-slate-500">{o.number}</span><Badge tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status] || o.status}</Badge></div>
            <h1 className="mt-2 text-2xl font-semibold">{o.serviceTitle}</h1>
            <p className="text-slate-400">{o.packageName}{o.packageTitle && o.packageTitle !== o.packageName ? ` · ${o.packageTitle}` : ''}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-3xl font-semibold text-white">{o.price ? fmtMoney(o.price, o.currency) : 'Price pending'}</p>
            <p className="text-sm text-slate-500">Ordered {fmtDateTime(o.createdAt)}</p>
          </div>
        </div>
        {!cancelled && (
          <ol className="mt-8 grid grid-cols-5 gap-2">
            {STEPS.map((s, i) => {
              const done = i === 0 || (i === 1 ? o.paymentStatus === 'Paid' : step >= i);
              return (
                <li key={s} className="text-center">
                  <div className={cn('mx-auto h-1.5 rounded-full', done ? 'bg-brand-gradient' : 'bg-ink-600')} />
                  <p className={cn('mt-2 text-[11px] sm:text-xs', done ? 'text-white' : 'text-slate-500')}>{s}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {o.status === 'Pending Payment' && <PayBox order={o} onDone={reload} />}
      {o.status === 'Awaiting Quote' && (
        <div className="card flex gap-3 border-blue-500/30 bg-blue-500/5 p-5 text-sm text-slate-300"><Clock className="h-5 w-5 shrink-0 text-blue-400" /> We're reviewing your requirements and will send a fixed price and delivery date here (usually within one business day).</div>
      )}
      {o.status === 'Delivered' && (
        <div className="card border-pink-500/30 bg-pink-500/5 p-6">
          <h3 className="flex items-center gap-2 font-semibold text-white"><Package className="h-5 w-5 text-pink-400" /> Your order has been delivered</h3>
          {o.deliveryNote && <p className="mt-3 whitespace-pre-line text-sm text-slate-300">{o.deliveryNote}</p>}
          <p className="mt-2 text-sm text-slate-400">Delivery files are in <Link to="/portal/files" className="text-brand-300 underline">Files & Documents</Link>. Please review and accept, or request changes.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={busy === 'accept'} onClick={() => act('accept', {}, 'Thank you! The order is now complete.')}><CheckCircle2 className="h-4 w-4" /> Accept delivery</Button>
            <Button variant="ghost" onClick={() => setRevision({ ...revision, open: true })}><RefreshCcw className="h-4 w-4" /> Request revision</Button>
          </div>
        </div>
      )}

      {o.status === 'Completed' && <ReviewBox order={o} onDone={reload} />}
      {o.zeviroReview && <ZeviroReview r={o.zeviroReview} />}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-3 font-semibold">Your requirements</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-300">{o.requirements}</p>
            {o.referenceLinks?.length > 0 && (
              <ul className="mt-4 space-y-1.5">{o.referenceLinks.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-sm text-brand-300 hover:underline">{l} <ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></li>)}</ul>
            )}
            {o.preferredDeadline && <p className="mt-4 text-sm text-slate-400">Preferred deadline: <span className="text-slate-200">{fmtDate(o.preferredDeadline)}</span></p>}
          </div>
          <div className="card p-6">
            <h2 className="mb-4 font-semibold">Activity</h2>
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
          <div className="card space-y-3 p-6 text-sm">
            <h2 className="font-semibold">Details</h2>
            {o.deliveryDays ? <p className="flex justify-between"><span className="text-slate-500">Delivery</span><span>{o.deliveryDays} days</span></p> : null}
            {o.revisions ? <p className="flex justify-between"><span className="text-slate-500">Revisions</span><span>{o.revisions}</span></p> : null}
            <p className="flex justify-between"><span className="text-slate-500">Payment</span><span>{o.paymentStatus}</span></p>
            {o.dueDate && <p className="flex justify-between"><span className="text-slate-500">Due date</span><span>{fmtDate(o.dueDate)}</span></p>}
            {o.features?.length > 0 && <ul className="space-y-1.5 border-t border-ink-600/60 pt-3">{o.features.map((f) => <li key={f} className="flex gap-2 text-slate-300"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{f}</li>)}</ul>}
          </div>
          <div className="card space-y-2 p-4">
            {o.invoice && <Link to={`/portal/invoices/${o.invoice._id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-ink-700/60"><Receipt className="h-4 w-4 text-brand-300" /> Invoice {o.invoice.number}</Link>}
            {o.project && <Link to={`/portal/projects/${o.project._id}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-ink-700/60"><FolderKanban className="h-4 w-4 text-brand-300" /> Project: {o.project.name}</Link>}
            <Link to="/portal/messages" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-ink-700/60"><MessageSquare className="h-4 w-4 text-brand-300" /> Message the team</Link>
          </div>
          {['Awaiting Quote', 'Pending Payment'].includes(o.status) && (
            <Button variant="ghost" className="w-full" loading={busy === 'cancel'} onClick={() => window.confirm('Cancel this order?') && act('cancel', {}, 'Order cancelled.')}><XCircle className="h-4 w-4" /> Cancel order</Button>
          )}
        </aside>
      </div>

      <Modal open={revision.open} onClose={() => setRevision({ ...revision, open: false })} title="Request a revision">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setRevision({ ...revision, loading: true, error: '' });
            try {
              await api.post(`/portal/orders/${o._id}/revision`, { note: revision.note });
              setRevision({ open: false, note: '', loading: false, error: '' });
              setMsg('Revision requested — the team has been notified.');
              reload();
            } catch (err) {
              setRevision({ ...revision, loading: false, error: errMsg(err) });
            }
          }}
        >
          <Field label="What should we change?"><Textarea rows={5} required value={revision.note} onChange={(e) => setRevision({ ...revision, note: e.target.value })} /></Field>
          <ErrorBox>{revision.error}</ErrorBox>
          <Button type="submit" loading={revision.loading} className="w-full">Send revision request</Button>
        </form>
      </Modal>
    </div>
  );
}
