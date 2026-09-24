import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Resource, { ResourceForm } from '../../components/Resource';
import { Avatar, Badge, Button, PageHeader, PageLoader, ErrorBox, SuccessBox, Field, Input, Textarea, Pagination, Empty, Select } from '../../components/ui';
import { api, errMsg } from '../../api/http';
import { useFetch, fmtDateTime, timeAgo, cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import ThemeSwitcher from '../../components/ThemeSwitcher';
import AvatarUploader from '../../components/AvatarUploader';
import PhoneVerify from '../../components/PhoneVerify';
import { reconnectSocket } from '../../lib/realtime';
import { SOCIALS, SocialGlyph } from '../../components/SocialIcons';

const ROLE_LABELS = { superadmin: 'Super Admin', admin: 'Admin', sales: 'Sales / BD', pm: 'Project Manager', developer: 'Developer / Designer', chat_agent: 'Chat Agent', content_manager: 'Content Manager', client: 'Client' };
const ROLE_ACCESS = {
  superadmin: 'Everything, including users, settings & security',
  admin: 'Leads, clients, projects, content, chats, appointments, reports',
  sales: 'Leads, follow-ups, appointments, client & proposal data',
  pm: 'Assigned clients, projects, tasks, files & messages',
  developer: 'Assigned projects, tasks & permitted files',
  chat_agent: 'Live chat and assigned leads',
  content_manager: 'Services, industries, case studies, blog, FAQs',
  client: 'Own portal data only',
};

// ---------------- Users & roles ----------------
/** Delete button for a user row: first click arms it, second click deletes (no browser dialog). */
function DeleteUserButton({ row, reload, onError }) {
  const { user } = useAuth();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (String(row._id) === String(user?._id)) return null; // can't delete yourself
  const click = async (e) => {
    e.stopPropagation();
    if (!armed) return setArmed(true);
    setBusy(true);
    try {
      await api.del(`/users/${row._id}`);
      reload();
    } catch (err) {
      onError(errMsg(err));
      setArmed(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={click}
      onBlur={() => setArmed(false)}
      disabled={busy}
      aria-label={`Delete ${row.name}`}
      title="Delete user permanently"
      className={cn('inline-flex items-center gap-1 rounded-lg p-1.5 text-xs transition', armed ? 'bg-rose-600 px-2.5 font-semibold text-white' : 'text-slate-400 hover:bg-rose-500/10 hover:text-rose-400')}
    >
      <Trash2 className="h-4 w-4" />{armed && (busy ? 'Deleting…' : 'Click again to delete')}
    </button>
  );
}

export function Users() {
  const [error, setError] = useState('');
  return (
    <div className="space-y-6">
      <ErrorBox>{error}</ErrorBox>
      <Resource
        rowActions={(row, reload) => <DeleteUserButton row={row} reload={reload} onError={setError} />}
        endpoint="/users"
        title="Users & Roles"
        createLabel="New user"
        canDelete={false}
        fields={[
          { name: 'name', label: 'Name', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'role', label: 'Role', type: 'select', options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })), required: true, default: 'sales' },
          { name: 'title', label: 'Job title' },
          { name: 'client', label: 'Client (for client users)', type: 'ref', ref: { endpoint: '/clients' }, showIf: (v) => v.role === 'client' },
          { name: 'password', label: 'Password', hint: 'Required for new users; leave blank to keep existing', type: 'password' },
          { name: 'active', label: 'Status', type: 'checkbox', checkboxLabel: 'Active (can log in)', default: true },
        ]}
        filters={[{ name: 'role', label: 'All roles', options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })) }, { name: 'active', label: 'Any status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Deactivated' }] }]}
        columns={[
          { label: 'User', render: (r) => <div className="flex items-center gap-3"><Avatar name={r.name} src={r.avatar} seed={r._id} size="sm" /><div><p className="font-medium text-white">{r.name}</p><p className="text-xs text-slate-500">{r.email}</p></div></div> },
          { label: 'Role', render: (r) => <Badge tone={r.role === 'superadmin' ? 'pink' : r.role === 'client' ? 'blue' : 'violet'}>{ROLE_LABELS[r.role]}</Badge> },
          { label: 'Client', render: (r) => r.client?.name || '—' },
          { label: 'Status', render: (r) => <Badge tone={r.active ? 'green' : 'red'}>{r.active ? 'Active' : 'Deactivated'}</Badge> },
          { label: 'Last login', render: (r) => <span className="text-xs text-slate-500">{r.lastLoginAt ? timeAgo(r.lastLoginAt) : 'never'}</span> },
        ]}
      />
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Role permissions</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(ROLE_ACCESS).map(([r, a]) => (
            <div key={r} className="flex gap-3 rounded-xl border border-ink-600 p-3 text-sm"><span className="w-40 shrink-0 font-medium text-white">{ROLE_LABELS[r]}</span><span className="text-slate-400">{a}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Notifications ----------------
export function Notifications() {
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useFetch('/notifications', { page, limit: 30 });
  return (
    <div>
      <PageHeader title="Notifications" actions={<Button variant="ghost" onClick={async () => { await api.post('/notifications/read-all'); reload(); }}>Mark all read</Button>} />
      {loading ? <PageLoader /> : !data?.items.length ? <Empty title="No notifications" /> : (
        <div className="card divide-y divide-ink-700">
          {data.items.map((n) => (
            <div key={n._id} className={cn('flex gap-3 px-5 py-4', !n.read && 'bg-brand-500/5')}>
              {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-400" />}
              <div className="flex-1">
                {n.link ? <Link to={n.link} className="text-sm font-medium text-white hover:underline" onClick={() => api.patch(`/notifications/${n._id}`)}>{n.title}</Link> : <p className="text-sm font-medium text-white">{n.title}</p>}
                {n.body && <p className="mt-0.5 text-sm text-slate-400">{n.body.replace(/<[^>]*>/g, '')}</p>}
              </div>
              <span className="text-xs text-slate-500">{timeAgo(n.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </div>
  );
}

// ---------------- Settings ----------------
function Card({ title, children, text }) {
  return (
    <div className="card p-5"><h2 className="font-semibold">{title}</h2>{text && <p className="mt-1 text-xs text-slate-500">{text}</p>}<div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div></div>
  );
}

export function Settings() {
  const { data, loading, error } = useFetch('/settings');
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (loading || !s) return error ? <ErrorBox>{error}</ErrorBox> : <PageLoader />;
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const save = async () => {
    setSaving(true);
    setMsg({ ok: '', err: '' });
    try {
      setS(await api.put('/settings', s));
      setMsg({ ok: 'Settings saved', err: '' });
    } catch (e) {
      setMsg({ ok: '', err: errMsg(e) });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Site, integrations, chatbot and security configuration." actions={<Button onClick={save} loading={saving}>Save changes</Button>} />
      <ErrorBox>{msg.err}</ErrorBox><SuccessBox>{msg.ok}</SuccessBox>
      <Card title="Company & site">
        <Field label="Site name"><Input value={s.siteName || ''} onChange={(e) => set('siteName', e.target.value)} /></Field>
        <Field label="Tagline"><Input value={s.tagline || ''} onChange={(e) => set('tagline', e.target.value)} /></Field>
        <Field label="Contact email"><Input value={s.contactEmail || ''} onChange={(e) => set('contactEmail', e.target.value)} /></Field>
        <Field label="Contact phone"><Input value={s.contactPhone || ''} onChange={(e) => set('contactPhone', e.target.value)} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input value={s.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
        <p className="text-xs text-slate-500 sm:col-span-2">Social links (footer & contact page). Leave a field empty to hide that icon. WhatsApp accepts a full link or a phone number with country code.</p>
        {SOCIALS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-3 text-slate-500"><SocialGlyph name={key} /></span>
              <Input className="pl-9" placeholder={key === 'whatsapp' ? '+8801XXXXXXXXX or https://wa.me/…' : 'https://…'} value={s.socials?.[key] || ''} onChange={(e) => set('socials', { ...s.socials, [key]: e.target.value })} />
            </div>
          </Field>
        ))}
      </Card>

      <Card title="Trust signals (homepage stats)" text="Only publish numbers that are true and verifiable.">
        <div className="space-y-2 sm:col-span-2">
          {(s.stats || []).map((st, i) => (
            <div key={i} className="flex gap-2">
              <Input className="w-40" placeholder="Value" value={st.value} onChange={(e) => set('stats', s.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <Input placeholder="Label" value={st.label} onChange={(e) => set('stats', s.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <button onClick={() => set('stats', s.stats.filter((_, j) => j !== i))} className="px-2 text-slate-500 hover:text-rose-300" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => set('stats', [...(s.stats || []), { value: '', label: '' }])}><Plus className="h-3.5 w-3.5" /> Add stat</Button>
        </div>
        <Field label="Technology stack (comma separated)" className="sm:col-span-2"><Input value={(s.techStack || []).join(', ')} onChange={(e) => set('techStack', e.target.value.split(',').map((x) => x.trim()).filter(Boolean))} /></Field>
      </Card>

      <Card title="Orders & payments" text="Clients order service packages from the website. Connect a payment gateway in server/src/services/payments.js — until then clients see the manual instructions below.">
        <Field label="Payment method"><Select value={s.payments?.provider || 'manual'} onChange={(e) => set('payments', { ...s.payments, provider: e.target.value })} options={[{ value: 'manual', label: 'Manual (bank / Payoneer / Wise)' }, { value: 'stripe', label: 'Stripe (needs integration)' }, { value: 'paypal', label: 'PayPal (needs integration)' }, { value: 'sslcommerz', label: 'SSLCommerz (needs integration)' }]} /></Field>
        <Field label="Package prices on the website" hint="Off = clients see “Price on request”, and you send a fixed price for every order"><Select value={String(!!s.payments?.showPrices)} onChange={(e) => set('payments', { ...s.payments, showPrices: e.target.value === 'true' })} options={[{ value: 'false', label: 'Hidden — “Request price”' }, { value: 'true', label: 'Show prices' }]} /></Field>
        <Field label="Invoice due in (days)"><Input type="number" min="1" value={s.payments?.invoiceDueDays ?? 3} onChange={(e) => set('payments', { ...s.payments, invoiceDueDays: Number(e.target.value) })} /></Field>
        <Field label="Manual payment instructions (markdown)" hint="Shown when a client clicks “Pay now” and no gateway is connected. Include your bank / Payoneer / Wise details." className="sm:col-span-2"><Textarea rows={6} value={s.payments?.manualInstructions || ''} onChange={(e) => set('payments', { ...s.payments, manualInstructions: e.target.value })} /></Field>
        <p className="text-xs text-slate-500 sm:col-span-2">Tip: you can also paste a PayPal / Stripe payment link on any invoice (Invoices → edit → Payment link). The “Pay now” button then opens that link.</p>
      </Card>

      <Card title="Fiverr & Upwork profiles (live stats)" text="Shown as live, animated stats on the homepage and the Fiverr & Upwork page. When you save, every open visitor sees the new numbers instantly, and a point is added to the “reviews over time” chart.">
        <Field label="Total earnings (shown big & animated)" hint="e.g. $160k+"><Input value={s.marketplaces?.earnings || ''} onChange={(e) => set('marketplaces', { ...s.marketplaces, earnings: e.target.value })} /></Field>
        <Field label="Earnings caption"><Input value={s.marketplaces?.earningsLabel || ''} onChange={(e) => set('marketplaces', { ...s.marketplaces, earningsLabel: e.target.value })} placeholder="Total earned from client projects on Fiverr & Upwork" /></Field>
        {[['fiverr', 'Fiverr'], ['upwork', 'Upwork']].map(([k, label]) => {
          const m = s.marketplaces?.[k] || {};
          const setM = (f, v) => set('marketplaces', { ...s.marketplaces, [k]: { ...m, [f]: v } });
          const fields = k === 'fiverr'
            ? [['url', 'Profile URL'], ['displayName', 'Display name'], ['username', 'Username'], ['level', 'Seller level'], ['badges', 'Badges (comma separated)'], ['rating', 'Rating', 'number'], ['reviews', 'Reviews', 'number'], ['ordersCompleted', 'Orders completed'], ['memberSince', 'Member since'], ['responseTime', 'Avg. response time'], ['languages', 'Languages (comma separated)']]
            : [['url', 'Profile URL'], ['displayName', 'Display name'], ['title', 'Profile title'], ['hourlyRate', 'Hourly rate (USD)', 'number'], ['rating', 'Rating', 'number'], ['reviews', 'Reviews', 'number'], ['jobs', 'Jobs completed', 'number'], ['location', 'Location']];
          return (
            <div key={k} className="space-y-3 rounded-xl border border-ink-600 p-4 sm:col-span-2">
              <p className="font-medium text-white">{label}</p>
              {k === 'fiverr' && (
                <div className="rounded-xl border border-ink-600/60 bg-ink-900/60 p-3">
                  <p className="mb-2 text-xs text-slate-400">Star rating breakdown (number of reviews per star) — drawn as an animated chart</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[['five', '5★'], ['four', '4★'], ['three', '3★'], ['two', '2★'], ['one', '1★']].map(([bk, bl]) => (
                      <Field key={bk} label={bl}><Input type="number" min="0" value={m.breakdown?.[bk] ?? ''} onChange={(e) => setM('breakdown', { ...(m.breakdown || {}), [bk]: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
                    ))}
                  </div>
                  <Field label="Chart caption" className="mt-2"><Input value={m.breakdownLabel || ''} onChange={(e) => setM('breakdownLabel', e.target.value)} placeholder="e.g. Based on 824 Fiverr reviews" /></Field>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map(([f, l, type]) => {
                  const list = ['badges', 'languages'].includes(f);
                  return (
                    <Field key={f} label={l}>
                      <Input type={type || 'text'} step="any" value={list ? (m[f] || []).join(', ') : m[f] ?? ''} onChange={(e) => setM(f, list ? e.target.value.split(',').map((x) => x.trim()).filter(Boolean) : type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)} />
                    </Field>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Card>

      <Card title="Login security" text="A 6-digit code is sent by email (or SMS, if the user has a phone number) every time someone signs in. New sign-ups must always confirm their email.">
        <Field label="Login verification code"><Select value={String(s.security?.loginVerification !== false)} onChange={(e) => set('security', { ...s.security, loginVerification: e.target.value === 'true' })} options={[{ value: 'true', label: 'On — code required at every login (recommended)' }, { value: 'false', label: 'Off — only for unverified emails' }]} /></Field>
        <p className="text-xs text-slate-500 sm:col-span-2">Email codes use your SMTP settings. For SMS, add TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM (or SMS_WEBHOOK_URL for a local gateway) to <code>server/.env</code>.</p>
      </Card>

      <Card title="Chatbot & live chat">
        <Field label="AI chatbot"><Select value={String(s.chatbotEnabled !== false)} onChange={(e) => set('chatbotEnabled', e.target.value === 'true')} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} /></Field>
        <Field label="Auto-reply email to new leads"><Select value={String(s.autoReplyEnabled !== false)} onChange={(e) => set('autoReplyEnabled', e.target.value === 'true')} options={[{ value: 'true', label: 'Enabled' }, { value: 'false', label: 'Disabled' }]} /></Field>
        <Field label="Chatbot greeting" className="sm:col-span-2"><Textarea rows={2} value={s.chatbotGreeting || ''} onChange={(e) => set('chatbotGreeting', e.target.value)} /></Field>
        <Field label="Third-party live chat script URL (optional)" hint="e.g. https://embed.tawk.to/xxxx/default — loaded on public pages only" className="sm:col-span-2"><Input value={s.liveChatEmbed || ''} onChange={(e) => set('liveChatEmbed', e.target.value)} /></Field>
        <Field label="Conversation retention (days)"><Input type="number" value={s.retentionDays || 365} onChange={(e) => set('retentionDays', Number(e.target.value))} /></Field>
      </Card>

      <Card title="Integrations">
        <Field label="Google Analytics 4 Measurement ID" hint="Loaded only after cookie consent"><Input placeholder="G-XXXXXXX" value={s.gaMeasurementId || ''} onChange={(e) => set('gaMeasurementId', e.target.value)} /></Field>
        <Field label="Google Tag Manager ID"><Input placeholder="GTM-XXXX" value={s.gtmId || ''} onChange={(e) => set('gtmId', e.target.value)} /></Field>
        <Field label="Calendar booking URL (Calendly / Cal.com)" className="sm:col-span-2"><Input value={s.calendlyUrl || ''} onChange={(e) => set('calendlyUrl', e.target.value)} /></Field>
        <p className="text-xs text-slate-500 sm:col-span-2">SMTP email, AI API key, JWT secret and database credentials are configured as server environment variables (never stored in the database). See <code>server/.env.example</code>.</p>
      </Card>
    </div>
  );
}

// ---------------- Audit logs ----------------
export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const { data, loading } = useFetch('/audit-logs', { page, limit: 40, entity });
  return (
    <div>
      <PageHeader title="Audit logs" subtitle="Important access and change actions across the platform." actions={<Select className="w-48" value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} options={['Lead', 'Client', 'Project', 'Task', 'File', 'Invoice', 'Proposal', 'User', 'Setting', 'Ticket']} placeholder="All entities" />} />
      {loading ? <PageLoader /> : (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
            <tbody>
              {data.items.map((l) => (
                <tr key={l._id}>
                  <td className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(l.createdAt)}</td>
                  <td>{l.user?.name || '—'}<div className="text-xs text-slate-500">{l.user?.role}</div></td>
                  <td><Badge tone="violet">{l.action}</Badge></td>
                  <td className="text-slate-300">{l.entity} <span className="font-mono text-[10px] text-slate-600">{l.entityId?.slice(-6)}</span></td>
                  <td className="max-w-xs truncate font-mono text-[11px] text-slate-500">{l.meta ? JSON.stringify(l.meta) : ''}</td>
                  <td className="font-mono text-xs text-slate-500">{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={data?.pages} onChange={setPage} />
    </div>
  );
}

// ---------------- Profile (shared by staff) ----------------
export function Profile() {
  const { user, setUser } = useAuth();
  const [msg, setMsg] = useState({ ok: '', err: '' });
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="My profile" />
      <ErrorBox>{msg.err}</ErrorBox><SuccessBox>{msg.ok}</SuccessBox>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Profile photo</h2>
        <AvatarUploader />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Personal information</h2>
        <ResourceForm
          fields={[{ name: 'name', label: 'Name', required: true }, { name: 'title', label: 'Job title' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', readOnly: true }]}
          initial={user}
          onSubmit={async (b) => { const r = await api.patch('/auth/me', b); setUser(r.user); reconnectSocket(); setMsg({ ok: 'Profile updated', err: '' }); }}
        />
      </div>
      <div className="card p-5">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">Choose how Zeviro looks to you. "System" follows your device setting.</p>
        <ThemeSwitcher variant="cards" />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Notification preferences</h2>
        <div className="space-y-2">
          {[['email', 'Email notifications'], ['inApp', 'In-app notifications']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-violet-500" checked={user.notificationPrefs?.[k] !== false} onChange={async (e) => { const r = await api.patch('/auth/me', { notificationPrefs: { ...user.notificationPrefs, [k]: e.target.checked } }); setUser(r.user); }} /> {l}</label>
          ))}
        </div>
      </div>
      <PhoneVerify />
      <ChangePassword onDone={(m) => setMsg(m)} />
    </div>
  );
}

export function ChangePassword({ onDone }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-semibold">Password & security</h2>
      <ResourceForm
        fields={[{ name: 'currentPassword', label: 'Current password', type: 'password', required: true }, { name: 'newPassword', label: 'New password', type: 'password', required: true, hint: 'Min 8 chars, one uppercase letter and a number' }]}
        onSubmit={async (b) => { await api.post('/auth/change-password', b); onDone({ ok: 'Password changed', err: '' }); }}
        submitLabel="Change password"
      />
    </div>
  );
}
