import { useState } from 'react';
import { useSocketEvent } from '../../lib/realtime';
import { CountUp } from '../../components/LiveStats';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, CheckCircle2, Circle, Loader, Trash2, Upload, Download } from 'lucide-react';
import Resource, { ResourceForm } from '../../components/Resource';
import { Badge, Button, Modal, PageLoader, ErrorBox, Progress, Input, Select, Empty } from '../../components/ui';
import { api, errMsg } from '../../api/http';
import { useFetch, fmtDate, timeAgo, fmtSize, SERVICES } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['Not Started', 'In Progress', 'Review', 'Revision', 'Completed', 'On Hold'];
export const PROJECT_FIELDS = [
  { name: 'name', label: 'Project name', required: true },
  { name: 'client', label: 'Client', type: 'ref', ref: { endpoint: '/clients' }, required: true },
  { name: 'service', label: 'Service', type: 'select', options: SERVICES },
  { name: 'status', label: 'Status', type: 'select', options: STATUSES, default: 'Not Started', required: true },
  { name: 'progress', label: 'Progress %', type: 'number', default: 0 },
  { name: 'budget', label: 'Budget (USD)', type: 'number' },
  { name: 'startDate', label: 'Start date', type: 'date' },
  { name: 'deadline', label: 'Deadline', type: 'date' },
  { name: 'manager', label: 'Project manager', type: 'ref', ref: { endpoint: '/staff' } },
  { name: 'team', label: 'Team', type: 'refs', ref: { endpoint: '/staff' } },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export function Projects() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { can, user } = useAuth();
  const manage = ['superadmin', 'admin', 'pm'].includes(user.role);
  return (
    <Resource
      liveEvents={['project:update', 'order:update']}
      endpoint="/projects"
      title="Projects"
      createLabel="New project"
      fields={manage ? PROJECT_FIELDS : undefined}
      canCreate={manage}
      canEdit={manage}
      canDelete={['superadmin', 'admin'].includes(user.role)}
      params={params.get('client') ? { client: params.get('client') } : {}}
      filters={[{ name: 'status', label: 'All statuses', options: STATUSES }]}
      onRowClick={(r) => nav(`/admin/projects/${r._id}`)}
      columns={[
        { label: 'Project', render: (r) => <><p className="font-medium text-white">{r.name}</p><p className="text-xs text-slate-500">{r.service}</p></> },
        { label: 'Client', render: (r) => r.client?.name || '—' },
        { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
        { label: 'Progress', render: (r) => <div className="w-32"><Progress value={r.progress} /><span className="text-xs text-slate-500">{r.progress}%</span></div> },
        { label: 'Deadline', render: (r) => <span className={r.deadline && new Date(r.deadline) < new Date() && r.status !== 'Completed' ? 'text-rose-300' : 'text-slate-400'}>{fmtDate(r.deadline)}</span> },
        { label: 'Manager', render: (r) => r.manager?.name || '—' },
      ]}
      emptyText={can('clients') ? 'Create a project and attach it to a client.' : 'Projects you are assigned to appear here.'}
    />
  );
}

export function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const manage = ['superadmin', 'admin', 'pm'].includes(user.role);
  const { data: p, loading, error, reload, setData, refresh } = useFetch(`/projects/${id}`);
  useSocketEvent('project:update', (d) => String(d.projectId) === id && refresh());
  const tasks = useFetch('/tasks', { project: id, limit: 100 });
  const files = useFetch('/files', { project: id, limit: 100 });
  const [editing, setEditing] = useState(false);
  const [ms, setMs] = useState({ title: '', dueDate: '' });
  const [update, setUpdate] = useState('');
  const [upload, setUpload] = useState({ category: 'Deliverable', visibleToClient: 'true' });
  const [err, setErr] = useState('');

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;

  const run = async (fn) => {
    setErr('');
    try {
      const r = await fn();
      if (r?._id) setData(r);
      else reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };
  const doneMs = p.milestones.filter((m) => m.status === 'Completed').length;
  const tItems = tasks.data?.items || [];

  return (
    <div className="space-y-6">
      <Link to="/admin/projects" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Projects</Link>
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{p.name}</h1><Badge>{p.status}</Badge></div>
          <p className="mt-1 text-sm text-slate-400">{p.client?.name} · {p.service} · PM {p.manager?.name || '—'} · {fmtDate(p.startDate)} → {fmtDate(p.deadline)}</p>
        </div>
        {manage && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit project</Button>}
      </div>
      <ErrorBox>{err}</ErrorBox>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card p-4 sm:col-span-2">
          <p className="text-xs uppercase text-slate-500">Progress</p>
          <div className="mt-2 flex items-center gap-3"><Progress value={p.progress} /><span className="font-display text-xl font-semibold text-white"><CountUp value={p.progress} />%</span></div>
          {manage && <input type="range" min="0" max="100" step="5" defaultValue={p.progress} onMouseUp={(e) => run(() => api.patch(`/projects/${id}`, { progress: Number(e.target.value) }))} onTouchEnd={(e) => run(() => api.patch(`/projects/${id}`, { progress: Number(e.target.value) }))} className="mt-3 w-full accent-violet-500" aria-label="Update progress" />}
        </div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Milestones</p><p className="mt-1 font-display text-2xl font-semibold text-white">{doneMs}/{p.milestones.length}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Tasks done</p><p className="mt-1 font-display text-2xl font-semibold text-white">{tItems.filter((t) => t.status === 'Done').length}/{tItems.length}</p></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Milestones</h2>
          <ul className="space-y-2">
            {p.milestones.map((m) => (
              <li key={m._id} className="flex items-center gap-3 rounded-xl border border-ink-600 p-3">
                {m.status === 'Completed' ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : m.status === 'In Progress' ? <Loader className="h-5 w-5 text-sky-400" /> : <Circle className="h-5 w-5 text-slate-600" />}
                <div className="flex-1"><p className="text-sm text-white">{m.title}</p><p className="text-xs text-slate-500">Due {fmtDate(m.dueDate)}</p></div>
                {manage ? (
                  <>
                    <Select className="w-36 py-1.5 text-xs" value={m.status} onChange={(e) => run(() => api.patch(`/projects/${id}/milestones/${m._id}`, { status: e.target.value }))} options={['Pending', 'In Progress', 'Completed']} />
                    <button onClick={() => run(() => api.del(`/projects/${id}/milestones/${m._id}`))} className="text-slate-500 hover:text-rose-300" aria-label="Delete milestone"><Trash2 className="h-4 w-4" /></button>
                  </>
                ) : <Badge>{m.status}</Badge>}
              </li>
            ))}
          </ul>
          {manage && (
            <form onSubmit={(e) => { e.preventDefault(); if (!ms.title) return; run(() => api.post(`/projects/${id}/milestones`, { title: ms.title, dueDate: ms.dueDate || undefined })); setMs({ title: '', dueDate: '' }); }} className="mt-4 flex gap-2">
              <Input placeholder="New milestone" value={ms.title} onChange={(e) => setMs({ ...ms, title: e.target.value })} />
              <Input type="date" className="w-40" value={ms.dueDate} onChange={(e) => setMs({ ...ms, dueDate: e.target.value })} />
              <Button size="sm" type="submit"><Plus className="h-4 w-4" /></Button>
            </form>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Tasks</h2><Button size="sm" variant="ghost" to={`/admin/tasks?project=${id}`}>Manage tasks</Button></div>
          {tItems.length === 0 ? <Empty title="No tasks yet" /> : (
            <ul className="space-y-2">
              {tItems.map((t) => (
                <li key={t._id} className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm">
                  <span className="text-slate-200">{t.title} {t.visibleToClient && <span className="ml-1 text-[10px] text-brand-300">CLIENT</span>}</span>
                  <span className="flex items-center gap-2"><span className="text-xs text-slate-500">{t.assignee?.name}</span><Badge>{t.status}</Badge></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Files</h2>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Select className="w-40 py-1.5 text-xs" value={upload.category} onChange={(e) => setUpload({ ...upload, category: e.target.value })} options={['Requirements', 'Design Preview', 'Document', 'Deliverable', 'Attachment', 'Other']} />
            <Select className="w-40 py-1.5 text-xs" value={upload.visibleToClient} onChange={(e) => setUpload({ ...upload, visibleToClient: e.target.value })} options={[{ value: 'true', label: 'Visible to client' }, { value: 'false', label: 'Internal only' }]} />
            <label className="btn-ghost btn-sm cursor-pointer"><Upload className="h-3.5 w-3.5" /> Upload<input type="file" multiple className="hidden" onChange={(e) => run(async () => { await api.upload('/files', e.target.files, { project: id, ...upload }); files.reload(); })} /></label>
          </div>
          <ul className="space-y-2">
            {(files.data?.items || []).map((f) => (
              <li key={f._id} className="flex items-center justify-between rounded-lg bg-ink-900 px-3 py-2 text-sm">
                <span className="truncate text-slate-200">{f.originalName} <span className="text-xs text-slate-500">· {f.category} · {fmtSize(f.size)}{!f.visibleToClient && ' · internal'}</span></span>
                <a href={f.url} className="text-slate-400 hover:text-white" aria-label="Download"><Download className="h-4 w-4" /></a>
              </li>
            ))}
            {!files.data?.items?.length && <li className="text-sm text-slate-500">No files yet.</li>}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">Activity timeline</h2>
          <form onSubmit={(e) => { e.preventDefault(); if (!update.trim()) return; run(() => api.post(`/projects/${id}/activity`, { text: update })); setUpdate(''); }} className="mb-4 flex gap-2">
            <Input placeholder="Post a project update (visible to client)" value={update} onChange={(e) => setUpdate(e.target.value)} />
            <Button size="sm" type="submit">Post</Button>
          </form>
          <ol className="space-y-3 border-l border-ink-600 pl-4">
            {[...p.activity].reverse().map((a) => (
              <li key={a._id} className="text-sm"><p className="text-slate-200">{a.text}</p><p className="text-xs text-slate-500">{a.by?.name || 'System'} · {timeAgo(a.createdAt)}</p></li>
            ))}
          </ol>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit project" wide>
        <ResourceForm fields={PROJECT_FIELDS} initial={p} onCancel={() => setEditing(false)} onSubmit={async (b) => { await api.patch(`/projects/${id}`, b); setEditing(false); reload(); }} />
      </Modal>
    </div>
  );
}
