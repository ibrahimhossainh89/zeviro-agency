import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  X, Loader2, Inbox, ChevronLeft, ChevronRight, Sparkles, Code2, Layers, PenTool, Target, Database, Bot, Rocket, Briefcase, Cloud, Radar,
  Workflow, Cpu, Building2, HeartPulse, Landmark, ShoppingCart, Factory, Scale, Users, FolderKanban, CheckSquare, MessageSquare, CalendarDays,
  FileText, Receipt, LifeBuoy, Bell, BarChart3, Settings, Shield, Globe, Zap, TrendingUp, Search, LayoutDashboard, Image, BookOpen, Star,
  HelpCircle, UserCog, Mail, Phone, MessagesSquare, ClipboardList, Briefcase as Case, Lightbulb, Smartphone, Lock,
  Megaphone, Keyboard, FileSpreadsheet, MonitorSmartphone, Palette, GraduationCap, House, Wrench, Store, Package, ShieldCheck, Handshake,
  Award, BadgeCheck, Gavel, RefreshCcw, Cookie, CreditCard, Eye, EyeOff, ShoppingBag, Stethoscope, Truck, Scale as Legal, FileLock2, UserCheck,
} from 'lucide-react';
import { useInView, useCountUp } from '../lib/anim';
import { cn } from '../lib/utils';

// Curated icon registry (CMS stores icon names). Keeps the bundle small vs. importing all of lucide.
export const ICONS = {
  Sparkles, Code2, Layers, PenTool, Target, Database, Bot, Rocket, Briefcase, Cloud, Radar, Workflow, Cpu, Building2, HeartPulse, Landmark,
  ShoppingCart, Factory, Scale, Users, FolderKanban, CheckSquare, MessageSquare, CalendarDays, FileText, Receipt, LifeBuoy, Bell, BarChart3,
  Settings, Shield, Globe, Zap, TrendingUp, Search, LayoutDashboard, Image, BookOpen, Star, HelpCircle, UserCog, Mail, Phone, MessagesSquare,
  ClipboardList, Case, Lightbulb, Smartphone, Lock, Inbox, Megaphone, Keyboard, FileSpreadsheet, MonitorSmartphone, Palette, GraduationCap,
  House, Wrench, Store, Package, ShieldCheck, Handshake, Award, BadgeCheck, Gavel, RefreshCcw, Cookie, CreditCard, ShoppingBag, Stethoscope,
  Truck, Legal, FileLock2, UserCheck,
};

