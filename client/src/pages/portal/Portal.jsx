import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Circle, Loader, CalendarClock, Download, Upload, Paperclip, MessageSquare, Video, Printer, Folder, FileText, Clock, Plus,
} from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, Modal, PageHeader, PageLoader, ErrorBox, SuccessBox, Empty, Progress, Select, Textarea, Input, Field, Tabs } from '../../components/ui';
import { ResourceForm } from '../../components/Resource';
import { ChangePassword } from '../admin/System';
import { Avatar } from '../../components/ui';
import AvatarUploader from '../../components/AvatarUploader';
import PhoneVerify from '../../components/PhoneVerify';
import { reconnectSocket } from '../../lib/realtime';
import MessageList, { fromPortalMessage } from '../../components/MessageList';
import { useSocketEvent, useTypingEmitter, useRemoteTyping } from '../../lib/realtime';
import { useFetch, fmtDate, fmtDateTime, fmtMoney, fmtSize, timeAgo, cn, COUNTRIES } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import ThemeSwitcher from '../../components/ThemeSwitcher';

// ============ 10.1 Overview ============
export function Overview() {
  const { data, loading, error } = useFetch('/portal/overview');
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const { client, projects, overallProgress, upcomingDeadline, pendingTasks, meetings, messages, invoices, files, notifications, user } = data;
  const due = invoices.reduce((s, i) => s + (i.total - i.amountPaid), 0);

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6">
        <div className="glow-orb pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-violet-700/50" />
        <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-400">Welcome back,</p>
            <h1 className="text-2xl font-semibold">{user.name} 👋</h1>
            <p className="mt-1 text-sm text-slate-400">{client.name}{client.accountManager ? ` · Your account manager: ${client.accountManager.name}` : ''}</p>
          </div>
          <div className="flex gap-2"><Button to="/portal/messages" variant="ghost"><MessageSquare className="h-4 w-4" /> Message team</Button><Button to="/portal/meetings">Book a meeting</Button></div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Overall progress</p><p className="mt-2 font-display text-3xl font-semibold text-white">{overallProgress}%</p><Progress value={overallProgress} className="mt-3" /></div>
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Active projects</p><p className="mt-2 font-display text-3xl font-semibold text-white">{projects.length}</p></div>
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Upcoming deadline</p><p className="mt-2 font-display text-xl font-semibold text-white">{upcomingDeadline ? fmtDate(upcomingDeadline.deadline) : '—'}</p><p className="text-xs text-slate-500">{upcomingDeadline?.name}</p></div>
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Balance due</p><p className={cn('mt-2 font-display text-3xl font-semibold', due > 0 ? 'text-amber-300' : 'text-white')}>{fmtMoney(due)}</p><p className="text-xs text-slate-500">{invoices.length} open invoice(s)</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Active projects</h2><Link to="/portal/projects" className="text-xs text-brand-300">View all</Link></div>
            {projects.length === 0 ? <Empty title="No active projects" /> : projects.map((p) => (
              <Link key={p._id} to={`/portal/projects/${p._id}`} className="mb-3 block rounded-xl border border-ink-600 p-4 transition hover:border-brand-500/50">
                <div className="flex items-center justify-between"><p className="font-medium text-white">{p.name}</p><Badge>{p.status}</Badge></div>
                <div className="mt-3 flex items-center gap-3"><Progress value={p.progress} /><span className="text-sm text-slate-300">{p.progress}%</span></div>
                <p className="mt-2 text-xs text-slate-500">{p.milestones.filter((m) => m.status === 'Completed').length}/{p.milestones.length} milestones · deadline {fmtDate(p.deadline)} · PM {p.manager?.name || '—'}</p>
              </Link>
            ))}
          </div>
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Pending tasks for you</h2><Link to="/portal/tasks" className="text-xs text-brand-300">All tasks</Link></div>
            {pendingTasks.length === 0 ? <p className="text-sm text-slate-500">Nothing pending — you're all set.</p> : (
              <ul className="space-y-2">{pendingTasks.map((t) => <li key={t._id} className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm"><span className="text-slate-200">{t.title}<span className="ml-2 text-xs text-slate-500">{t.project?.name}</span></span><span className="flex items-center gap-2"><span className="text-xs text-slate-500">{fmtDate(t.dueDate)}</span><Badge>{t.status}</Badge></span></li>)}</ul>
            )}
          </div>
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Recent messages</h2><Link to="/portal/messages" className="text-xs text-brand-300">Open inbox</Link></div>
            {messages.length === 0 ? <p className="text-sm text-slate-500">No messages yet.</p> : messages.map((m) => <p key={m._id} className="mb-2 text-sm"><span className="text-white">{m.from?.name}:</span> <span className="text-slate-400">{m.body.slice(0, 140)}</span> <span className="text-xs text-slate-600">{timeAgo(m.createdAt)}</span></p>)}
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Upcoming meetings</h2>
            {meetings.length === 0 ? <p className="text-sm text-slate-500">None scheduled.</p> : meetings.map((m) => (
              <div key={m._id} className="mb-2 rounded-xl border border-ink-600 p-3"><p className="text-sm text-white">{m.title}</p><p className="text-xs text-brand-300">{fmtDateTime(m.startsAt)}</p>{m.meetingLink && <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-slate-300 underline"><Video className="h-3 w-3" /> Join</a>}</div>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Invoices & payments</h2>
            {invoices.length === 0 ? <p className="text-sm text-slate-500">No outstanding invoices 🎉</p> : invoices.map((i) => <Link key={i._id} to={`/portal/invoices/${i._id}`} className="mb-2 flex justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm"><span className="font-mono">{i.number}</span><span>{fmtMoney(i.total - i.amountPaid, i.currency)}</span><Badge>{i.status}</Badge></Link>)}
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Recent files</h2>
            {files.length === 0 ? <p className="text-sm text-slate-500">No files yet.</p> : files.map((f) => <a key={f._id} href={f.url} className="mb-2 flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm hover:bg-ink-700"><span className="truncate text-slate-200">{f.originalName}</span><Download className="h-4 w-4 text-slate-500" /></a>)}
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Notifications</h2>
            {notifications.length === 0 ? <p className="text-sm text-slate-500">You're all caught up.</p> : notifications.map((n) => <p key={n._id} className="mb-2 text-sm"><span className={n.read ? 'text-slate-400' : 'text-white'}>{n.title}</span> <span className="text-xs text-slate-600">{timeAgo(n.createdAt)}</span></p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 10.2 Projects ============
export function Projects() {
  const { data, loading, refresh } = useFetch('/portal/projects');
  useSocketEvent('project:update', refresh);
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="My projects" />
      {!data?.length ? <Empty title="No projects yet" text="Your projects will appear here once work begins." /> : (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((p) => (
            <Link key={p._id} to={`/portal/projects/${p._id}`} className="card card-hover p-6">
              <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{p.name}</h2><Badge>{p.status}</Badge></div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-400">{p.description}</p>
              <div className="mt-4 flex items-center gap-3"><Progress value={p.progress} /><span className="text-sm font-semibold text-white">{p.progress}%</span></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <span>Start<br /><span className="text-slate-300">{fmtDate(p.startDate)}</span></span>
                <span>Deadline<br /><span className="text-slate-300">{fmtDate(p.deadline)}</span></span>
                <span>PM<br /><span className="text-slate-300">{p.manager?.name || '—'}</span></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const { data: p, loading, error, refresh } = useFetch(`/portal/projects/${id}`);
  useSocketEvent('project:update', (d) => String(d.projectId) === id && refresh());
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  return (
    <div className="space-y-6">
      <Link to="/portal/projects" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> My projects</Link>
      <div>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">{p.name}</h1><Badge>{p.status}</Badge></div>
        <p className="mt-2 max-w-3xl text-slate-400">{p.description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4 sm:col-span-2"><p className="text-xs uppercase text-slate-500">Progress</p><div className="mt-2 flex items-center gap-3"><Progress value={p.progress} /><span className="font-display text-xl font-semibold text-white">{p.progress}%</span></div></div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Timeline</p><p className="mt-1 text-sm text-white">{fmtDate(p.startDate)} → {fmtDate(p.deadline)}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Tasks</p><p className="mt-1 text-sm text-white">{p.taskStats.done} completed · {p.taskStats.total - p.taskStats.done} pending</p></div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">Milestones</h2>
          <ol className="space-y-3">
            {p.milestones.map((m) => (
              <li key={m._id} className="flex items-center gap-3 rounded-xl border border-ink-600 p-3">
                {m.status === 'Completed' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : m.status === 'In Progress' ? <Loader className="h-5 w-5 text-sky-400" /> : <Circle className="h-5 w-5 text-slate-600" />}
                <div className="flex-1"><p className="text-sm text-white">{m.title}</p>{m.description && <p className="text-xs text-slate-500">{m.description}</p>}</div>
                <span className="text-xs text-slate-500">{m.status === 'Completed' ? `Done ${fmtDate(m.completedAt)}` : `Due ${fmtDate(m.dueDate)}`}</span>
              </li>
            ))}
            {!p.milestones.length && <p className="text-sm text-slate-500">Milestones will be added soon.</p>}
          </ol>
          <h2 className="mb-3 mt-8 font-semibold">Tasks</h2>
          <ul className="space-y-2">{p.tasks.map((t) => <li key={t._id} className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm"><span className={t.status === 'Done' ? 'text-slate-500 line-through' : 'text-slate-200'}>{t.title}</span><Badge>{t.status}</Badge></li>)}</ul>
          <Link to={`/portal/tasks?project=${p._id}`} className="mt-3 inline-flex items-center gap-1 text-sm text-brand-300">Open tasks & comments <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Your team</h2>
            {p.manager && <p className="text-sm"><span className="text-white">{p.manager.name}</span> <span className="text-slate-500">· Project Manager</span></p>}
            {p.team.map((u) => <p key={u._id} className="text-sm"><span className="text-white">{u.name}</span> <span className="text-slate-500">· {u.role === 'developer' ? 'Developer / Designer' : u.role}</span></p>)}
            <Button to="/portal/messages" size="sm" variant="ghost" className="mt-4">Message the team</Button>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Activity timeline</h2>
            <ol className="space-y-3 border-l border-ink-600 pl-4">
              {p.activity.map((a) => <li key={a._id} className="text-sm"><p className="text-slate-200">{a.text}</p><p className="text-xs text-slate-500">{a.by?.name} · {timeAgo(a.createdAt)}</p></li>)}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 10.3 Tasks ============
export function Tasks() {
  const params = new URLSearchParams(window.location.search);
  const [project, setProject] = useState(params.get('project') || '');
  const [status, setStatus] = useState('');
  const projects = useFetch('/portal/projects');
  const { data, loading, setData, refresh } = useFetch('/portal/tasks', { project, status });
  useSocketEvent('project:update', refresh);
  const [open, setOpen] = useState(null);
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const task = data?.find((t) => t._id === open);

  const comment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setErr('');
    try {
      let attachments = [];
      if (files.length) attachments = (await api.upload('/portal/files', files, { project: task.project._id, category: 'Attachment' })).map((f) => f._id);
      const t = await api.post(`/portal/tasks/${open}/comments`, { text, attachments });
      setData((list) => list.map((x) => (x._id === open ? { ...x, comments: t.comments } : x)));
      setText('');
      setFiles([]);
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  return (
    <div>
      <PageHeader title="Tasks" subtitle="Tasks that need your input or that you can follow." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Select className="w-60" value={project} onChange={(e) => setProject(e.target.value)} options={(projects.data || []).map((p) => ({ value: p._id, label: p.name }))} placeholder="All projects" />
        <Select className="w-44" value={status} onChange={(e) => setStatus(e.target.value)} options={['To Do', 'In Progress', 'Review', 'Done', 'Blocked']} placeholder="All statuses" />
      </div>
      {loading ? <PageLoader /> : !data?.length ? <Empty title="No tasks" /> : (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead><tr><th>Task</th><th>Project</th><th>Status</th><th>Priority</th><th>Due</th><th>Comments</th></tr></thead>
            <tbody>
              {data.map((t) => (
                <tr key={t._id} className="cursor-pointer" onClick={() => setOpen(t._id)}>
                  <td className="font-medium text-white">{t.status === 'Done' && <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-400" />}{t.title}</td>
                  <td className="text-slate-400">{t.project?.name}</td>
                  <td><Badge>{t.status}</Badge></td>
                  <td><Badge>{t.priority}</Badge></td>
                  <td className="text-slate-400">{fmtDate(t.dueDate)}</td>
                  <td className="text-slate-400">{t.comments.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={!!task} onClose={() => setOpen(null)} title={task?.title} wide>
        {task && (
          <>
            <div className="mb-3 flex flex-wrap gap-2"><Badge>{task.status}</Badge><Badge>{task.priority}</Badge><span className="text-xs text-slate-500">Due {fmtDate(task.dueDate)} · {task.project?.name}</span></div>
            <p className="whitespace-pre-line text-sm text-slate-300">{task.description || 'No description.'}</p>
            {task.attachments?.length > 0 && <div className="mt-3 space-y-1">{task.attachments.map((a) => <a key={a._id} href={a.url} className="flex items-center gap-1 text-xs text-brand-300 underline"><Paperclip className="h-3 w-3" />{a.originalName}</a>)}</div>}
            <h3 className="mb-3 mt-6 font-semibold">Comments</h3>
            <div className="space-y-3">
              {task.comments.map((c) => (
                <div key={c._id} className={cn('rounded-xl p-3 text-sm', c.by?.role === 'client' ? 'border border-brand-500/30 bg-brand-500/10' : 'bg-ink-900')}>
                  <p className="whitespace-pre-line text-slate-200">{c.text}</p>
                  {c.attachments?.length > 0 && <p className="mt-1 text-xs text-slate-400">📎 {c.attachments.length} attachment(s) — see Files</p>}
                  <p className="mt-1 text-xs text-slate-500">{c.by?.name} · {timeAgo(c.createdAt)}</p>
                </div>
              ))}
              {!task.comments.length && <p className="text-sm text-slate-500">No comments yet.</p>}
            </div>
            <form onSubmit={comment} className="mt-4 space-y-2">
              <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply or leave feedback…" />
              <ErrorBox>{err}</ErrorBox>
              <div className="flex items-center justify-between">
                <label className="btn-ghost btn-sm cursor-pointer"><Paperclip className="h-3.5 w-3.5" /> {files.length ? `${files.length} file(s)` : 'Attach'}<input type="file" multiple className="hidden" onChange={(e) => setFiles([...e.target.files])} /></label>
                <Button size="sm" type="submit">Post comment</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}

// ============ 10.4 Files ============
export function Files() {
  const projects = useFetch('/portal/projects');
  const [project, setProject] = useState('');
  const [category, setCategory] = useState('');
  const [folder, setFolder] = useState('');
  const { data, loading, reload } = useFetch('/portal/files', { project, category, folder });
  const [upCat, setUpCat] = useState('Requirements');
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const [busy, setBusy] = useState(false);

  const upload = async (files) => {
    if (!files.length) return;
    setBusy(true);
    setMsg({ ok: '', err: '' });
    try {
      await api.upload('/portal/files', files, { project, category: upCat });
      setMsg({ ok: `${files.length} file(s) uploaded — the team has been notified.`, err: '' });
      reload();
    } catch (e) {
      setMsg({ ok: '', err: errMsg(e) });
    }
    setBusy(false);
  };

  const folders = (data?.folders || []).filter((f) => !project || f.project === project);
  return (
    <div>
      <PageHeader title="Files & documents" subtitle="Requirements, design previews, documents and deliverables." />
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="w-56"><p className="label">Project</p><Select value={project} onChange={(e) => { setProject(e.target.value); setFolder(''); }} options={(projects.data || []).map((p) => ({ value: p._id, label: p.name }))} placeholder="All projects" /></div>
        <div className="w-48"><p className="label">Category</p><Select value={category} onChange={(e) => setCategory(e.target.value)} options={['Requirements', 'Design Preview', 'Document', 'Deliverable', 'Attachment', 'Other']} placeholder="All categories" /></div>
        <div className="ml-auto flex items-end gap-2">
          <div className="w-44"><p className="label">Upload as</p><Select value={upCat} onChange={(e) => setUpCat(e.target.value)} options={['Requirements', 'Document', 'Attachment', 'Other']} /></div>
          <label className={cn('btn-primary cursor-pointer', busy && 'opacity-60')}><Upload className="h-4 w-4" /> Upload<input type="file" multiple className="hidden" disabled={busy} onChange={(e) => upload(e.target.files)} /></label>
        </div>
        <p className="w-full text-xs text-slate-500">Images, PDF, Office documents, CSV, TXT, ZIP — up to 15 MB each.</p>
        <div className="w-full"><ErrorBox>{msg.err}</ErrorBox><SuccessBox>{msg.ok}</SuccessBox></div>
      </div>
      {folders.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button onClick={() => setFolder('')} className={cn('flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs', !folder ? 'border-brand-500 text-white' : 'border-ink-600 text-slate-400')}><Folder className="h-3.5 w-3.5" /> All</button>
          {folders.map((f) => <button key={f._id} onClick={() => setFolder(f._id)} className={cn('flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs', folder === f._id ? 'border-brand-500 text-white' : 'border-ink-600 text-slate-400')}><Folder className="h-3.5 w-3.5" /> {f.name}</button>)}
        </div>
      )}
      {loading ? <PageLoader /> : !data?.files.length ? <Empty title="No files yet" /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.files.map((f) => (
            <div key={f._id} className="card flex items-center gap-3 p-4">
              <span className="rounded-xl bg-brand-500/10 p-2.5 text-brand-300"><FileText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{f.originalName}</p>
                <p className="text-xs text-slate-500">{f.category} · {fmtSize(f.size)} · {f.project?.name || 'General'}</p>
                <p className="text-[11px] text-slate-600">{f.uploadedBy?.role === 'client' ? 'Uploaded by you' : `Shared by ${f.uploadedBy?.name || 'Zeviro'}`} · {fmtDate(f.createdAt)}</p>
              </div>
              <a href={f.url} className="rounded-lg p-2 text-slate-400 hover:bg-ink-700 hover:text-white" aria-label="Download"><Download className="h-4 w-4" /></a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 10.5 Messages ============
export function Messages({ onRead }) {
  const projects = useFetch('/portal/projects');
  const [project, setProject] = useState('');
  const { data, reload, setData } = useFetch('/portal/messages', { project });
  const profile = useFetch('/portal/profile');
  const am = profile.data?.client?.accountManager;
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const endRef = useRef();

  // ---------- real-time (client is auto-joined to its own room on the server) ----------
  const typingOut = useTypingEmitter('msg:typing', { portal: true });
  const [teamTyping, setTeamTyping] = useRemoteTyping();
  const addMessage = (m) => setData((list) => (list?.some((x) => x._id === m._id) ? list : [...(list || []), m]));
  useSocketEvent('msg:new', ({ message }) => {
    if (project && String(message.project?._id || message.project || '') !== project) return;
    if (!message.fromClient) {
      setTeamTyping(false);
      reload(); // re-fetch marks it as read → team sees "Seen"
    } else addMessage(message);
  });
  useSocketEvent('msg:typing', (d) => {
    if (!d.fromClient) setTeamTyping(d.typing, d);
  });
  useSocketEvent('msg:read', (d) => {
    if (d.by === 'team') setData((list) => list?.map((m) => (m.fromClient ? { ...m, readByTeam: true } : m)));
  });
  useEffect(() => {
    onRead?.();
    endRef.current?.scrollIntoView();
  }, [data, teamTyping]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = setInterval(reload, 30000); // fallback only
    return () => clearInterval(id);
  }, [reload]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setErr('');
    try {
      let attachments = [];
      if (files.length) attachments = (await api.upload('/portal/files', files, { project, category: 'Attachment' })).map((f) => f._id);
      const text = body;
      setBody('');
      typingOut.stop();
      addMessage(await api.post('/portal/messages', { body: text, ...(project && { project }), attachments }));
      setFiles([]);
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };

  return (
    <div>
      <PageHeader title="Messages" subtitle="Talk directly with your Zeviro team." actions={<Select className="w-60" value={project} onChange={(e) => setProject(e.target.value)} options={(projects.data || []).map((p) => ({ value: p._id, label: p.name }))} placeholder="All conversations" />} />
      <div className="card flex h-[calc(100vh-14rem)] min-h-[460px] flex-col overflow-hidden">
        {/* header: your Zeviro team */}
        <div className="flex items-center gap-3 border-b border-ink-600 px-4 py-3">
          <Avatar name={am?.name || 'Zeviro Team'} src={am?.avatar} seed={am?._id} size="md" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{am ? am.name : 'Zeviro Team'}</p>
            <p className="truncate text-xs text-slate-500">
              {teamTyping ? <span className="text-emerald-300">{teamTyping.name} is typing…</span> : am ? `Your account manager${am.title ? ` · ${am.title}` : ''} · the whole team sees these messages` : 'We typically reply within one business day'}
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <MessageList items={(data || []).map((m) => fromPortalMessage(m, { viewer: 'client' }))} typing={teamTyping} emptyText="Send the team a message — we typically reply within one business day." />
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="space-y-2 border-t border-ink-600 p-3">
          <ErrorBox>{err}</ErrorBox>
          <div className="flex gap-2">
            <input className="input" value={body} onChange={(e) => { setBody(e.target.value); if (e.target.value) typingOut.onType(); else typingOut.stop(); }} placeholder={project ? 'Message about this project…' : 'Write a message…'} />
            <label className="btn-ghost cursor-pointer px-3" aria-label="Attach file"><Paperclip className="h-4 w-4" /><input type="file" multiple className="hidden" onChange={(e) => setFiles([...e.target.files])} /></label>
            <Button type="submit">Send</Button>
          </div>
          {files.length > 0 && <p className="text-xs text-slate-400">{files.length} file(s) attached</p>}
        </form>
      </div>
    </div>
  );
}

// ============ 10.6 Proposals ============
export function Proposals() {
  const { data, loading, reload } = useFetch('/portal/proposals');
  const [open, setOpen] = useState(null);
  const detail = useFetch(open ? `/portal/proposals/${open}` : null, undefined, { skip: !open });
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const p = detail.data;
  const respond = async (decision) => {
    if (!window.confirm(`${decision === 'Accepted' ? 'Accept' : 'Decline'} this proposal?`)) return;
    try {
      await api.post(`/portal/proposals/${open}/respond`, { decision, note });
      setOpen(null);
      setNote('');
      reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Proposals" />
      {!data?.length ? <Empty title="No proposals yet" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((x) => (
            <button key={x._id} onClick={() => { setOpen(x._id); setErr(''); }} className="card card-hover p-5 text-left">
              <div className="flex justify-between gap-2"><h2 className="font-semibold">{x.title}</h2><Badge>{x.status}</Badge></div>
              <p className="mt-1 font-mono text-xs text-slate-500">{x.number}</p>
              <p className="mt-3 line-clamp-2 text-sm text-slate-400">{x.summary}</p>
              <div className="mt-4 flex justify-between text-sm"><span className="font-semibold text-white">{fmtMoney(x.total, x.currency)}</span><span className="text-slate-500">Valid until {fmtDate(x.validUntil)}</span></div>
            </button>
          ))}
        </div>
      )}
      <Modal open={!!open} onClose={() => setOpen(null)} title={p?.title || 'Proposal'} wide>
        {!p ? <PageLoader /> : (
          <div className="space-y-6 text-sm">
            <div className="flex flex-wrap gap-3"><Badge>{p.status}</Badge><span className="text-slate-500">{p.number} · sent {fmtDate(p.sentAt)} · valid until {fmtDate(p.validUntil)}</span></div>
            {p.summary && <p className="text-slate-300">{p.summary}</p>}
            {p.scope && <div><h3 className="mb-2 font-semibold">Scope of work</h3><p className="whitespace-pre-line text-slate-300">{p.scope}</p></div>}
            {p.deliverables?.length > 0 && <div><h3 className="mb-2 font-semibold">Deliverables</h3><ul className="space-y-1">{p.deliverables.map((d) => <li key={d} className="flex gap-2 text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{d}</li>)}</ul></div>}
            {p.timeline && <div><h3 className="mb-1 font-semibold">Timeline</h3><p className="text-slate-300">{p.timeline}</p></div>}
            {p.milestones?.length > 0 && <div><h3 className="mb-2 font-semibold">Payment milestones</h3>{p.milestones.map((m) => <p key={m._id} className="flex justify-between border-b border-ink-700 py-1.5 text-slate-300"><span>{m.title}{m.dueInDays ? ` (day ${m.dueInDays})` : ''}</span><span>{fmtMoney(m.amount, p.currency)}</span></p>)}</div>}
            <div>
              <h3 className="mb-2 font-semibold">Pricing</h3>
              <table className="table-x"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th className="text-right">Amount</th></tr></thead>
                <tbody>{p.items.map((i) => <tr key={i._id}><td>{i.description}</td><td>{i.quantity}</td><td>{fmtMoney(i.unitPrice, p.currency)}</td><td className="text-right">{fmtMoney(i.quantity * i.unitPrice, p.currency)}</td></tr>)}</tbody>
              </table>
              <p className="mt-3 text-right text-lg font-semibold text-white">Total {fmtMoney(p.total, p.currency)}</p>
            </div>
            {['Sent', 'Viewed'].includes(p.status) ? (
              <div className="space-y-3 rounded-xl border border-ink-600 p-4">
                <Textarea rows={2} placeholder="Optional note to the team" value={note} onChange={(e) => setNote(e.target.value)} />
                <ErrorBox>{err}</ErrorBox>
                <div className="flex justify-end gap-2"><Button variant="danger" onClick={() => respond('Declined')}>Decline</Button><Button onClick={() => respond('Accepted')}>Accept proposal</Button></div>
                <p className="text-xs text-slate-500">E-signature support is planned for a future release.</p>
              </div>
            ) : p.respondedAt && <p className="text-slate-400">You {p.status.toLowerCase()} this proposal on {fmtDate(p.respondedAt)}.</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============ 10.7 Invoices & payments ============
export function Invoices() {
  const { data, loading } = useFetch('/portal/invoices');
  if (loading) return <PageLoader />;
  const payments = (data || []).flatMap((i) => i.payments.map((p) => ({ ...p, number: i.number, currency: i.currency })));
  return (
    <div className="space-y-6">
      <PageHeader title="Invoices & payments" />
      {!data?.length ? <Empty title="No invoices yet" /> : (
        <div className="card overflow-x-auto">
          <table className="table-x">
            <thead><tr><th>Invoice</th><th>Project</th><th>Issued</th><th>Due</th><th>Total</th><th>Balance</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.map((i) => (
                <tr key={i._id}>
                  <td className="font-mono text-white">{i.number}</td>
                  <td className="text-slate-400">{i.project?.name || '—'}</td>
                  <td className="text-slate-400">{fmtDate(i.issueDate)}</td>
                  <td className="text-slate-400">{fmtDate(i.dueDate)}</td>
                  <td>{fmtMoney(i.total, i.currency)}</td>
                  <td className={i.total - i.amountPaid > 0 ? 'text-amber-300' : 'text-emerald-300'}>{fmtMoney(i.total - i.amountPaid, i.currency)}</td>
                  <td><Badge>{i.status}</Badge></td>
                  <td className="whitespace-nowrap text-right">
                    <Link to={`/portal/invoices/${i._id}`} className="btn-ghost btn-sm">View / download</Link>
                    {i.paymentLink && i.status !== 'Paid' && <a href={i.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm ml-2">Pay now</a>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Payment history</h2>
        {payments.length === 0 ? <p className="text-sm text-slate-500">No payments recorded yet.</p> : (
          <ul className="space-y-2">{payments.map((p) => <li key={p._id} className="flex justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm"><span>{fmtDate(p.paidAt)} · <span className="font-mono">{p.number}</span></span><span className="text-slate-400">{p.method}{p.reference ? ` · ${p.reference}` : ''}</span><span className="text-emerald-300">{fmtMoney(p.amount, p.currency)}</span></li>)}</ul>
        )}
      </div>
    </div>
  );
}

export function InvoiceView() {
  const { id } = useParams();
  const { data: i, loading, error } = useFetch(`/portal/invoices/${id}`);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-4 flex justify-between">
        <Link to="/portal/invoices" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Invoices</Link>
        <div className="flex gap-2">
          {i.paymentLink && i.status !== 'Paid' && <a href={i.paymentLink} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm">Pay now</a>}
          <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" /> Download PDF / Print</Button>
        </div>
      </div>
      <div className="rounded-2xl bg-snow p-8 text-neutral-800 shadow-2xl sm:p-12">
        <div className="flex justify-between">
          <div className="flex items-center gap-3"><img src="/brand/zeviro-icon-64.png" alt="" className="h-11 w-11 rounded-xl" /><div><p className="text-2xl font-bold leading-none text-neutral-900">Zeviro</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-violet-600">Agency</p><p className="mt-1 text-xs text-neutral-500">zeviro.agency</p></div></div>
          <div className="text-right"><p className="text-xl font-semibold text-neutral-900">{i.status === 'Paid' ? 'RECEIPT' : 'INVOICE'}</p><p className="font-mono text-sm">{i.number}</p><p className="mt-1 inline-block rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium">{i.status}</p></div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
          <div><p className="text-xs uppercase text-neutral-400">Billed to</p><p className="font-semibold text-neutral-900">{i.client?.name}</p><p>{i.client?.primaryContact?.name}</p><p>{i.client?.primaryContact?.email}</p><p>{i.client?.address}</p></div>
          <div className="text-right"><p><span className="text-neutral-400">Issued:</span> {fmtDate(i.issueDate)}</p><p><span className="text-neutral-400">Due:</span> {fmtDate(i.dueDate)}</p>{i.project && <p><span className="text-neutral-400">Project:</span> {i.project.name}</p>}</div>
        </div>
        <table className="mt-10 w-full text-sm">
          <thead><tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-400"><th className="py-2">Description</th><th>Qty</th><th>Unit price</th><th className="text-right">Amount</th></tr></thead>
          <tbody>{i.items.map((it) => <tr key={it._id} className="border-b border-neutral-100"><td className="py-3">{it.description}</td><td>{it.quantity}</td><td>{fmtMoney(it.unitPrice, i.currency)}</td><td className="text-right">{fmtMoney(it.quantity * it.unitPrice, i.currency)}</td></tr>)}</tbody>
        </table>
        <div className="ml-auto mt-6 w-64 space-y-1 text-sm">
          <p className="flex justify-between"><span className="text-neutral-500">Subtotal</span>{fmtMoney(i.subtotal, i.currency)}</p>
          {i.taxRate > 0 && <p className="flex justify-between"><span className="text-neutral-500">Tax ({i.taxRate}%)</span>{fmtMoney(i.total - i.subtotal, i.currency)}</p>}
          <p className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900"><span>Total</span>{fmtMoney(i.total, i.currency)}</p>
          <p className="flex justify-between text-emerald-600"><span>Paid</span>{fmtMoney(i.amountPaid, i.currency)}</p>
          <p className="flex justify-between font-semibold"><span>Balance due</span>{fmtMoney(i.total - i.amountPaid, i.currency)}</p>
        </div>
        {i.notes && <p className="mt-8 text-sm text-neutral-500">{i.notes}</p>}
        {i.payments.length > 0 && (
          <div className="mt-8 text-sm"><p className="mb-2 text-xs uppercase text-neutral-400">Payments</p>{i.payments.map((p) => <p key={p._id}>{fmtDate(p.paidAt)} — {p.method} {p.reference && `(${p.reference})`} — {fmtMoney(p.amount, i.currency)}</p>)}</div>
        )}
        <p className="mt-12 text-center text-xs text-neutral-400">Thank you for your business.</p>
      </div>
    </div>
  );
}

// ============ 10.8 Meetings ============
export function Meetings() {
  const { data, loading, reload } = useFetch('/portal/meetings');
  const projects = useFetch('/portal/projects');
  const [booking, setBooking] = useState(false);
  const [resched, setResched] = useState(null);
  const [newTime, setNewTime] = useState('');
  const [err, setErr] = useState('');
  const act = async (id, body) => {
    setErr('');
    try {
      await api.patch(`/portal/meetings/${id}`, body);
      setResched(null);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  const ics = (m) => {
    const f = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(new Date(m.startsAt).getTime() + (m.durationMin || 30) * 60000);
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zeviro//Portal//EN', 'BEGIN:VEVENT', `UID:${m._id}@zeviro.agency`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(m.startsAt)}`, `DTEND:${f(end)}`, `SUMMARY:${m.title} (Zeviro)`, `DESCRIPTION:${(m.agenda || '').replace(/\n/g, ' ')} ${m.meetingLink || ''}`, `LOCATION:${m.meetingLink || 'Online'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = `${m.title.replace(/\s+/g, '-')}.ics`;
    a.click();
  };
  if (loading) return <PageLoader />;
  const Row = ({ m, upcoming }) => (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <span className="rounded-xl bg-brand-500/10 p-3 text-brand-300"><CalendarClock className="h-5 w-5" /></span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-white">{m.title}</p><Badge>{m.status}</Badge></div>
        <p className="text-sm text-slate-400">{fmtDateTime(m.startsAt)} · {m.durationMin || 30} min{m.host ? ` · with ${m.host.name}` : ''}</p>
        {m.agenda && <p className="mt-1 text-xs text-slate-500">{m.agenda}</p>}
      </div>
      {upcoming && (
        <div className="flex flex-wrap gap-2">
          {m.meetingLink && <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><Video className="h-3.5 w-3.5" /> Join</a>}
          <Button size="sm" variant="ghost" onClick={() => ics(m)}>Add to calendar</Button>
          <Button size="sm" variant="ghost" onClick={() => { setResched(m); setNewTime(''); }}>Reschedule</Button>
          <Button size="sm" variant="danger" onClick={() => window.confirm('Cancel this meeting?') && act(m._id, { action: 'cancel' })}>Cancel</Button>
        </div>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Meetings" subtitle="Changes are possible up to 24 hours before a meeting." actions={<Button onClick={() => setBooking(true)}><Plus className="h-4 w-4" /> Request a meeting</Button>} />
      <ErrorBox>{err}</ErrorBox>
      <div><h2 className="mb-3 font-semibold">Upcoming</h2><div className="space-y-3">{data.upcoming.length ? data.upcoming.map((m) => <Row key={m._id} m={m} upcoming />) : <Empty title="No upcoming meetings" />}</div></div>
      <div><h2 className="mb-3 font-semibold">Previous</h2><div className="space-y-3">{data.previous.length ? data.previous.map((m) => <Row key={m._id} m={m} />) : <p className="text-sm text-slate-500">No previous meetings.</p>}</div></div>

      <Modal open={booking} onClose={() => setBooking(false)} title="Request a meeting">
        <ResourceForm
          fields={[{ name: 'title', label: 'Topic', required: true, default: 'Project check-in' }, { name: 'startsAt', label: 'Preferred date & time', type: 'datetime', required: true }, { name: 'durationMin', label: 'Duration (min)', type: 'select', options: ['15', '30', '45', '60'], default: '30' }, { name: 'project', label: 'Project', type: 'select', options: (projects.data || []).map((p) => ({ value: p._id, label: p.name })) }, { name: 'agenda', label: 'Agenda', type: 'textarea', rows: 3 }]}
          onCancel={() => setBooking(false)}
          onSubmit={async (b) => { await api.post('/portal/meetings', { ...b, durationMin: Number(b.durationMin) || 30, project: b.project || undefined }); setBooking(false); reload(); }}
          submitLabel="Send request"
        />
      </Modal>
      <Modal open={!!resched} onClose={() => setResched(null)} title="Reschedule meeting" footer={<><Button variant="ghost" onClick={() => setResched(null)}>Close</Button><Button onClick={() => newTime && act(resched._id, { action: 'reschedule', startsAt: new Date(newTime).toISOString() })}>Request new time</Button></>}>
        <Field label="New date & time"><Input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

// ============ 10.9 Support ============
export function Support() {
  const { data, loading, reload, setData } = useFetch('/portal/tickets');
  const projects = useFetch('/portal/projects');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('open');
  const t = data?.find((x) => x._id === open);
  const list = (data || []).filter((x) => (tab === 'open' ? !['Resolved', 'Closed'].includes(x.status) : ['Resolved', 'Closed'].includes(x.status)));

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setErr('');
    try {
      const r = await api.post(`/portal/tickets/${open}/replies`, { body: reply });
      setData((l) => l.map((x) => (x._id === open ? { ...x, ...r } : x)));
      setReply('');
    } catch (e2) {
      setErr(errMsg(e2));
    }
  };
  if (loading) return <PageLoader />;
  return (
    <div>
      <PageHeader title="Support" subtitle="Create a ticket for bugs, change requests, billing or anything else." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New ticket</Button>} />
      <div className="mb-4"><Tabs tabs={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Resolved / closed' }]} value={tab} onChange={setTab} /></div>
      {!list.length ? <Empty title="No tickets here" /> : (
        <div className="space-y-3">
          {list.map((x) => (
            <button key={x._id} onClick={() => setOpen(x._id)} className="card card-hover flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center">
              <div className="flex-1"><p className="font-medium text-white">{x.subject}</p><p className="text-xs text-slate-500">{x.ticketNo} · {x.category}{x.project ? ` · ${x.project.name}` : ''} · updated {timeAgo(x.updatedAt)}</p></div>
              <div className="flex gap-2"><Badge>{x.priority}</Badge><Badge>{x.status}</Badge></div>
            </button>
          ))}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="New support ticket">
        <ResourceForm
          fields={[{ name: 'subject', label: 'Subject', required: true, full: true }, { name: 'category', label: 'Category', type: 'select', options: ['Technical', 'Bug', 'Change Request', 'Billing', 'General'], default: 'Technical', required: true }, { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium', required: true }, { name: 'project', label: 'Project', type: 'select', options: (projects.data || []).map((p) => ({ value: p._id, label: p.name })) }, { name: 'description', label: 'Describe the issue', type: 'textarea', required: true, rows: 5 }]}
          onCancel={() => setCreating(false)}
          onSubmit={async (b) => { await api.post('/portal/tickets', { ...b, project: b.project || undefined }); setCreating(false); reload(); }}
          submitLabel="Create ticket"
        />
      </Modal>
      <Modal open={!!t} onClose={() => setOpen(null)} title={t ? `${t.ticketNo} — ${t.subject}` : ''} wide>
        {t && (
          <>
            <div className="mb-3 flex gap-2"><Badge>{t.status}</Badge><Badge>{t.priority}</Badge><span className="text-xs text-slate-500">{t.category} · opened {fmtDateTime(t.createdAt)}</span></div>
            <p className="whitespace-pre-line rounded-xl bg-ink-900 p-4 text-sm text-slate-200">{t.description}</p>
            <div className="mt-4 space-y-3">
              {t.replies.map((r) => (
                <div key={r._id} className={cn('rounded-xl p-3 text-sm', r.fromClient ? 'border border-brand-500/30 bg-brand-500/10' : 'bg-ink-800')}>
                  <p className="whitespace-pre-line text-slate-200">{r.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{r.fromClient ? 'You' : `${r.by?.name} (Zeviro)`} · {timeAgo(r.createdAt)}</p>
                </div>
              ))}
            </div>
            {t.status !== 'Closed' ? (
              <form onSubmit={send} className="mt-4 space-y-2">
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Add a reply…" />
                <ErrorBox>{err}</ErrorBox>
                <div className="flex justify-end"><Button size="sm" type="submit">Send reply</Button></div>
              </form>
            ) : <p className="mt-4 text-sm text-slate-500">This ticket is closed.</p>}
          </>
        )}
      </Modal>
    </div>
  );
}

// ============ 10.10 Profile & settings ============
export function Profile() {
  const { user, setUser } = useAuth();
  const { data, reload } = useFetch('/portal/profile');
  const [msg, setMsg] = useState({ ok: '', err: '' });
  const prefs = [['email', 'Email notifications'], ['inApp', 'In-app notifications'], ['messages', 'New messages'], ['projects', 'Project & task updates'], ['invoices', 'Invoices & payments']];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Profile & settings" />
      <ErrorBox>{msg.err}</ErrorBox><SuccessBox>{msg.ok}</SuccessBox>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Profile photo</h2>
        <AvatarUploader />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Personal information</h2>
        <ResourceForm
          fields={[{ name: 'name', label: 'Full name', required: true }, { name: 'title', label: 'Job title' }, { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', readOnly: true, hint: 'Contact us to change your login email' }]}
          initial={user}
          onSubmit={async (b) => { const r = await api.patch('/auth/me', b); setUser(r.user); reconnectSocket(); setMsg({ ok: 'Profile saved', err: '' }); }}
        />
      </div>
      {data?.client && (
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Company information</h2>
          <ResourceForm
            key={data.client.updatedAt}
            fields={[{ name: 'name', label: 'Company name', required: true }, { name: 'website', label: 'Website' }, { name: 'country', label: 'Country', type: 'select', options: COUNTRIES }, { name: 'address', label: 'Billing address' }, { name: 'logo', label: 'Logo URL', full: true }]}
            initial={data.client}
            onSubmit={async (b) => { await api.put('/portal/company', b); reload(); setMsg({ ok: 'Company details saved', err: '' }); }}
          />
        </div>
      )}
      <div className="card p-5">
        <h2 className="font-semibold">Appearance</h2>
        <p className="mb-4 mt-1 text-sm text-slate-400">Choose how Zeviro looks to you. "System" follows your device setting.</p>
        <ThemeSwitcher variant="cards" />
      </div>
      <div className="card p-5">
        <h2 className="mb-4 font-semibold">Notification preferences</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {prefs.map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-violet-500" checked={user.notificationPrefs?.[k] !== false} onChange={async (e) => { const r = await api.patch('/auth/me', { notificationPrefs: { ...user.notificationPrefs, [k]: e.target.checked } }); setUser(r.user); }} /> {l}</label>
          ))}
        </div>
      </div>
      <PhoneVerify />
      <ChangePassword onDone={setMsg} />
      <p className="flex items-center gap-2 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" /> Last login: {fmtDateTime(user.lastLoginAt)}</p>
    </div>
  );
}
