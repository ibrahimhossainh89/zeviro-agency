import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle, X, Send, Bot, User, Headphones, ArrowLeft, Sparkles, ChevronRight, CalendarCheck, Mail, RefreshCw, Code2, Target, Workflow, PenTool,
} from 'lucide-react';
import { api, errMsg } from '../api/http';
import { cn, visitorId, track } from '../lib/utils';
import { useSite } from '../context/SiteContext';
import { TypingBubble, Avatar } from './ui';
import { useSocketEvent, useSocketJoin, useTypingEmitter, useRemoteTyping } from '../lib/realtime';

// Linkify internal paths like /book-a-call or /services/web-development in bot answers
function Text({ text }) {
  const parts = String(text || '').split(/(\s\/[a-z0-9\-/]+)/gi);
  return parts.map((p, i) =>
    /^\s\/[a-z]/.test(p) ? (
      <span key={i}> <Link to={p.trim()} className="text-brand-300 underline">{p.trim()}</Link></span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// Spec §6 quick options
const AI_TOPICS = [
  { label: 'Web Development', icon: Code2 },
  { label: 'B2B Lead Generation', icon: Target },
  { label: 'AI & Automation', icon: Workflow },
  { label: 'UI/UX Design', icon: PenTool },
];

/**
 * Website chat (Spec §6 AI chatbot + §7 live chat)
 *  view "home"    → choose: AI assistant (with quick topics) OR talk to the team
 *  view "chat"    → conversation (bot or human mode)
 *  view "offline" → offline inquiry form when no agent is online
 */
export default function ChatWidget() {
  const { settings } = useSite();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('home');
  const [status, setStatus] = useState({ loaded: false, online: false, error: '' });
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [quick, setQuick] = useState([]);
  const [mode, setMode] = useState('bot');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState({ name: '', email: '', message: '', sent: false, error: '', loading: false });
  const vid = useRef(visitorId());
  const endRef = useRef();
  const inputRef = useRef();

  // ---------- real-time (Socket.IO) ----------
  useSocketJoin('chat:join', conv ? { convId: conv, visitorId: vid.current } : null);
  const typingOut = useTypingEmitter('chat:typing', conv ? { convId: conv } : null);
  const [agentTyping, setAgentTyping] = useRemoteTyping();
  useSocketEvent('chat:sync', (d) => {
    if (d.id !== conv) return;
    setMessages(d.messages);
    setMode(d.status === 'closed' ? 'closed' : d.mode);
    const last = d.messages[d.messages.length - 1];
    if (last?.sender === 'agent') setAgentTyping(false);
  });
  useSocketEvent('chat:typing', (d) => {
    if (d.convId === conv && d.who === 'agent') setAgentTyping(d.typing, d);
  });
  useSocketEvent('chat:status', (d) => setStatus((s) => ({ ...s, online: !!d.online })));

  // ---------- server status (agents online?) ----------
  const loadStatus = useCallback(async () => {
    try {
      const s = await api.get('/chat/status');
      setStatus({ loaded: true, online: !!s.online, error: '' });
      return s;
    } catch (e) {
      setStatus({ loaded: true, online: false, error: errMsg(e) });
      return null;
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadStatus();
      track('chat_open');
    }
  }, [open, loadStatus]);

  // Let other buttons on the site open the chat: window.dispatchEvent(new Event('zv:open-chat'))
  useEffect(() => {
    const f = () => setOpen(true);
    window.addEventListener('zv:open-chat', f);
    return () => window.removeEventListener('zv:open-chat', f);
  }, []);

  // ---------- conversation ----------
  const ensureConversation = async () => {
    if (conv) return conv;
    const c = await api.post('/chat/start', { visitorId: vid.current, page: window.location.pathname });
    setConv(c.id);
    setMessages(c.messages || []);
    setMode(c.mode);
    return c.id;
  };

  const startAI = async (firstMessage) => {
    setError('');
    setView('chat');
    setBusy(true);
    try {
      const id = await ensureConversation();
      setQuick(firstMessage ? [] : AI_TOPICS.map((t) => t.label).concat('Talk to an Expert'));
      if (firstMessage) await send(firstMessage, id);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const talkToTeam = async () => {
    setError('');
    setBusy(true);
    try {
      const s = await loadStatus();
      const id = await ensureConversation();
      const d = await api.post(`/chat/${id}/escalate`, { visitorId: vid.current });
      setMessages(d.messages);
      setMode(d.mode);
      setQuick([]);
      setView(s?.online ? 'chat' : 'offline');
    } catch (e) {
      setView('chat');
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // Poll for agent replies while a human is handling the chat
  useEffect(() => {
    if (!open || !conv || mode !== 'human') return undefined;
    const id = setInterval(async () => {
      try {
        const d = await api.get(`/chat/${conv}/messages`, { visitorId: vid.current });
        setMessages(d.messages);
        setStatus((s) => ({ ...s, online: d.online }));
        if (d.status === 'closed') setMode('closed');
      } catch {
        /* ignore temporary network errors */
      }
    }, 15000); // fallback only — updates normally arrive instantly over the socket
    return () => clearInterval(id);
  }, [open, conv, mode]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view, busy, agentTyping]);

  async function send(msg, convId = conv) {
    const t = (msg ?? text).trim();
    if (!t) return;
    if (t === 'Book a Discovery Call') {
      window.location.href = '/book-a-call';
      return;
    }
    if (t === 'Talk to an Expert') {
      talkToTeam();
      return;
    }
    setText('');
    typingOut.stop();
    setQuick([]);
    setError('');
    setMessages((m) => [...m, { sender: 'visitor', text: t, _tmp: true }]);
    setBusy(true);
    try {
      const id = convId || (await ensureConversation());
      const d = await api.post(`/chat/${id}/message`, { visitorId: vid.current, text: t });
      setMessages(d.messages);
      setMode(d.mode);
      const qr = d.reply?.quickReplies || [];
      if (qr.includes('__offline_form__')) setView('offline');
      setQuick(qr.filter((q) => q !== '__offline_form__'));
    } catch (e) {
      setMessages((m) => m.filter((x) => !x._tmp));
      setText(t);
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const submitOffline = async (e) => {
    e.preventDefault();
    setOffline((o) => ({ ...o, loading: true, error: '' }));
    try {
      await api.post('/chat/offline', { name: offline.name, email: offline.email, message: offline.message, conversationId: conv, visitorId: vid.current });
      setOffline({ name: '', email: '', message: '', sent: true, error: '', loading: false });
    } catch (err) {
      setOffline((o) => ({ ...o, loading: false, error: errMsg(err) }));
    }
  };

  if (settings.chatbotEnabled === false && !settings.liveChatEmbed) return null;

  const headerTitle = view === 'home' ? 'Zeviro' : mode === 'human' ? 'Zeviro Team' : view === 'offline' ? 'Leave a message' : 'Zeviro AI Assistant';

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full bg-brand-gradient px-5 py-3.5 font-semibold text-snow shadow-glow transition hover:scale-105"
          aria-label="Open chat"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Chat with us</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chat with Zeviro"
          className="fixed bottom-0 right-0 z-[60] flex h-[100dvh] w-full flex-col overflow-hidden border border-ink-600 bg-ink-900 shadow-2xl sm:bottom-5 sm:right-5 sm:h-[620px] sm:max-h-[calc(100vh-2.5rem)] sm:w-[390px] sm:rounded-2xl"
        >
          {/* header */}
          <div className="flex items-center justify-between bg-brand-gradient px-4 py-3">
            <div className="flex items-center gap-3">
              {view !== 'home' ? (
                <button onClick={() => { setView('home'); setError(''); }} className="rounded-lg p-1.5 text-snow/90 hover:bg-snow/10" aria-label="Back">
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <span className="rounded-full bg-snow/20 p-2"><Sparkles className="h-4 w-4 text-snow" /></span>
              )}
              <div>
                <p className="text-sm font-semibold text-snow">{headerTitle}</p>
                <p className="flex items-center gap-1.5 text-xs text-snow/80">
                  <span className={cn('h-1.5 w-1.5 rounded-full', status.online ? 'bg-[#6ee7b7]' : 'bg-snow/50')} />
                  {status.online ? 'Team online now' : 'Team offline · AI assistant 24/7'}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-snow/80 hover:bg-snow/10" aria-label="Close chat">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ---------- HOME: choose AI or team ---------- */}
          {view === 'home' && (
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <p className="font-display text-xl font-semibold text-white">Hi there 👋</p>
                <p className="mt-1 text-sm text-slate-400">How would you like to talk to us?</p>
              </div>

              {status.error && (
                <div className="flex items-start justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <span>Can't reach the chat server: {status.error}</span>
                  <button onClick={loadStatus} className="shrink-0 underline" aria-label="Retry"><RefreshCw className="h-3.5 w-3.5" /></button>
                </div>
              )}

              {/* Option 1 — AI */}
              <div className="rounded-2xl border border-ink-600 bg-ink-800/60 p-4">
                <button onClick={() => startAI()} className="group flex w-full items-center gap-3 text-left" disabled={busy}>
                  <span className="rounded-xl bg-brand-500/15 p-2.5 text-brand-300"><Bot className="h-5 w-5" /></span>
                  <span className="flex-1">
                    <span className="block font-semibold text-white">Ask our AI assistant</span>
                    <span className="block text-xs text-slate-400">Instant answers 24/7 · get a quick quote</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5" />
                </button>
                <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wide text-slate-500">Popular topics</p>
                <div className="grid grid-cols-2 gap-2">
                  {AI_TOPICS.map(({ label, icon: I }) => (
                    <button key={label} disabled={busy} onClick={() => startAI(label)} className="flex items-center gap-2 rounded-xl border border-ink-600 px-3 py-2 text-left text-xs text-slate-200 transition hover:border-brand-500/60 hover:bg-brand-500/10">
                      <I className="h-3.5 w-3.5 shrink-0 text-brand-300" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2 — human team */}
              <button onClick={talkToTeam} disabled={busy} className="group flex w-full items-center gap-3 rounded-2xl border border-ink-600 bg-ink-800/60 p-4 text-left transition hover:border-emerald-500/50">
                <span className="relative rounded-xl bg-emerald-500/15 p-2.5 text-emerald-300">
                  <Headphones className="h-5 w-5" />
                  <span className={cn('absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-800', status.online ? 'bg-emerald-400' : 'bg-slate-500')} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-white">Talk to our team</span>
                  <span className="block text-xs text-slate-400">{status.online ? 'A specialist is online — typically replies in minutes' : 'Leave a message — we reply within 1 business day'}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5" />
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link to="/book-a-call" onClick={() => setOpen(false)} className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-600 py-2.5 text-xs text-slate-300 hover:text-white"><CalendarCheck className="h-3.5 w-3.5" /> Book a call</Link>
                <a href={`mailto:${settings.contactEmail || 'hello@zeviro.agency'}`} className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-600 py-2.5 text-xs text-slate-300 hover:text-white"><Mail className="h-3.5 w-3.5" /> Email us</a>
              </div>
              {conv && messages.length > 1 && (
                <button onClick={() => setView('chat')} className="w-full text-center text-xs text-brand-300 underline">Continue previous conversation</button>
              )}
            </div>
          )}

          {/* ---------- CHAT ---------- */}
          {view === 'chat' && (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m, i) => (
                  <div key={m._id || i} className={cn('flex gap-2', m.sender === 'visitor' && 'justify-end')}>
                    {m.sender === 'bot' && <span className="mt-1 h-7 w-7 shrink-0 rounded-full bg-ink-700 p-1.5 text-brand-300"><Bot className="h-4 w-4" /></span>}
                    {m.sender === 'agent' && <Avatar name={m.agentName || 'Zeviro Team'} src={m.agentAvatar} seed={m.agent || m.agentName} size="sm" className="mt-1" />}
                    <div
                      className={cn(
                        'max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm',
                        m.sender === 'visitor' && 'rounded-br-md bg-brand-600 text-snow',
                        m.sender === 'bot' && 'rounded-bl-md bg-ink-700 text-slate-200',
                        m.sender === 'agent' && 'rounded-bl-md border border-emerald-500/30 bg-emerald-500/10 text-slate-100',
                        m.sender === 'system' && 'mx-auto bg-transparent text-center text-xs text-slate-500'
                      )}
                    >
                      {m.sender === 'agent' && (m.agentName || m.agentTitle) && (
                        <span className="mb-1 block text-[11px] font-medium text-emerald-300">{m.agentName}{m.agentTitle ? ` · ${m.agentTitle}` : ''}</span>
                      )}
                      <Text text={m.text} />
                    </div>
                  </div>
                ))}
                {agentTyping && <TypingBubble name={agentTyping.name} title={agentTyping.title} avatar={agentTyping.avatar} />}
                {busy && mode !== 'human' && <TypingBubble name="Zeviro AI" title="Assistant" />}
                {mode === 'human' && !status.online && (
                  <button onClick={() => setView('offline')} className="w-full rounded-xl border border-ink-600 py-2 text-xs text-slate-300 hover:text-white">Team is offline — leave a message instead</button>
                )}
                {quick.length > 0 && !busy && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {quick.map((q) => (
                      <button key={q} onClick={() => send(q)} className="rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1.5 text-xs text-brand-200 hover:bg-brand-500/20">
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {error}
                    <button onClick={() => { setError(''); if (!conv) startAI(); }} className="ml-2 underline">Retry</button>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-ink-600 p-3">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (e.target.value) typingOut.onType();
                    else typingOut.stop();
                  }}
                  placeholder={mode === 'closed' ? 'Conversation closed' : mode === 'human' ? 'Message our team…' : 'Ask anything about our services…'}
                  disabled={mode === 'closed'}
                  className="input flex-1 py-2"
                  maxLength={1000}
                  aria-label="Message"
                />
                <button className="rounded-xl bg-brand-600 p-2.5 text-snow disabled:opacity-40" disabled={!text.trim() || busy} aria-label="Send">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {mode === 'bot' && (
                <button onClick={talkToTeam} className="flex items-center justify-center gap-1.5 border-t border-ink-700 py-2 text-xs text-slate-500 hover:text-white">
                  <Headphones className="h-3.5 w-3.5" /> Prefer a human? Talk to our team
                </button>
              )}
            </>
          )}

          {/* ---------- OFFLINE FORM ---------- */}
          {view === 'offline' && (
            <div className="flex-1 overflow-y-auto p-4">
              {offline.sent ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <span className="rounded-full bg-emerald-500/15 p-3 text-emerald-300"><Mail className="h-6 w-6" /></span>
                  <p className="mt-4 font-semibold text-white">Message sent!</p>
                  <p className="mt-1 text-sm text-slate-400">We'll reply by email within one business day.</p>
                  <button onClick={() => setView('home')} className="btn-ghost btn-sm mt-6">Back to start</button>
                </div>
              ) : (
                <form onSubmit={submitOffline} className="space-y-3">
                  <p className="text-sm text-slate-400">Our team is offline right now. Leave your details and we'll get back to you within one business day.</p>
                  <input className="input" placeholder="Your name" required minLength={2} value={offline.name} onChange={(e) => setOffline({ ...offline, name: e.target.value })} />
                  <input className="input" type="email" placeholder="Business email" required value={offline.email} onChange={(e) => setOffline({ ...offline, email: e.target.value })} />
                  <textarea className="input" rows={4} placeholder="How can we help?" required minLength={5} value={offline.message} onChange={(e) => setOffline({ ...offline, message: e.target.value })} />
                  {offline.error && <p className="text-xs text-rose-300">{offline.error}</p>}
                  <button className="btn-primary w-full" disabled={offline.loading}>{offline.loading ? 'Sending…' : 'Send message'}</button>
                  <button type="button" onClick={() => startAI()} className="w-full text-center text-xs text-brand-300 underline">Or ask the AI assistant now</button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
