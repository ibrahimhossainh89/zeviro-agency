import { useState } from 'react';
import Resource from '../../components/Resource';
import { Badge, Modal, Button, Textarea, Select } from '../../components/ui';
import { api } from '../../api/http';
import { useFetch, timeAgo, fmtDateTime } from '../../lib/utils';

const STATUSES = ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const CATEGORIES = ['Technical', 'Billing', 'Change Request', 'Bug', 'General'];

function TicketView({ id, onClose }) {
  const { data: t, setData } = useFetch(`/tickets/${id}`);
  const staff = useFetch('/staff');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  if (!t) return null;
  const reply = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setData(await api.post(`/tickets/${id}/replies`, { body, ...(status && { status }) }));
    setBody('');
    setStatus('');
  };
  const patch = async (b) => setData(await api.patch(`/tickets/${id}`, b));
  return (
    <Modal open onClose={onClose} title={`${t.ticketNo} — ${t.subject}`} wide>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Select value={t.status} onChange={(e) => patch({ status: e.target.value })} options={STATUSES} />
        <Select value={t.priority} onChange={(e) => patch({ priority: e.target.value })} options={PRIORITIES} />
        <Select value={t.assignee?._id || ''} onChange={(e) => patch({ assignee: e.target.value || null })} options={(staff.data || []).map((s) => ({ value: s._id, label: s.name }))} placeholder="Unassigned" />
      </div>
      <p className="text-xs text-slate-500">{t.client?.name} · {t.category} · opened {fmtDateTime(t.createdAt)}{t.project ? ` · ${t.project.name}` : ''}</p>
      <p className="mt-3 whitespace-pre-line rounded-xl bg-ink-900 p-4 text-sm text-slate-200">{t.description}</p>
      <div className="mt-4 space-y-3">
        {t.replies.map((r) => (
          <div key={r._id} className={`rounded-xl p-3 text-sm ${r.fromClient ? 'border border-brand-500/30 bg-brand-500/10' : 'bg-ink-800'}`}>
            <p className="whitespace-pre-line text-slate-200">{r.body}</p>
            <p className="mt-1 text-xs text-slate-500">{r.by?.name}{r.fromClient ? ' (client)' : ''} · {timeAgo(r.createdAt)}</p>
          </div>
        ))}
      </div>
      <form onSubmit={reply} className="mt-4 space-y-2">
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply to the client…" />
        <div className="flex justify-end gap-2">
          <Select className="w-48" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUSES} placeholder="Keep status" />
          <Button type="submit" size="sm">Send reply</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Tickets() {
  const [open, setOpen] = useState(null);
  return (
    <>
      <Resource
        endpoint="/tickets"
        title="Support Tickets"
        createLabel="New ticket"
        fields={[
          { name: 'subject', label: 'Subject', required: true },
          { name: 'client', label: 'Client', type: 'ref', ref: { endpoint: '/clients' }, required: true },
          { name: 'category', label: 'Category', type: 'select', options: CATEGORIES, default: 'General', required: true },
          { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, default: 'Medium', required: true },
          { name: 'status', label: 'Status', type: 'select', options: STATUSES, default: 'Open', required: true },
          { name: 'assignee', label: 'Assignee', type: 'ref', ref: { endpoint: '/staff' } },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        filters={[{ name: 'status', label: 'All statuses', options: STATUSES }, { name: 'priority', label: 'All priorities', options: PRIORITIES }, { name: 'category', label: 'All categories', options: CATEGORIES }]}
        onRowClick={(r) => setOpen(r._id)}
        columns={[
          { label: 'Ticket', render: (r) => <><p className="font-medium text-white">{r.subject}</p><p className="font-mono text-xs text-slate-500">{r.ticketNo}</p></> },
          { label: 'Client', render: (r) => r.client?.name },
          { label: 'Category', key: 'category' },
          { label: 'Priority', render: (r) => <Badge>{r.priority}</Badge> },
          { label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          { label: 'Assignee', render: (r) => r.assignee?.name || '—' },
          { label: 'Updated', render: (r) => <span className="text-xs text-slate-500">{timeAgo(r.updatedAt)}</span> },
        ]}
      />
      {open && <TicketView id={open} onClose={() => setOpen(null)} />}
    </>
  );
}
