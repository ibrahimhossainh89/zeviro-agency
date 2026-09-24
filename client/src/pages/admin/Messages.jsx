import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
import { api, errMsg } from '../../api/http';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { PageHeader, Empty, Button, Select, ErrorBox, Avatar } from '../../components/ui';
import MessageList, { fromPortalMessage } from '../../components/MessageList';
import { useSocketEvent, useSocketJoin, useTypingEmitter, useRemoteTyping } from '../../lib/realtime';
import { useFetch, timeAgo, cn } from '../../lib/utils';

export default function Messages() {
  const [params, setParams] = useSearchParams();
  const client = params.get('client');
  const threads = useFetch('/messages/threads');
  const allClients = useFetch('/clients', { limit: 200, status: 'active' });
  const msgs = useFetch('/messages', { client }, { skip: !client });
  const projects = useFetch('/projects', { client, limit: 100 }, { skip: !client });
  const [body, setBody] = useState('');
  const [project, setProject] = useState('');
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const endRef = useRef();
  // ---------- real-time ----------
  useSocketJoin('msg:join', client ? { clientId: client } : null);
  const typingOut = useTypingEmitter('msg:typing', client ? { clientId: client } : null);
  const [clientTyping, setClientTyping] = useRemoteTyping();
  const addMessage = (m) => msgs.setData((list) => (list?.some((x) => x._id === m._id) ? list : [...(list || []), m]));
  useSocketEvent('msg:new', ({ clientId, message }) => {
    if (clientId !== client) return;
    if (message.fromClient) {
      setClientTyping(false);
      msgs.reload(); // re-fetch also marks it as read (client sees "Seen")
    } else addMessage(message);
  });
  useSocketEvent('msg:thread', () => threads.reload());
  useSocketEvent('msg:typing', (d) => {
    if (d.clientId === client && d.fromClient) setClientTyping(d.typing, d);
  });
  useSocketEvent('msg:read', (d) => {
    if (d.clientId === client && d.by === 'client') msgs.setData((list) => list?.map((m) => (m.fromClient ? m : { ...m, readByClient: true })));
  });
  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [msgs.data, clientTyping]);
  useEffect(() => {
    if (!client) return undefined;
    const id = setInterval(() => { msgs.reload(); threads.reload(); }, 30000); // fallback only
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setErr('');
    try {
      let attachments = [];
      if (files.length) attachments = (await api.upload('/files', files, { category: 'Attachment', client, ...(project ? { project } : {}) })).map((f) => f._id);
      const text = body;
      setBody('');
      typingOut.stop();
      const m = await api.post('/messages', { client, body: text, ...(project && { project }), attachments });
      addMessage(m);
      setFiles([]);
    } catch (e2) {
      setErr(errMsg(e2));
      msgs.reload();
    }
  };

  const clientInfo = (allClients.data?.items || []).find((c) => c._id === client);
  const thread = (threads.data || []).find((t) => t._id === client);
  const contact = thread?.contact || (clientInfo?.primaryContact?.name ? { name: clientInfo.primaryContact.name } : null);

  return (
    <div>
      <PageHeader title="Client messages" subtitle="Project conversations with clients — shown in their portal in real time." />
      <div className="grid h-[calc(100vh-13rem)] min-h-[500px] gap-4 lg:grid-cols-[320px_1fr]">
        <div className="card overflow-y-auto">
          <div className="border-b border-ink-600 p-3">
            <Select value="" onChange={(e) => e.target.value && setParams({ client: e.target.value })} options={(allClients.data?.items || []).map((c) => ({ value: c._id, label: c.name }))} placeholder="+ New conversation with…" />
          </div>
          {(threads.data || []).map((t) => (
            <button key={t._id} onClick={() => setParams({ client: t._id })} className={cn('flex w-full items-center gap-3 border-b border-ink-700/60 px-4 py-3 text-left transition hover:bg-ink-700/40', client === t._id && 'bg-brand-500/10')}>
              <Avatar name={t.contact?.name || t.client.name} src={t.contact?.avatar || t.client.logo} seed={t.contact?._id || t._id} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">{t.client.name}</span>
                  <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(t.last.createdAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className={cn('truncate text-xs', t.unread ? 'font-medium text-slate-200' : 'text-slate-500')}>{t.last.fromClient ? `${t.contact?.name?.split(' ')[0] || 'Client'}: ` : 'You: '}{t.last.body}</p>
                  {t.unread > 0 && <span className="shrink-0 rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-bold text-snow">{t.unread}</span>}
                </div>
              </div>
            </button>
          ))}
          {!threads.data?.length && <div className="p-4"><Empty title="No conversations yet" text="Start one with “New conversation”." /></div>}
        </div>
        <div className="card flex flex-col overflow-hidden">
          {!client ? <div className="flex flex-1 items-center justify-center"><Empty title="Select a client" /></div> : (
            <>
              {/* conversation header: who you're talking to */}
              <div className="flex items-center justify-between gap-3 border-b border-ink-600 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={contact?.name || clientInfo?.name || 'Client'} src={contact?.avatar || clientInfo?.logo} seed={contact?._id || client} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{contact?.name || clientInfo?.name || 'Client'}</p>
                    <p className="truncate text-xs text-slate-500">
                      {clientTyping ? <span className="text-emerald-300">typing…</span> : <>{clientInfo?.name}{contact?.title ? ` · ${contact.title}` : ''}{clientInfo?.primaryContact?.email ? ` · ${clientInfo.primaryContact.email}` : ''}</>}
                    </p>
                  </div>
                </div>
                <Link to={`/admin/clients/${client}`} className="btn-ghost btn-sm shrink-0"><ExternalLink className="h-3.5 w-3.5" /> Client profile</Link>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <MessageList items={(msgs.data || []).map((m) => fromPortalMessage(m, { viewer: 'team' }))} typing={clientTyping} />
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="space-y-2 border-t border-ink-600 p-3">
                <ErrorBox>{err}</ErrorBox>
                <div className="flex gap-2">
                  <Select className="w-48 py-2 text-xs" value={project} onChange={(e) => setProject(e.target.value)} options={(projects.data?.items || []).map((p) => ({ value: p._id, label: p.name }))} placeholder="General" />
                  <input className="input" placeholder={`Message ${contact?.name?.split(' ')[0] || clientInfo?.name || 'client'}…`} value={body} onChange={(e) => { setBody(e.target.value); if (e.target.value) typingOut.onType(); else typingOut.stop(); }} />
                  <label className="btn-ghost cursor-pointer px-3" aria-label="Attach"><Paperclip className="h-4 w-4" /><input type="file" multiple className="hidden" onChange={(e) => setFiles([...e.target.files])} /></label>
                  <Button type="submit">Send</Button>
                </div>
                {files.length > 0 && <p className="text-xs text-slate-400">{files.length} file(s) attached</p>}
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
