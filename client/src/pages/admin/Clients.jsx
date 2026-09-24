import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UserPlus, Ban, CheckCircle2, Mail, Globe, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Resource, { ResourceForm } from '../../components/Resource';
import { Avatar, Badge, Button, Modal, PageLoader, ErrorBox, Progress, Empty, Input } from '../../components/ui';
import { StarRow } from '../../components/Stars';
import { CountUp } from '../../components/LiveStats';
import { api, errMsg } from '../../api/http';
import { useFetch, fmtDate, fmtMoney, fmtDateTime, timeAgo, INDUSTRIES, COUNTRIES } from '../../lib/utils';

export const CLIENT_FIELDS = [
  { name: 'name', label: 'Company name', required: true },
  { name: 'website', label: 'Website' },
  { name: 'industry', label: 'Industry', type: 'select', options: INDUSTRIES },
  { name: 'country', label: 'Country', type: 'select', options: COUNTRIES },
  { name: 'primaryContact.name', label: 'Primary contact name' },
  { name: 'primaryContact.email', label: 'Primary contact email', type: 'email' },
  { name: 'primaryContact.phone', label: 'Primary contact phone' },
  { name: 'accountManager', label: 'Account manager', type: 'ref', ref: { endpoint: '/staff', label: 'name' } },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'suspended', 'archived'], default: 'active', required: true },
  { name: 'address', label: 'Address', full: true },
  { name: 'notes', label: 'Internal notes', type: 'textarea' },
];

const LABELS = {
  users: 'portal users', orders: 'orders', invoices: 'invoices', proposals: 'proposals', projects: 'projects', tasks: 'tasks',
  files: 'files', folders: 'folders', messages: 'messages', tickets: 'support tickets', appointments: 'meetings',
  reviews: 'reviews (also removed from the website)', clientRatings: 'your reviews of this client', notifications: 'notifications',
};

