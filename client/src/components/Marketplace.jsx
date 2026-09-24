import { ArrowUpRight, BadgeCheck, Clock, Globe, MapPin, Quote, Star, Briefcase, DollarSign } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { cn, fmtMoney } from '../lib/utils';

export function Stars({ value = 5, className = 'h-4 w-4' }) {
  return (
    <span className="flex" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn(className, i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-600')} />
      ))}
    </span>
  );
}

/** Fiverr / Upwork wordmarks drawn as simple text badges (no third-party logo files). */
export function PlatformBadge({ platform, className }) {
  const fiverr = platform === 'Fiverr';
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold tracking-tight', fiverr ? 'bg-[#1dbf73]/15 text-[#1dbf73]' : 'bg-[#14a800]/15 text-[#14a800]', className)}>
      {fiverr ? 'fiverr.' : 'Upwork'}
    </span>
  );
}

export function FiverrCard({ compact }) {
  const { settings } = useSite();
  const f = settings.marketplaces?.fiverr;
  if (!f?.url) return null;
  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <div className="glow-orb pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-600/40" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlatformBadge platform="Fiverr" className="text-sm" />
          <div className="flex flex-wrap gap-1.5">
            {f.level && <span className="rounded-full border border-ink-600 bg-ink-800 px-2.5 py-1 text-xs text-slate-200">{f.level} Seller</span>}
            {(f.badges || []).map((b) => (
              <span key={b} className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" /> {b}</span>
            ))}
          </div>
        </div>
        <h3 className="mt-5 text-xl font-semibold text-white">{f.displayName} <span className="text-base font-normal text-slate-500">@{f.username}</span></h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Stars value={f.rating} />
          <span className="text-sm"><b className="text-white">{f.rating}</b> <span className="text-slate-400">({Number(f.reviews || 0).toLocaleString()} reviews)</span></span>
        </div>
        <dl className={cn('mt-6 grid gap-4 text-sm', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
          {[
            ['Orders completed', f.ordersCompleted, Briefcase],
            ['Member since', f.memberSince, Clock],
            ['Avg. response', f.responseTime, Clock],
            ['Languages', (f.languages || []).join(', '), Globe],
          ].filter(([, v]) => v).map(([l, v, I]) => (
            <div key={l}>
              <dt className="flex items-center gap-1.5 text-xs text-slate-500"><I className="h-3.5 w-3.5" /> {l}</dt>
              <dd className="mt-1 font-medium text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6">View Fiverr profile <ArrowUpRight className="h-4 w-4" /></a>
      </div>
    </div>
  );
}

export function UpworkCard() {
  const { settings } = useSite();
  const u = settings.marketplaces?.upwork;
  if (!u?.url) return null;
  return (
    <div className="card relative overflow-hidden p-6 sm:p-8">
      <div className="glow-orb pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lime-600/30" />
      <div className="relative">
        <PlatformBadge platform="Upwork" className="text-sm" />
        <h3 className="mt-5 text-xl font-semibold text-white">{u.displayName}</h3>
        {u.title && <p className="mt-1 text-sm text-slate-400">{u.title}</p>}
        {u.rating ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Stars value={u.rating} />
            <span className="text-sm"><b className="text-white">{Number(u.rating).toFixed(1)}</b> <span className="text-slate-400">({u.reviews} review{u.reviews === 1 ? '' : 's'})</span></span>
          </div>
        ) : null}
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          {[
            ['Hourly rate', u.hourlyRate ? `${fmtMoney(u.hourlyRate)}/hr` : null, DollarSign],
            ['Jobs completed', u.jobs, Briefcase],
            ['Location', u.location, MapPin],
          ].filter(([, v]) => v !== null && v !== undefined && v !== '').map(([l, v, I]) => (
            <div key={l}>
              <dt className="flex items-center gap-1.5 text-xs text-slate-500"><I className="h-3.5 w-3.5" /> {l}</dt>
              <dd className="mt-1 font-medium text-white">{v}</dd>
            </div>
          ))}
        </dl>
        <a href={u.url} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-6">View Upwork profile <ArrowUpRight className="h-4 w-4" /></a>
      </div>
    </div>
  );
}

export function GigCard({ g }) {
  return (
    <a href={g.url} target="_blank" rel="noopener noreferrer" className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-600/25 via-ink-700 to-violet-600/25">
        <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-bold text-white/40">{g.platform === 'Fiverr' ? 'fiverr.' : g.platform}</span>
        {g.image ? <img src={g.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <PlatformBadge platform={g.platform} />
          {g.service && <span className="truncate text-xs text-slate-500">{g.service}</span>}
        </div>
        <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-white">{g.title}</h3>
        {g.rating ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><b className="text-white">{Number(g.rating).toFixed(1)}</b><span className="text-slate-500">({g.reviewsCount})</span></p>
        ) : null}
        <div className="mt-auto flex items-center justify-between border-t border-ink-600/60 pt-4 text-sm">
          {g.startingPrice ? <span className="text-slate-500">From <b className="text-base text-white">{fmtMoney(g.startingPrice)}</b></span> : <span className="text-slate-500">{g.platform}</span>}
          <span className="inline-flex items-center gap-1 text-brand-300">View gig <ArrowUpRight className="h-4 w-4" /></span>
        </div>
      </div>
    </a>
  );
}

export function ReviewCard({ r }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <Stars value={r.rating || 5} />
        {r.platform && <PlatformBadge platform={r.platform} />}
      </div>
      <Quote className="mt-4 h-5 w-5 text-brand-400" />
      <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-slate-300">“{r.body}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-600/60 pt-4 text-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold uppercase text-snow">{r.title.slice(0, 2)}</span>
        <span>
          <span className="block font-semibold text-white">{r.title}</span>
          <span className="text-xs text-slate-500">{[r.country, r.service].filter(Boolean).join(' · ') || r.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
