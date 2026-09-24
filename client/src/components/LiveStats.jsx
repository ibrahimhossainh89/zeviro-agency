import { lazy, Suspense } from 'react';
import { ArrowUpRight, BadgeCheck, Briefcase, Clock, Globe, CalendarDays, Star, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import { useSite, useLiveFetch } from '../context/SiteContext';
import { useCountUp, useInView, parseStat } from '../lib/anim';
import { cn, timeAgo } from '../lib/utils';
import { PlatformBadge, Stars } from './Marketplace';

const GigChart = lazy(() => import('./GigChart.jsx'));
const ReviewHistory = lazy(() => import('./GigChart.jsx').then((m) => ({ default: m.ReviewHistory })));

/** A number that rolls up to its value (and rolls again when the value changes). */
export function CountUp({ value, start = true, decimals, className, duration, prefix = '' }) {
  const p = typeof value === 'number' ? { prefix, n: value, suffix: '', decimals: decimals ?? 0, grouped: true } : parseStat(value);
  const v = useCountUp(p ? p.n : 0, { start, duration });
  if (!p) return <span className={className}>{value}</span>;
  const d = decimals ?? p.decimals;
  const txt = p.grouped ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : v.toFixed(d);
  return <span className={cn('tabular-nums', className)}>{p.prefix}{txt}{p.suffix}</span>;
}

/** Animated rating ring (e.g. 4.8 / 5). */
function RatingRing({ rating = 0, start, size = 168, color = '#1dbf73' }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const v = useCountUp(rating, { start, duration: 1800 });
  const off = c * (1 - Math.min(v / 5, 1));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="12" className="stroke-ink-700" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 10px ${color}66)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-bold text-white tabular-nums">{v.toFixed(1)}</span>
        <span className="text-xs text-slate-500">out of 5</span>
      </div>
    </div>
  );
}

function BreakdownBars({ breakdown, start, label }) {
  const rows = [['5', breakdown.five], ['4', breakdown.four], ['3', breakdown.three], ['2', breakdown.two], ['1', breakdown.one]].map(([s, n]) => [s, Number(n) || 0]);
  const total = rows.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <div>
      <div className="space-y-2.5">
        {rows.map(([s, n], i) => (
          <div key={s} className="group flex items-center gap-3 text-sm" title={`${n.toLocaleString()} reviews · ${((n / total) * 100).toFixed(1)}%`}>
            <span className="flex w-8 items-center gap-1 text-slate-400">{s}<Star className="h-3 w-3 fill-amber-400 text-amber-400" /></span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-[1400ms] ease-out group-hover:brightness-125"
                style={{ width: start ? `${Math.max((n / total) * 100, n ? 1.5 : 0)}%` : '0%', transitionDelay: `${i * 120}ms` }}
              />
            </div>
            <span className="w-12 text-right text-slate-300 tabular-nums"><CountUp value={n} start={start} /></span>
          </div>
        ))}
      </div>
      {label && <p className="mt-3 text-xs text-slate-500">{label}</p>}
    </div>
  );
}

