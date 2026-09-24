import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Eye } from 'lucide-react';
import Resource from '../../components/Resource';
import { Badge, Modal, Button, Textarea } from '../../components/ui';
import { api } from '../../api/http';
import { fmtDate, timeAgo, useFetch } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

const STATUSES = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function Comments({ task, onClose }) {
  const { data, setData } = useFetch(`/tasks/${task._id}`);
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const t = data || task;
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setData(await api.post(`/tasks/${task._id}/comments`, { text, internal }));
    setText('');
  };
  return (
    <Modal open onClose={onClose} title={t.title} wide>
      <p className="mb-4 whitespace-pre-line text-sm text-slate-400">{t.description || 'No description.'}</p>
      <div className="mb-4 flex flex-wrap gap-2 text-xs"><Badge>{t.status}</Badge><Badge>{t.priority}</Badge>{t.visibleToClient && <Badge tone="violet">Visible to client</Badge>}<span className="text-slate-500">Due {fmtDate(t.dueDate)}</span></div>
      <div className="space-y-3">
        {(t.comments || []).map((c) => (
          <div key={c._id} className={`rounded-xl p-3 text-sm ${c.internal ? 'border border-amber-500/30 bg-amber-500/5' : c.by?.role === 'client' ? 'border border-brand-500/30 bg-brand-500/10' : 'bg-ink-900'}`}>
            <p className="text-slate-200">{c.text}</p>
            <p className="mt-1 text-xs text-slate-500">{c.by?.name} {c.by?.role === 'client' && '(client)'} · {timeAgo(c.createdAt)} {c.internal && '· internal'}</p>
          </div>
        ))}
        {!t.comments?.length && <p className="text-sm text-slate-500">No comments yet.</p>}
      </div>
      <form onSubmit={send} className="mt-4 space-y-2">
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a comment…" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" className="accent-violet-500" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (hidden from client)</label>
          <Button size="sm" type="submit">Comment</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Tasks() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [open, setOpen] = useState(null);
  const [mine, setMine] = useState(user.role === 'developer');
  const project = params.get('project');
  return (
    <>
      <Resource
        liveEvents={['project:update']}
        endpoint="/tasks"
        title="Tasks"
        createLabel="New task"
        params={{ ...(project && { project }), ...(mine && { mine: '1' }) }}
        headerActions={<Button variant="ghost" onClick={() => setMine((v) => !v)}>{mine ? 'Showing: my tasks' : 'Showing: all tasks'}</Button>}
        defaultValues={project ? { project } : {}}
        fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'project', label: 'Project', type: 'ref', ref: { endpoint: '/projects' }, required: true },
          { name: 'assignee', label: 'Assignee', type: 'ref', ref: { endpoint: '/staff' } },
          { name: 'status', label: 'Status', type: 'select', options: STATUSES, default: 'To Do', required: true },
          { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, default: 'Medium', required: true },
          { name: 'dueDate', label: 'Due date', type: 'date' },
          { name: 'visibleToClient', label: 'Client visibility', type: 'checkbox', checkboxLabel: 'Show this task in the client portal' },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        filters={[{ name: 'status', label: 'All statuses', options: STATUSES }, { name: 'priority', label: 'All priorities', options: PRIORITIES }]}
        onRowClick={(r) => setOpen(r)}
        rowActions={(r) => <button onClick={() => setOpen(r)} className="rounded-lg p-1.5 text-slate-400 hover:bg-ink-700 hover:text-white" aria-label="Comments"><MessageSquare className="h-4 w-4" /></button>}
        columns={[
          { label: 'Task', render: (r) => <><p className="font-medium text-white">{r.title}</p><p className="text-xs text-slate-500">{r.project?.name}</p></> },
          { label: 'Assignee', render: (r) => r.assignee?.name || '—' },
          { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { label: 'Priority', render: (r) => <Badge>{r.priority}</Badge> },
          { label: 'Due', render: (r) => <span className={r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'Done' ? 'text-rose-300' : 'text-slate-400'}>{fmtDate(r.dueDate)}</span> },
          { label: 'Client', render: (r) => (r.visibleToClient ? <Eye className="h-4 w-4 text-brand-300" /> : <span className="text-slate-600">—</span>) },
          { label: 'Comments', render: (r) => <span className="text-slate-400">{r.comments?.length || 0}</span> },
        ]}
      />
      {open && <Comments task={open} onClose={() => setOpen(null)} />}
    </>
  );
}
