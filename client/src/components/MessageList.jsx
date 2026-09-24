import { Download } from 'lucide-react';
import { Avatar, TypingBubble, Empty } from './ui';
import { cn, timeAgo, fmtSize } from '../lib/utils';

const ROLE_TITLES = { superadmin: 'Zeviro', admin: 'Zeviro', sales: 'Business Development', pm: 'Project Manager', developer: 'Developer', chat_agent: 'Support', content_manager: 'Content', client: 'Client' };
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const dayLabel = (d) => {
  const x = new Date(d);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (x.toDateString() === today.toDateString()) return 'Today';
  if (x.toDateString() === y.toDateString()) return 'Yesterday';
  return x.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
};

/**
 * Chat-style list of messages with avatars (photo or coloured initials), sender name + job title,
 * day separators, grouping of consecutive messages, read receipts and a live typing bubble.
 * items: [{ _id, mine, name, title, avatar, seed, body, createdAt, projectName, attachments, status }]
 */
export default function MessageList({ items = [], typing, emptyText = 'Say hello 👋' }) {
  if (!items.length && !typing) return <Empty title="No messages yet" text={emptyText} />;
  return (
    <div className="space-y-1">
      {items.map((m, i) => {
        const prev = items[i - 1];
        const next = items[i + 1];
        const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
        const firstOfGroup = newDay || !prev || prev.seed !== m.seed || new Date(m.createdAt) - new Date(prev.createdAt) > 5 * 60e3;
        const lastOfGroup = !next || next.seed !== m.seed || !sameDay(next.createdAt, m.createdAt) || new Date(next.createdAt) - new Date(m.createdAt) > 5 * 60e3;
        if (m.system)
          return (
            <p key={m._id || i} className="my-3 text-center text-xs text-slate-500">
              {m.body}
            </p>
          );
        return (
          <div key={m._id || i}>
            {newDay && (
              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-slate-500">
                <span className="h-px flex-1 bg-ink-600" />
                {dayLabel(m.createdAt)}
                <span className="h-px flex-1 bg-ink-600" />
              </div>
            )}
            <div className={cn('flex items-end gap-2', m.mine && 'flex-row-reverse', firstOfGroup && 'mt-3')}>
              {/* avatar only on the last bubble of a group (keeps it clean) */}
              <div className="w-8 shrink-0">{lastOfGroup && <Avatar name={m.name} src={m.avatar} seed={m.seed} size="sm" />}</div>
              <div className={cn('flex max-w-[75%] flex-col', m.mine && 'items-end')}>
                {firstOfGroup && (
                  <p className={cn('mb-1 px-1 text-[11px] text-slate-500', m.mine && 'text-right')}>
                    <span className="font-medium text-slate-300">{m.mine ? 'You' : m.name}</span>
                    {m.title ? ` · ${m.title}` : ''}
                  </p>
                )}
                <div className={cn('rounded-2xl px-4 py-2.5 text-sm', m.mine ? 'bg-brand-600 text-snow' : 'bg-ink-700 text-slate-100', m.mine ? (lastOfGroup ? 'rounded-br-md' : '') : lastOfGroup ? 'rounded-bl-md' : '')}>
                  {m.projectName && <p className="mb-1 text-[10px] uppercase tracking-wide opacity-70">{m.projectName}</p>}
                  <p className="whitespace-pre-line break-words">{m.render ? m.render(m.body) : m.body}</p>
                  {m.attachments?.map((a) => (
                    <a key={a._id} href={a.url || `/api/v1/files/${a._id}/download`} className="mt-2 flex items-center gap-1 text-xs underline">
                      <Download className="h-3 w-3" />
                      {a.originalName} {a.size ? `(${fmtSize(a.size)})` : ''}
                    </a>
                  ))}
                </div>
                {lastOfGroup && (
                  <p className="mt-1 px-1 text-[10px] text-slate-500">
                    {timeAgo(m.createdAt)}
                    {m.status && <span className={cn('ml-1', m.status === 'Seen' && 'text-brand-300')}>· {m.status === 'Seen' ? 'Seen ✓✓' : 'Sent ✓'}</span>}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="mt-3">
          <TypingBubble name={typing.name} title={typing.title} avatar={typing.avatar} />
        </div>
      )}
    </div>
  );
}

// Helpers to turn API messages into MessageList items
export const titleFor = (u) => u?.title || ROLE_TITLES[u?.role] || '';
export function fromPortalMessage(m, { viewer }) {
  const mine = viewer === 'team' ? !m.fromClient : m.fromClient;
  return {
    _id: m._id,
    mine,
    name: m.from?.name || (m.fromClient ? 'Client' : 'Zeviro'),
    title: titleFor(m.from),
    avatar: m.from?.avatar,
    seed: m.from?._id || m.from?.name,
    body: m.body,
    createdAt: m.createdAt,
    projectName: m.project?.name,
    attachments: m.attachments,
    status: mine ? ((viewer === 'team' ? m.readByClient : m.readByTeam) ? 'Seen' : 'Sent') : null,
  };
}

// Website chat message → MessageList item (viewer "agent" = admin, "visitor" = website widget)
export function fromChatMessage(m, conv, { viewer }) {
  if (m.sender === 'system') return { _id: m._id, system: true, body: m.text, createdAt: m.createdAt };
  const visitorName = conv?.visitorName || 'Website visitor';
  const who = {
    visitor: { name: visitorName, title: conv?.visitorEmail || '', avatar: '', seed: conv?._id || conv?.id || 'visitor' },
    bot: { name: 'Zeviro AI', title: 'Assistant', avatar: '', seed: 'zeviro-ai' },
    agent: { name: m.agentName || 'Zeviro Team', title: m.agentTitle || '', avatar: m.agentAvatar || '', seed: m.agent || m.agentName || 'agent' },
  }[m.sender] || { name: '?', seed: '?' };
  const mine = viewer === 'agent' ? m.sender === 'agent' : m.sender === 'visitor';
  return { _id: m._id, mine, ...who, body: m.text, createdAt: m.createdAt || new Date().toISOString() };
}