function Tile({ icon: I, label, children, delay = 0, start }) {
  return (
    <div className={cn('rounded-2xl border border-ink-600/70 bg-ink-800/70 p-4 transition duration-700', start ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')} style={{ transitionDelay: `${delay}ms` }}>
      <p className="flex items-center gap-1.5 text-xs text-slate-500"><I className="h-3.5 w-3.5" /> {label}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold text-white">{children}</p>
    </div>
  );
}

/**
 * Live marketplace analytics: animated rating ring, rating breakdown, counters and charts.
 * Updates instantly when the admin edits Settings → Fiverr & Upwork or the gigs in the CMS.
 */
export default function LiveStats() {
  const { settings } = useSite();
  const gigs = useLiveFetch('/public/content/gigs');
  const [ref, inView] = useInView({ threshold: 0.2 });
  const f = settings.marketplaces?.fiverr;
  const u = settings.marketplaces?.upwork;
  if (!f?.url && !u?.url) return null;
  const history = settings.statsHistory || [];
  const last = history[history.length - 1]?.at;
  const bd = f?.breakdown;
  const hasBreakdown = bd && ['five', 'four', 'three', 'two', 'one'].some((k) => Number(bd[k]) > 0);

  return (
    <div ref={ref} className="live-border rounded-[26px] p-[1.5px]">
      <div className="relative overflow-hidden rounded-[25px] bg-ink-900 p-5 sm:p-8">
        <div className="glow-orb pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-600/30" />
        <div className="glow-orb pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-fuchsia-600/30" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Live</span>
            <h3 className="font-semibold text-white">Marketplace performance</h3>
          </div>
          {last && <span className="text-xs text-slate-500">Updated {timeAgo(last)}</span>}
        </div>

        {settings.marketplaces?.earnings && (
          <div className={cn('relative mt-6 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-violet-500/10 to-fuchsia-500/15 p-5 transition duration-700 sm:flex-row sm:items-center sm:p-6', inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')}>
            <div className="earn-shine pointer-events-none absolute inset-0" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300"><TrendingUp className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Total earnings</p>
                <p className="text-sm text-slate-400">{settings.marketplaces.earningsLabel || 'Earned from client projects'}</p>
              </div>
            </div>
            <p className="relative font-display text-5xl font-bold text-white sm:text-6xl"><CountUp value={settings.marketplaces.earnings} start={inView} duration={2200} /></p>
          </div>
        )}

        <div className="relative mt-6 grid gap-6 lg:grid-cols-[auto_1fr_1fr]">
          {/* rating ring */}
          {f?.url && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-600/70 bg-ink-850/80 p-6 text-center">
              <PlatformBadge platform="Fiverr" className="text-sm" />
              <RatingRing rating={f.rating} start={inView} />
              <Stars value={f.rating} />
              <p className="text-sm text-slate-400"><CountUp value={f.reviews} start={inView} className="font-semibold text-white" /> reviews</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {f.level && <span className="rounded-full border border-ink-600 bg-ink-800 px-2.5 py-1 text-xs text-slate-200">{f.level} Seller</span>}
                {(f.badges || []).map((b) => <span key={b} className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><BadgeCheck className="h-3.5 w-3.5" /> {b}</span>)}
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm mt-1">View Fiverr profile <ArrowUpRight className="h-4 w-4" /></a>
            </div>
          )}

          {/* breakdown + counters */}
          <div className="space-y-4">
            {hasBreakdown && (
              <div className="rounded-2xl border border-ink-600/70 bg-ink-850/80 p-5">
                <p className="mb-4 text-sm font-medium text-white">Star rating breakdown</p>
                <BreakdownBars breakdown={bd} start={inView} label={f.breakdownLabel} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {f?.ordersCompleted && <Tile icon={Briefcase} label="Projects completed" start={inView} delay={100}><CountUp value={f.ordersCompleted} start={inView} /></Tile>}
              {f?.responseTime && <Tile icon={Clock} label="Avg. response" start={inView} delay={200}>{f.responseTime}</Tile>}
              {f?.memberSince && <Tile icon={CalendarDays} label="On Fiverr since" start={inView} delay={300}>{f.memberSince}</Tile>}
              {f?.languages?.length > 0 && <Tile icon={Globe} label="Languages" start={inView} delay={400}><span className="text-base">{f.languages.join(', ')}</span></Tile>}
            </div>
          </div>

          {/* upwork + chart */}
          <div className="space-y-4">
            {u?.url && (
              <div className="rounded-2xl border border-ink-600/70 bg-ink-850/80 p-5">
                <div className="flex items-center justify-between gap-2">
                  <PlatformBadge platform="Upwork" className="text-sm" />
                  <a href={u.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">Profile <ArrowUpRight className="h-3.5 w-3.5" /></a>
                </div>
                {u.title && <p className="mt-2 text-sm text-slate-400">{u.title}</p>}
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div><p className="font-display text-2xl font-semibold text-white"><CountUp value={u.rating || 0} decimals={1} start={inView} /></p><p className="flex items-center justify-center gap-1 text-[11px] text-slate-500"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{u.reviews} review{u.reviews === 1 ? '' : 's'}</p></div>
                  <div><p className="font-display text-2xl font-semibold text-white"><CountUp value={u.jobs || 0} start={inView} /></p><p className="flex items-center justify-center gap-1 text-[11px] text-slate-500"><Briefcase className="h-3 w-3" />Jobs</p></div>
                  <div><p className="font-display text-2xl font-semibold text-white">${u.hourlyRate ?? '—'}</p><p className="flex items-center justify-center gap-1 text-[11px] text-slate-500"><DollarSign className="h-3 w-3" />Per hour</p></div>
                </div>
                {u.location && <p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{u.location}</p>}
              </div>
            )}
            {gigs.data?.some((g) => g.reviewsCount) && (
              <div className="rounded-2xl border border-ink-600/70 bg-ink-850/80 p-5">
                <p className="text-sm font-medium text-white">Reviews by gig</p>
                <p className="text-xs text-slate-500">Hover a bar for details</p>
                <Suspense fallback={<div className="h-44" />}>
                  {inView && <GigChart gigs={gigs.data} />}
                </Suspense>
              </div>
            )}
          </div>
        </div>

        {history.filter((h) => h.fiverrReviews).length >= 2 && (
          <div className="relative mt-6 rounded-2xl border border-ink-600/70 bg-ink-850/80 p-5">
            <p className="text-sm font-medium text-white">Fiverr reviews over time</p>
            <p className="mb-2 text-xs text-slate-500">Recorded each time our profile numbers are updated</p>
            <Suspense fallback={<div className="h-40" />}>{inView && <ReviewHistory history={history} />}</Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
