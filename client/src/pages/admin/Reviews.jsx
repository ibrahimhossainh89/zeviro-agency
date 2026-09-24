import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Trash2, XCircle, ExternalLink, Pencil, RotateCcw, Clock } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, PageHeader, PageLoader, Empty, Pagination, ErrorBox, Avatar, Modal, Field, Textarea } from '../../components/ui';
import { useFetch, fmtDateTime, fmtDate, cn } from '../../lib/utils';
import { useSocketEvent } from '../../lib/realtime';
import { useAuth } from '../../context/AuthContext';
import { StarRow, StarInput, RATING_KEYS } from '../../components/Stars';

const STATUS = {
  pending: ['amber', 'Waiting for approval'],
  published: ['green', 'Published'],
  trashed: ['red', 'In trash'],
};

function daysLeft(trashedAt, total) {
  const left = Math.ceil(total - (Date.now() - new Date(trashedAt).getTime()) / 864e5);
  return Math.max(0, left);
}

/** Super admin only: change the stars and the text that are shown publicly. */
function EditReview({ review, onClose, onSaved }) {
  const [f, setF] = useState(() => ({ ...review.ratings, body: review.body }));
  const [state, setState] = useState({ loading: false, error: '' });
  const orig = review.original;
  const changed = orig && (orig.body !== review.body || RATING_KEYS.some(([k]) => orig.ratings?.[k] !== review.ratings?.[k]));
  const save = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await api.patch(`/reviews/${review._id}`, { communication: f.communication, satisfaction: f.satisfaction, value: f.value, body: f.body.trim() });
      onSaved();
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };
  return (
    <Modal open onClose={onClose} title={`Edit review — ${review.reviewerName}`} wide>
      <form onSubmit={save} className="space-y-5">
        <p className="text-sm text-slate-400">Your edited version is what visitors see on the website. The client still only sees the review they wrote.</p>
        <div className="space-y-3">
          {RATING_KEYS.map(([k, label]) => (
            <div key={k} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium text-slate-200">{label}</span>
              <StarInput value={f[k]} onChange={(n) => setF({ ...f, [k]: n })} label={label} />
            </div>
          ))}
          <button type="button" onClick={() => setF({ ...f, communication: 5, satisfaction: 5, value: 5 })} className="text-xs text-brand-300 hover:underline">Set all to 5 stars</button>
        </div>
        <Field label="Review text"><Textarea rows={5} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
        {changed && (
          <div className="rounded-xl border border-ink-600 bg-ink-800/60 p-4 text-xs text-slate-400">
            <p className="mb-2 font-semibold uppercase tracking-wider text-slate-500">Client's original</p>
            <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1">{RATING_KEYS.map(([k, l]) => <span key={k} className="flex items-center gap-1.5">{l}: <StarRow value={orig.ratings?.[k]} className="h-3 w-3" /></span>)}</div>
            <p className="whitespace-pre-line">“{orig.body}”</p>
          </div>
        )}
        <ErrorBox>{state.error}</ErrorBox>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={state.loading} disabled={!f.communication || !f.satisfaction || !f.value || f.body.trim().length < 10}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Reviews() {
  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const { data, loading, refresh } = useFetch('/reviews', { status, page, limit: 20 });
  const [busy, setBusy] = useState('');
  const [armed, setArmed] = useState('');
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  useSocketEvent('review:new', refresh);
  useSocketEvent('review:update', refresh);
  const trashDays = data?.trashDays || 30;

  const act = async (id, fn) => {
    setBusy(id);
    setArmed('');
    setError('');
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const tabs = [
    ['pending', 'Waiting for approval', data?.pending],
    ['published', 'Published', data?.published],
    ['trashed', 'Trash', data?.trashed],
  ];

  return (
    <div>
      <PageHeader title="Client reviews" subtitle="Reviews wait here until you publish them — 5-star reviews (all three ratings) are published automatically. Rejected reviews go to the trash and are deleted for good after 30 days — the client is never told." />
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([v, l, n]) => (
          <button key={v} onClick={() => { setStatus(v); setPage(1); }} className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition', status === v ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:text-white')}>
            {v === 'trashed' && <Trash2 className="h-3.5 w-3.5" />}{l}{n != null ? ` · ${n}` : ''}
          </button>
        ))}
      </div>
      {status === 'trashed' && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800/60 px-4 py-3 text-sm text-slate-400">
          <Clock className="h-4 w-4 shrink-0" /> Reviews in the trash are hidden everywhere and permanently deleted {trashDays} days after they were rejected. Restore one to bring it back.
        </p>
      )}
      <ErrorBox>{error}</ErrorBox>
      {loading && !data ? <PageLoader /> : !data?.items?.length ? (
        <Empty title={status === 'pending' ? 'No reviews waiting' : status === 'trashed' ? 'Trash is empty' : 'No published reviews yet'} text={status === 'trashed' ? 'Rejected reviews will appear here.' : 'Clients can review an order once it is completed.'} />
      ) : (
        <div className="space-y-4">
          {data.items.map((r) => {
            const [tone, label] = STATUS[r.status] || STATUS.pending;
            return (
              <div key={r._id} className={cn('card p-5', r.status === 'pending' && 'border-amber-500/30', r.status === 'trashed' && 'opacity-80')}>
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={r.reviewerName || r.user?.name} src={r.user?.avatar} seed={r.user?._id} size="sm" />
                      <span className="font-semibold text-white">{r.reviewerName || r.user?.name}</span>
                      {r.user?.email && <span className="text-xs text-slate-500">{r.user.email}</span>}
                      {r.country && <span className="text-xs text-slate-500">· {r.country}</span>}
                      <Badge tone={tone}>{label}</Badge>
                      {r.autoPublished && <Badge tone="cyan">Auto-published · 5★</Badge>}
                      {r.editedAt && <Badge tone="violet">Edited{r.editedBy?.name ? ` by ${r.editedBy.name}` : ''}</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {r.serviceTitle} · {r.packageName}
                      {r.order?._id && <> · <Link to={`/admin/orders/${r.order._id}`} className="inline-flex items-center gap-1 font-mono text-xs text-brand-300 hover:underline">{r.order.number} <ExternalLink className="h-3 w-3" /></Link></>}
                    </p>
                    <div className="mt-3 flex items-center gap-2"><StarRow value={r.overall} className="h-5 w-5" /><span className="font-semibold text-white">{r.overall?.toFixed(1)}</span></div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                      {RATING_KEYS.map(([k, l]) => <span key={k} className="flex items-center gap-1.5">{l}: <StarRow value={r.ratings?.[k]} className="h-3 w-3" /></span>)}
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-200">“{r.body}”</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Review date {fmtDate(r.createdAt)}
                      {r.publishedAt && r.status === 'published' ? ` · published ${fmtDateTime(r.publishedAt)}` : ''}
                      {r.editedAt ? ` · edited ${fmtDateTime(r.editedAt)}` : ''}
                    </p>
                    {r.status === 'trashed' && r.trashedAt && (
                      <p className="mt-1 text-xs text-rose-300">Rejected {fmtDateTime(r.trashedAt)} · deletes permanently in {daysLeft(r.trashedAt, trashDays)} day{daysLeft(r.trashedAt, trashDays) === 1 ? '' : 's'}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
                    {r.status === 'pending' && (
                      <Button loading={busy === r._id} onClick={() => act(r._id, () => api.post(`/reviews/${r._id}/publish`))}><CheckCircle2 className="h-4 w-4" /> Publish</Button>
                    )}
                    {r.status !== 'trashed' && isSuper && (
                      <Button variant="ghost" onClick={() => setEditing(r)}><Pencil className="h-4 w-4" /> Edit</Button>
                    )}
                    {r.status !== 'trashed' && (
                      <Button variant="ghost" onClick={() => act(r._id, () => api.post(`/reviews/${r._id}/trash`))}>
                        {r.status === 'pending' ? <><XCircle className="h-4 w-4" /> Reject</> : <><Trash2 className="h-4 w-4" /> Remove</>}
                      </Button>
                    )}
                    {r.status === 'trashed' && (
                      <>
                        <Button variant="ghost" loading={busy === r._id} onClick={() => act(r._id, () => api.post(`/reviews/${r._id}/restore`))}><RotateCcw className="h-4 w-4" /> Restore</Button>
                        {isSuper && (armed === r._id ? (
                          <Button className="bg-rose-600 hover:bg-rose-500" onClick={() => act(r._id, () => api.del(`/reviews/${r._id}`))} onBlur={() => setArmed('')}><Trash2 className="h-4 w-4" /> Click again to delete</Button>
                        ) : (
                          <Button variant="ghost" className="text-rose-300" onClick={() => setArmed(r._id)}><Trash2 className="h-4 w-4" /> Delete forever</Button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data?.pages > 1 && <Pagination page={page} pages={data.pages} onChange={setPage} />}
      {editing && <EditReview review={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}
