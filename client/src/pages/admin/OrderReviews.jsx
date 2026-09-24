import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Star, UserCheck } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, ErrorBox, Field, Textarea } from '../../components/ui';
import { useFetch, fmtDate } from '../../lib/utils';
import { useSocketEvent } from '../../lib/realtime';
import { useAuth } from '../../context/AuthContext';
import { StarInput, StarRow, RATING_KEYS, CLIENT_RATING_KEYS } from '../../components/Stars';

const REVIEW_STATUS = { pending: ['amber', 'Waiting for approval'], published: ['green', 'Published'], trashed: ['red', 'In trash'] };

function ClientRatingForm({ orderId, initial, onSaved, onCancel }) {
  const [f, setF] = useState(() => (initial ? { ...initial.ratings, body: initial.body } : { communication: 0, requirements: 0, again: 0, body: '' }));
  const [state, setState] = useState({ loading: false, error: '' });
  const ready = f.communication && f.requirements && f.again && f.body.trim().length >= 10;
  const submit = async (e) => {
    e.preventDefault();
    setState({ loading: true, error: '' });
    try {
      await api.put(`/orders/${orderId}/client-rating`, { communication: f.communication, requirements: f.requirements, again: f.again, body: f.body.trim() });
      onSaved();
    } catch (err) {
      setState({ loading: false, error: errMsg(err) });
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2.5">
        {CLIENT_RATING_KEYS.map(([k, label]) => (
          <div key={k} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-slate-200">{label}</span>
            <StarInput value={f[k]} onChange={(n) => setF({ ...f, [k]: n })} label={label} size="h-6 w-6" />
          </div>
        ))}
      </div>
      <Field label="Your review of the client"><Textarea rows={3} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} placeholder="Clear brief, quick replies, a pleasure to work with…" /></Field>
      <ErrorBox>{state.error}</ErrorBox>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={state.loading} disabled={!ready}>{initial ? 'Save changes' : 'Submit review'}</Button>
      </div>
    </form>
  );
}

/** Both reviews for one order: the client's review of Zeviro and Zeviro's review of the client. */
export default function OrderReviews({ order }) {
  const { user } = useAuth();
  const { data, reload } = useFetch(`/orders/${order._id}/reviews`);
  const [editing, setEditing] = useState(false);
  useSocketEvent('review:update', reload);
  useSocketEvent('review:new', reload);
  if (!data || (order.status !== 'Completed' && !data.mine && !data.theirs)) return null;
  const { theirs, mine } = data;
  const canWrite = ['superadmin', 'admin'].includes(user?.role);
  const [tone, label] = theirs ? REVIEW_STATUS[theirs.status] || REVIEW_STATUS.pending : [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-amber-400" /> Client's review</h2>
          {theirs && <Badge tone={tone}>{label}</Badge>}
        </div>
        {theirs ? (
          <>
            <div className="flex items-center gap-2"><StarRow value={theirs.overall} /><span className="text-sm font-semibold text-white">{theirs.overall?.toFixed(1)}</span></div>
            <div className="mt-2 space-y-1 text-xs text-slate-400">{RATING_KEYS.map(([k, l]) => <p key={k} className="flex items-center justify-between">{l} <StarRow value={theirs.ratings?.[k]} className="h-3 w-3" /></p>)}</div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-200">“{theirs.body}”</p>
            <p className="mt-2 text-xs text-slate-500">{fmtDate(theirs.createdAt)} · <Link to="/admin/reviews" className="text-brand-300 hover:underline">Manage in Reviews</Link></p>
          </>
        ) : <p className="text-sm text-slate-500">The client hasn't reviewed this order yet.</p>}
      </div>

      <div className="card border-brand-500/30 p-6">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold"><UserCheck className="h-4 w-4 text-brand-300" /> Your review of the client</h2>
          {mine && data.canEdit && !editing && <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
        </div>
        {mine && !editing ? (
          <>
            <div className="flex items-center gap-2"><StarRow value={mine.overall} /><span className="text-sm font-semibold text-white">{mine.overall?.toFixed(1)}</span></div>
            <div className="mt-2 space-y-1 text-xs text-slate-400">{CLIENT_RATING_KEYS.map(([k, l]) => <p key={k} className="flex items-center justify-between">{l} <StarRow value={mine.ratings?.[k]} className="h-3 w-3" /></p>)}</div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-200">“{mine.body}”</p>
            <p className="mt-2 text-xs text-slate-500">{fmtDate(mine.createdAt)}{mine.by?.name ? ` · by ${mine.by.name}` : ''}{mine.editedAt ? ` · edited ${fmtDate(mine.editedAt)}` : ''} · visible to the client</p>
          </>
        ) : mine && editing ? (
          <ClientRatingForm orderId={order._id} initial={mine} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />
        ) : order.status !== 'Completed' ? (
          <p className="text-sm text-slate-500">You can review the client once the order is completed.</p>
        ) : canWrite ? (
          <>
            <p className="mb-4 text-sm text-slate-400">Rate this client for this order. They'll see it on their order page.</p>
            <ClientRatingForm orderId={order._id} onSaved={reload} />
          </>
        ) : <p className="text-sm text-slate-500">Not reviewed yet — an administrator can leave a review.</p>}
      </div>
    </div>
  );
}
