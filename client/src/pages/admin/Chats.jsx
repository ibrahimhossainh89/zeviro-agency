import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Bot, User, Headphones, UserPlus, XCircle, Circle } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Badge, Button, Modal, PageHeader, Select, Empty, ErrorBox, Avatar } from '../../components/ui';
import MessageList, { fromChatMessage } from '../../components/MessageList';
import { useSocketEvent, useSocketJoin, useTypingEmitter, useRemoteTyping } from '../../lib/realtime';
import { ResourceForm } from '../../components/Resource';
import { useFetch, timeAgo, cn, SERVICES } from '../../lib/utils';

export default function Chats() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('c');
  const [status, setStatus] = useState('');
  const list = useFetch('/chat/admin', { status, limit: 50 });
  const staff = useFetch('/staff');
  const [conv, setConv] = useState(null);
  const [reply, setReply] = useState('');
  const [online, setOnline] = useState(false);
  const [converting, setConverting] = useState(false);
  const [err, setErr] = useState('');
  const endRef = useRef();

  useEffect(() => { if (list.data) setOnline(list.data.online); }, [list.data]);
  // ---------- real-time ----------
  useSocketJoin('chat:join', selected ? { convId: selected } : null);
  const typingOut = useTypingEmitter('chat:typing', selected ? { convId: selected } : null);
  const [visitorTyping, setVisitorTyping] = useRemoteTyping();
  const listTimer = useRef(null);
  useSocketEvent('chat:list', () => {
    clearTimeout(listTimer.current); // debounce bursts of updates
    listTimer.current = setTimeout(() => list.reload(), 300);
  });
  useSocketEvent('chat:sync', (d) => {
    if (d.id !== selected) return;
    setConv((c) => (c ? { ...c, messages: d.messages, mode: d.mode, status: d.status } : c));
    if (d.messages[d.messages.length - 1]?.sender === 'visitor') setVisitorTyping(false);
  });
  useSocketEvent('chat:typing', (d) => {
    if (d.convId === selected && d.who === 'visitor') setVisitorTyping(d.typing, { name: conv?.visitorName || 'Website visitor' });
  });
  // slow fallback refresh + keeps "agent online" heartbeat alive
  useEffect(() => {
    const id = setInterval(() => list.reload(), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  useEffect(() => {
    if (!selected) return setConv(null);
    api.get(`/chat/admin/${selected}`).then(setConv).catch((e) => setErr(errMsg(e)));
  }, [selected]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages?.length, visitorTyping]);

  const toggleOnline = async () => setOnline((await api.post('/chat/admin/availability', { online: !online })).online);
  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    const text = reply;
    setReply('');
    typingOut.stop();
    try {
      setConv(await api.post(`/chat/admin/${selected}/reply`, { text }));
    } catch (e2) {
      setReply(text);
      setErr(errMsg(e2));
    }
  };
  const patch = async (body) => {
    setConv(await api.patch(`/chat/admin/${selected}`, body));
    list.reload();
  };

  const q = conv?.qualification?.data || {};

  return (
    <div>
      <PageHeader
        title="Live chat & AI conversations"
        subtitle="Website chats, AI escalations and transcripts."
        actions={
          <button onClick={toggleOnline} className={cn('btn btn-sm border', online ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-ink-600 text-slate-400')}>
            <Circle className={cn('h-2.5 w-2.5', online ? 'fill-emerald-400 text-emerald-400' : 'fill-slate-600 text-slate-600')} /> {online ? "You're online" : "You're offline"}
          </button>
        }
      />
      <ErrorBox>{err}</ErrorBox>
      <div className="grid h-[calc(100vh-13rem)] min-h-[520px] gap-4 lg:grid-cols-[340px_1fr]">
        <div className="card flex flex-col overflow-hidden">
          <div className="border-b border-ink-600 p-3">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'escalated', label: 'Needs human' }, { value: 'open', label: 'Bot handling' }, { value: 'closed', label: 'Closed' }]} placeholder="All conversations" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {(list.data?.items || []).map((c) => (
              <button key={c._id} onClick={() => setParams({ c: c._id })} className={cn('block w-full border-b border-ink-700/60 px-4 py-3 text-left hover:bg-ink-700/40', selected === c._id && 'bg-brand-500/10')}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-white"><Avatar name={c.visitorName || 'Website visitor'} seed={c._id} size="xs" />{c.visitorName || 'Anonymous visitor'}</span>
                  <span className="text-[11px] text-slate-500">{timeAgo(c.lastMessageAt)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge>{c.status}</Badge>
                  {c.mode === 'human' ? <Headphones className="h-3.5 w-3.5 text-emerald-300" /> : <Bot className="h-3.5 w-3.5 text-brand-300" />}
                  {c.unreadByAgent > 0 && <span className="rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-bold text-snow">{c.unreadByAgent}</span>}
                  {c.lead && <span className="text-[11px] text-emerald-300">Lead ✓</span>}
                  <span className="ml-auto truncate text-[11px] text-slate-500">{c.assignedAgent?.name}</span>
                </div>
              </button>
            ))}
            {!list.data?.items?.length && <div className="p-4"><Empty title="No conversations" /></div>}
          </div>
        </div>

        <div className="card flex flex-col overflow-hidden">
          {!conv ? <div className="flex flex-1 items-center justify-center p-6"><Empty title="Select a conversation" text="Escalated chats and unanswered messages appear first." /></div> : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-600 p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={conv.visitorName || 'Website visitor'} seed={conv._id} size="md" />
                  <div>
                    <p className="font-medium text-white">{conv.visitorName || 'Anonymous visitor'} <span className="text-xs text-slate-500">{conv.visitorEmail}</span></p>
                    <p className="text-xs text-slate-500">{visitorTyping ? <span className="text-emerald-300">typing…</span> : <>Started on {conv.page || '/'} · {timeAgo(conv.createdAt)}</>}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select className="w-40 py-1.5 text-xs" value={conv.assignedAgent?._id || ''} onChange={(e) => patch({ assignedAgent: e.target.value || null })} options={(staff.data || []).filter((s) => ['superadmin', 'admin', 'chat_agent', 'sales'].includes(s.role)).map((s) => ({ value: s._id, label: s.name }))} placeholder="Unassigned" />
                  {conv.lead ? <Button size="sm" variant="ghost" to={`/admin/leads/${conv.lead._id}`}>View lead</Button> : <Button size="sm" variant="ghost" onClick={() => setConverting(true)}><UserPlus className="h-3.5 w-3.5" /> Convert to lead</Button>}
                  {conv.status !== 'closed' && <Button size="sm" variant="danger" onClick={() => patch({ status: 'closed' })}><XCircle className="h-3.5 w-3.5" /> Close</Button>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <MessageList items={conv.messages.map((m) => fromChatMessage(m, conv, { viewer: 'agent' }))} typing={visitorTyping} />
                <div ref={endRef} />
              </div>
              {Object.keys(q).length > 0 && (
                <div className="border-t border-ink-600 bg-ink-900 px-4 py-2 text-xs text-slate-400">Qualification: {Object.entries(q).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
              )}
              <form onSubmit={send} className="flex gap-2 border-t border-ink-600 p-3">
                <input className="input" placeholder={conv.status === 'closed' ? 'Conversation closed' : 'Reply as agent — this takes over from the bot'} value={reply} onChange={(e) => { setReply(e.target.value); if (e.target.value) typingOut.onType(); else typingOut.stop(); }} disabled={conv.status === 'closed'} />
                <Button type="submit" disabled={conv.status === 'closed'}>Send</Button>
              </form>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Tip: prefer a hosted live-chat tool? Add its script URL in <Link to="/admin/settings" className="underline">Settings</Link>.</p>

      <Modal open={converting} onClose={() => setConverting(false)} title="Convert chat visitor to lead">
        {conv && (
          <ResourceForm
            fields={[{ name: 'fullName', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'company', label: 'Company' }, { name: 'phone', label: 'Phone' }, { name: 'service', label: 'Service', type: 'select', options: SERVICES }]}
            initial={{ fullName: conv.visitorName || q.fullName, email: conv.visitorEmail || q.email, company: q.company, service: q.service }}
            onCancel={() => setConverting(false)}
            onSubmit={async (b) => { await api.post(`/chat/admin/${selected}/convert`, b); setConverting(false); setConv(await api.get(`/chat/admin/${selected}`)); }}
            submitLabel="Create lead"
          />
        )}
      </Modal>
    </div>
  );
}