/** Permanently delete a client and everything that belongs to them. The admin types the client name to confirm. */
function DeleteClientModal({ client, onClose, onDeleted }) {
  const { data, loading } = useFetch(`/clients/${client._id}/delete-preview`);
  const [typed, setTyped] = useState('');
  const [state, setState] = useState({ loading: false, error: '' });
  const match = typed.trim() === client.name.trim();
  const items = data ? Object.entries(data.counts).filter(([, n]) => n > 0) : [];
  const del = async () => {
    setState({ loading: true, error: '' });
    try {
      await api.del(`/clients/${client._id}?confirm=${encodeURIComponent(typed.trim())}`);
      onDeleted();
    } catch (e) {
      setState({ loading: false, error: errMsg(e) });
    }
  };
  return (
    <Modal open onClose={onClose} title="Delete client permanently">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <p>This deletes <b className="text-white">{client.name}</b> and all of their data for good. It can't be undone. To keep the records but block access, use <b>Suspend access</b> instead.</p>
        </div>
        {loading ? <p className="text-sm text-slate-500">Checking what will be deleted…</p> : (
          <div>
            <p className="mb-2 text-sm text-slate-300">This will also delete:</p>
            {items.length ? (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {items.map(([k, n]) => <li key={k} className="flex justify-between gap-2 text-slate-400"><span>{LABELS[k] || k}</span><span className="font-semibold text-white">{n}</span></li>)}
              </ul>
            ) : <p className="text-sm text-slate-500">Nothing else — this client has no data yet.</p>}
            {data?.counts?.orders > 0 && <p className="mt-2 text-xs text-amber-300">Their orders will also disappear from the revenue dashboard.</p>}
          </div>
        )}
        <label className="block text-sm text-slate-300">
          Type <b className="select-all text-white">{client.name}</b> to confirm
          <Input className="mt-1.5" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus placeholder="Client name" />
        </label>
        <ErrorBox>{state.error}</ErrorBox>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={!match || loading} loading={state.loading} onClick={del}><Trash2 className="h-4 w-4" /> Delete forever</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Clients() {
  const nav = useNavigate();
  const { user } = useAuth();
  const canDelete = ['superadmin', 'admin'].includes(user?.role);
  const [deleting, setDeleting] = useState(null); // { client, reload }
  return (
    <>
    <Resource
      endpoint="/clients"
      title="Clients"
      createLabel="New client"
      fields={CLIENT_FIELDS}
      filters={[{ name: 'status', label: 'All statuses', options: ['active', 'suspended', 'archived'] }, { name: 'industry', label: 'All industries', options: INDUSTRIES }]}
      onRowClick={(r) => nav(`/admin/clients/${r._id}`)}
      canDelete={false}
      rowActions={canDelete ? (row, reload) => (
        <button className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400" onClick={(e) => { e.stopPropagation(); setDeleting({ client: row, reload }); }} aria-label={`Delete ${row.name}`} title="Delete client">
          <Trash2 className="h-4 w-4" />
        </button>
      ) : undefined}
      columns={[
        { label: 'Client', render: (r) => <><p className="font-medium text-white">{r.name}</p><p className="text-xs text-slate-500">{r.website}</p></> },
        { label: 'Contact', render: (r) => <><p className="text-slate-300">{r.primaryContact?.name || '—'}</p><p className="text-xs text-slate-500">{r.primaryContact?.email}</p></> },
        { label: 'Industry', key: 'industry' },
        { label: 'Account manager', render: (r) => r.accountManager?.name || '—' },
        { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        { label: 'Since', render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.createdAt)}</span> },
      ]}
    />
    {deleting && <DeleteClientModal client={deleting.client} onClose={() => setDeleting(null)} onDeleted={() => { deleting.reload(); setDeleting(null); }} />}
    </>
  );
}

export function ClientDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch(`/clients/${id}/overview`);
  const [editing, setEditing] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [armedUser, setArmedUser] = useState('');
  const { user: me } = useAuth();
  const nav = useNavigate();
  const isAdmin = ['superadmin', 'admin'].includes(me?.role);
  const [err, setErr] = useState('');
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const { client, projects, invoices, proposals, users, tickets, messages, appointments, reviews = [], clientRating } = data;
  const outstanding = invoices.filter((i) => ['Pending', 'Overdue', 'Partially Paid'].includes(i.status)).reduce((s, i) => s + (i.total - i.amountPaid), 0);

  const setStatus = async (status) => {
    if (!window.confirm(status === 'suspended' ? 'Suspend this client? All portal users will lose access immediately.' : 'Reactivate this client?')) return;
    await api.patch(`/clients/${id}`, { status });
    reload();
  };
  const deleteUser = async (u) => {
    if (armedUser !== u._id) return setArmedUser(u._id); // first click arms, second click deletes
    setArmedUser('');
    try {
      await api.del(`/clients/${id}/users/${u._id}`);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  const toggleUser = async (u) => {
    try {
      await api.patch(`/clients/${id}/users/${u._id}`, { active: !u.active });
      reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/admin/clients" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Clients</Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{client.name}</h1><Badge>{client.status}</Badge></div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-400">
            {client.website && <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{client.website}</span>}
            {client.primaryContact?.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{client.primaryContact.name} · {client.primaryContact.email}</span>}
            {client.accountManager && <span>AM: {client.accountManager.name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          {isAdmin && <Button variant="ghost" size="sm" className="text-rose-400 hover:border-rose-500/60" onClick={() => setDeletingClient(true)}><Trash2 className="h-3.5 w-3.5" /> Delete client</Button>}
          {client.status === 'active' ? <Button variant="danger" size="sm" onClick={() => setStatus('suspended')}><Ban className="h-3.5 w-3.5" /> Suspend access</Button> : <Button size="sm" onClick={() => setStatus('active')}><CheckCircle2 className="h-3.5 w-3.5" /> Reactivate</Button>}
        </div>
      </div>
      <ErrorBox>{err}</ErrorBox>

      <div className="stagger grid gap-4 sm:grid-cols-4">
        {[['Projects', projects.length], ['Open tickets', tickets.filter((t) => !['Resolved', 'Closed'].includes(t.status)).length], ['Outstanding', fmtMoney(outstanding)], ['Portal users', users.length]].map(([l, v]) => (
          <div key={l} className="card spin-card glow-card p-4"><p className="text-xs uppercase text-slate-500">{l}</p><p className="mt-1 font-display text-2xl font-semibold text-white">{typeof v === 'number' ? <CountUp value={v} /> : v}</p></div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Projects</h2><Button size="sm" variant="ghost" to={`/admin/projects?client=${id}`}>Manage</Button></div>
          {projects.length === 0 ? <Empty title="No projects yet" /> : projects.map((p) => (
            <Link key={p._id} to={`/admin/projects/${p._id}`} className="mb-2 block rounded-xl border border-ink-600 p-3 hover:border-brand-500/50">
              <div className="flex justify-between"><span className="font-medium text-white">{p.name}</span><Badge>{p.status}</Badge></div>
              <Progress value={p.progress} className="mt-3" />
              <p className="mt-2 text-xs text-slate-500">{p.progress}% · deadline {fmtDate(p.deadline)}</p>
            </Link>
          ))}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Portal access</h2><Button size="sm" onClick={() => setAddingUser(true)}><UserPlus className="h-3.5 w-3.5" /> Add user</Button></div>
          {users.length === 0 ? <Empty title="No portal users" text="Give this client a secure login to the client portal." /> : (
            <ul className="space-y-2">
              {users.map((u) => (
                <li key={u._id} className="flex items-center justify-between rounded-xl border border-ink-600 p-3">
                  <div className="flex items-center gap-3"><Avatar name={u.name} src={u.avatar} seed={u._id} size="sm" /><div><p className="text-sm text-white">{u.name}</p><p className="text-xs text-slate-500">{u.email} · last login {u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'}</p></div></div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" variant={u.active ? 'danger' : 'ghost'} onClick={() => toggleUser(u)}>{u.active ? 'Revoke' : 'Restore'}</Button>
                    {isAdmin && (
                      <Button size="sm" variant={armedUser === u._id ? 'danger' : 'ghost'} onClick={() => deleteUser(u)} onBlur={() => setArmedUser('')} title="Delete this login permanently" aria-label={`Delete user ${u.name}`}>
                        <Trash2 className="h-3.5 w-3.5" />{armedUser === u._id ? ' Click again to delete' : ''}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Invoices & proposals</h2>
          <ul className="space-y-2 text-sm">
            {invoices.map((i) => <li key={i._id} className="flex justify-between rounded-lg bg-ink-900 px-3 py-2"><span className="font-mono">{i.number}</span><span>{fmtMoney(i.total, i.currency)}</span><Badge>{i.status}</Badge></li>)}
            {proposals.map((p) => <li key={p._id} className="flex justify-between rounded-lg bg-ink-900 px-3 py-2"><span>{p.title}</span><span>{fmtMoney(p.total, p.currency)}</span><Badge>{p.status}</Badge></li>)}
            {!invoices.length && !proposals.length && <li className="text-slate-500">None yet</li>}
          </ul>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent communication</h2><Button size="sm" variant="ghost" to={`/admin/messages?client=${id}`}>Open messages</Button></div>
          <ul className="space-y-3">
            {messages.map((m) => <li key={m._id} className="text-sm"><span className="text-white">{m.from?.name}:</span> <span className="text-slate-400">{m.body.slice(0, 120)}</span><span className="ml-2 text-xs text-slate-600">{timeAgo(m.createdAt)}</span></li>)}
            {appointments.map((a) => <li key={a._id} className="text-sm text-slate-400">📅 {a.title} — {fmtDateTime(a.startsAt)} <Badge>{a.status}</Badge></li>)}
            {tickets.map((t) => <li key={t._id} className="text-sm text-slate-400">🎫 {t.ticketNo} {t.subject} <Badge>{t.status}</Badge></li>)}
          </ul>
        </div>

        <div className="card p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Reviews per order</h2>
            {clientRating != null && <span className="flex items-center gap-2 text-sm text-slate-400">Client rating <StarRow value={clientRating} /><span className="font-semibold text-white">{clientRating.toFixed(1)}</span></span>}
          </div>
          {reviews.length === 0 ? <Empty title="No completed orders yet" text="Each completed order can be reviewed by both sides." /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-ink-600 text-left text-xs uppercase text-slate-500"><th className="py-2 pr-3">Order</th><th className="py-2 pr-3">Client's review of us</th><th className="py-2 pr-3">Our review of the client</th></tr></thead>
                <tbody className="stagger">
                  {reviews.map(({ order, mine, theirs }) => (
                    <tr key={order._id} className="border-b border-ink-700/60 align-top">
                      <td className="py-3 pr-3"><Link to={`/admin/orders/${order._id}`} className="font-mono text-xs text-brand-300 hover:underline">{order.number}</Link><p className="text-xs text-slate-500">{order.serviceTitle} · {order.packageName}</p></td>
                      <td className="py-3 pr-3">{theirs ? <><span className="flex items-center gap-1.5"><StarRow value={theirs.overall} className="h-3.5 w-3.5" /><span className="text-white">{theirs.overall?.toFixed(1)}</span>{theirs.status !== 'published' && <Badge tone={theirs.status === 'trashed' ? 'red' : 'amber'}>{theirs.status === 'trashed' ? 'In trash' : 'Pending'}</Badge>}</span><p className="mt-1 line-clamp-2 text-xs text-slate-400">“{theirs.body}”</p></> : <span className="text-xs text-slate-500">Not reviewed yet</span>}</td>
                      <td className="py-3 pr-3">{mine ? <><span className="flex items-center gap-1.5"><StarRow value={mine.overall} className="h-3.5 w-3.5" /><span className="text-white">{mine.overall?.toFixed(1)}</span></span><p className="mt-1 line-clamp-2 text-xs text-slate-400">“{mine.body}”</p></> : <Link to={`/admin/orders/${order._id}`} className="text-xs text-brand-300 hover:underline">Review this client →</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit client" wide>
        <ResourceForm fields={CLIENT_FIELDS} initial={client} onCancel={() => setEditing(false)} onSubmit={async (b) => { await api.patch(`/clients/${id}`, b); setEditing(false); reload(); }} />
      </Modal>
      <Modal open={addingUser} onClose={() => setAddingUser(false)} title="Add portal user">
        <ResourceForm
          fields={[{ name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'password', label: 'Temporary password', required: true, hint: 'Min 8 characters. Emailed to the user.' }]}
          initial={{ name: client.primaryContact?.name, email: client.primaryContact?.email, password: `Zv-${Math.random().toString(36).slice(2, 8)}A1` }}
          onCancel={() => setAddingUser(false)}
          onSubmit={async (b) => { await api.post(`/clients/${id}/users`, b); setAddingUser(false); reload(); }}
          submitLabel="Create login"
        />
      </Modal>
      {deletingClient && <DeleteClientModal client={client} onClose={() => setDeletingClient(false)} onDeleted={() => nav('/admin/clients', { replace: true })} />}
    </div>
  );
}