export function Icon({ name, className = 'h-5 w-5', fallback = 'Sparkles' }) {
  const C = ICONS[name] || ICONS[fallback];
  return <C className={className} aria-hidden="true" />;
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={cn('animate-spin text-brand-400', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Empty({ title = 'Nothing here yet', text, action, icon: I = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600 px-6 py-12 text-center">
      <I className="mb-3 h-8 w-8 text-slate-500" />
      <p className="font-medium text-slate-200">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBox({ children }) {
  if (!children) return null;
  return <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{children}</div>;
}
export function SuccessBox({ children }) {
  if (!children) return null;
  return <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{children}</div>;
}

const TONES = {
  gray: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
  violet: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  blue: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  pink: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
};
const STATUS_TONE = {
  New: 'blue', Contacted: 'cyan', Qualified: 'violet', 'Meeting Booked': 'pink', 'Proposal Sent': 'amber', Won: 'green', Lost: 'red',
  'Not Started': 'gray', 'In Progress': 'blue', Review: 'amber', Revision: 'pink', Completed: 'green', 'On Hold': 'red',
  'To Do': 'gray', Done: 'green', Blocked: 'red', Pending: 'amber', Paid: 'green', 'Partially Paid': 'cyan', Overdue: 'red', Cancelled: 'gray', Draft: 'gray',
  Sent: 'blue', Viewed: 'cyan', Accepted: 'green', Declined: 'red', Expired: 'gray',
  Open: 'blue', Waiting: 'amber', Resolved: 'green', Closed: 'gray',
  Requested: 'amber', Confirmed: 'green', Rescheduled: 'cyan', 'No Show': 'red',
  open: 'blue', escalated: 'amber', closed: 'gray', active: 'green', suspended: 'red', archived: 'gray',
  Low: 'gray', Medium: 'blue', High: 'amber', Urgent: 'red',
};
export function Badge({ children, tone, className }) {
  const t = tone || STATUS_TONE[children] || 'gray';
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[t], className)}>{children}</span>;
}

export function Button({ as, to, href, variant = 'primary', size, loading, className, children, ...p }) {
  const cls = cn(variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-ghost', size === 'sm' && 'btn-sm', className);
  const inner = (
    <>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} {...p}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...p}>{inner}</a>;
  return <button className={cls} disabled={loading || p.disabled} {...p}>{inner}</button>;
}

export function Field({ label, error, hint, children, className }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}
export const Input = (p) => <input {...p} className={cn('input', p.className)} />;
export function PasswordInput({ className, ...p }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...p} type={show ? 'text' : 'password'} className={cn('input pr-11', className)} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:text-white" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
export const Textarea = (p) => <textarea rows={4} {...p} className={cn('input resize-y', p.className)} />;
export function Select({ options = [], placeholder, ...p }) {
  return (
    <select {...p} className={cn('input appearance-none', p.className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o;
        const l = typeof o === 'object' ? o.label : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const f = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', f);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  // Portal to <body> so the dialog is never trapped inside a parent with blur/transform (which breaks position:fixed)
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" className={cn('card my-8 w-full animate-fadeUp bg-ink-850', wide ? 'max-w-3xl' : 'max-w-lg')} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-ink-600/60 px-5 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-ink-700 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-600/60 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

const TONE_HEX = { violet: '#8b5cf6', green: '#10b981', cyan: '#06b6d4', pink: '#d946ef', blue: '#0ea5e9', amber: '#f59e0b', red: '#f43f5e', gray: '#94a3b8' };

/** Numbers roll up when the card scrolls into view (text values are shown as-is). */
function StatValue({ value }) {
  const [ref, inView] = useInView({ threshold: 0.3 });
  const v = useCountUp(typeof value === 'number' ? value : 0, { start: inView, duration: 1600 });
  if (typeof value !== 'number') return <span ref={ref}>{value ?? '—'}</span>;
  return <span ref={ref} className="tabular-nums">{Math.round(v).toLocaleString()}</span>;
}

export function Stat({ label, value, icon, tone = 'violet', hint, to }) {
  const hex = TONE_HEX[tone] || TONE_HEX.violet;
  const body = (
    <div className={cn('card spin-card glow-card group relative h-full overflow-hidden p-5', to && 'card-hover')} style={{ '--spin-color': hex, '--glow': `${hex}55` }}>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-30" style={{ background: hex }} />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {icon && (
          <span className={cn('pulse-ring rounded-lg border p-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6', TONES[tone])} style={{ '--ring': `${hex}66` }}>
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="relative mt-3 font-display text-3xl font-semibold text-white"><StatValue value={value} /></div>
      {hint && <div className="relative mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

/** Progress bar that fills from 0 when it scrolls into view, with a travelling shine. */
export function Progress({ value = 0, className }) {
  const [ref, inView] = useInView({ threshold: 0.2 });
  const v = Math.min(100, Math.max(0, value));
  return (
    <div ref={ref} className={cn('h-2 w-full overflow-hidden rounded-full bg-ink-700', className)}>
      <div className={cn('h-full rounded-full bg-brand-gradient transition-[width] duration-[1400ms] ease-out', v > 0 && 'bar-shine')} style={{ width: inView ? `${v}%` : '0%' }} />
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-900 p-1">
      {tabs.map((t) => {
        const v = typeof t === 'object' ? t.value : t;
        const l = typeof t === 'object' ? t.label : t;
        return (
          <button key={v} onClick={() => onChange(v)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition', value === v ? 'bg-brand-500/20 text-white' : 'text-slate-400 hover:text-white')}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-4 text-sm">
      <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-slate-400">
        Page {page} of {pages}
      </span>
      <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, text, center = true, className }) {
  return (
    <div className={cn('mb-12 max-w-3xl', center && 'mx-auto text-center', className)}>
      {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
      <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-slate-400">{text}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Minimal, safe markdown renderer (## headings, lists, paragraphs, **bold**, links)
export function Markdown({ text = '' }) {
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
      if (/^\*\*/.test(part)) return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m && /^(https?:\/\/|\/|mailto:)/.test(m[2])) return <a key={i} href={m[2]} {...(/^https?:/.test(m[2]) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{m[1]}</a>;
      return part;
    });
  // split into blocks; a heading line always starts its own block
  const blocks = [];
  String(text || '').replace(/\r/g, '').split(/\n{2,}/).forEach((b) => {
    const lines = b.split('\n');
    let cur = [];
    lines.forEach((l) => {
      if (/^#{2,3} /.test(l)) {
        if (cur.length) blocks.push(cur.join('\n'));
        blocks.push(l);
        cur = [];
      } else cur.push(l);
    });
    if (cur.length) blocks.push(cur.join('\n'));
  });
  return (
    <div className="prose-x">
      {blocks.map((b, i) => {
        if (b.startsWith('### ')) return <h3 key={i}>{b.slice(4)}</h3>;
        if (b.startsWith('## ')) return <h2 key={i}>{b.slice(3)}</h2>;
        const lines = b.split('\n').filter(Boolean);
        if (lines.length && lines.every((l) => /^[-*] /.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^[-*] /, ''))}</li>)}</ul>;
        if (lines.length && lines.every((l) => /^\d+\. /.test(l))) return <ol key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ''))}</li>)}</ol>;
        if (lines.length && lines.every((l) => /^> /.test(l))) return <blockquote key={i}>{inline(lines.map((l) => l.slice(2)).join(' '))}</blockquote>;
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}

// "Paul Manager · Project Manager is typing…" with photo/initials and animated dots
export function TypingBubble({ name, title, avatar, align = 'left' }) {
  return (
    <div className={cn('flex animate-fadeUp items-end gap-2', align === 'right' && 'flex-row-reverse')} aria-live="polite">
      <Avatar name={name} src={avatar} size="sm" />
      <div className={cn('flex flex-col', align === 'right' && 'items-end')}>
        <span className="mb-1 text-[11px] text-slate-500">
          <span className="font-medium text-slate-300">{name}</span>
          {title ? ` · ${title}` : ''} is typing…
        </span>
        <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-ink-700 px-3.5 py-3">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
        </div>
      </div>
    </div>
  );
}

// ---------- Avatars ----------
// Distinct, readable colours; each person always gets the same one (hash of their name/id).
const AVATAR_COLORS = [
  'from-violet-500 to-fuchsia-500', 'from-sky-500 to-indigo-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500', 'from-cyan-500 to-blue-500', 'from-lime-500 to-emerald-600', 'from-indigo-500 to-purple-600',
  'from-orange-500 to-red-500', 'from-teal-500 to-cyan-600', 'from-fuchsia-500 to-rose-500', 'from-blue-500 to-violet-500',
];
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); // "Liran Mira" → "LM"
}
function colorFor(seed = '') {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
const AVATAR_SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-20 w-20 text-2xl' };

/** Profile photo, or initials on a colour unique to that person. */
export function Avatar({ name = '', src, seed, size = 'md', online, className }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const showImg = src && !broken;
  return (
    <span className={cn('relative inline-flex shrink-0', className)} title={name || undefined}>
      {showImg ? (
        <img src={src} alt={name} onError={() => setBroken(true)} className={cn('rounded-full object-cover ring-2 ring-ink-800', AVATAR_SIZES[size])} />
      ) : (
        <span className={cn('inline-flex select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-snow ring-2 ring-ink-800', AVATAR_SIZES[size], colorFor(seed || name))} aria-label={name}>
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ink-850', online ? 'bg-emerald-400' : 'bg-slate-500')} />
      )}
    </span>
  );
}
