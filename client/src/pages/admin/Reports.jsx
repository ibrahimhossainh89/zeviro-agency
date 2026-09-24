import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Globe, Users, Target, Trophy, ShoppingBag, DollarSign, TrendingUp, TrendingDown, Minus, ChevronDown, Star, Receipt, FileText, CalendarDays, Bot } from 'lucide-react';
import { PageLoader, ErrorBox } from '../../components/ui';
import { useFetch, fmtMoney, cn } from '../../lib/utils';
import { useInView, useCountUp, useTilt } from '../../lib/anim';
import Aurora from '../../components/Aurora';
import { CountUp } from '../../components/LiveStats';

const PERIODS = [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['180', 'Last 6 months'], ['365', 'Last 12 months']];
const BRAND = '#8b5cf6';
const tipStyle = { background: 'rgb(var(--ink-850))', border: '1px solid rgb(var(--ink-600))', color: 'rgb(var(--white))', borderRadius: 12, fontSize: 12 };
const change = (now, before) => (before ? Math.round(((now - before) / before) * 1000) / 10 : now ? null : 0);
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Delta({ value }) {
  if (value == null) return <span className="text-xs text-slate-500">new</span>;
  const I = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', value > 0 ? 'bg-emerald-500/10 text-emerald-500' : value < 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-400')}>
      <I className="h-3 w-3" />{value > 0 ? '+' : ''}{value}%
    </span>
  );
}

/** KPI tile: animated number, % change vs the previous period and a tiny sparkline. */
function Kpi({ icon: I, label, value, prefix = '', suffix = '', decimals = 0, delta, spark, start, delay, hint }) {
  const tilt = useTilt(6);
  return (
    <div className="animate-fadeUp h-full" style={{ animationDelay: `${delay}ms` }}>
    <div {...tilt} className="card tilt spin-card glow-card group relative h-full overflow-hidden p-5" style={{ '--spin-color': BRAND, '--glow': 'rgba(139,92,246,.45)' }}>
      <span className="tilt-light" />
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-500 opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-30" />
      <div className="relative flex items-start justify-between">
        <span className="pulse-ring rounded-xl bg-brand-500/10 p-2 text-brand-400 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" style={{ '--ring': 'rgba(139,92,246,.45)' }}><I className="h-4 w-4" /></span>
        <Delta value={delta} />
      </div>
      <p className="tilt-pop relative mt-4 font-display text-3xl font-bold text-white"><CountUp value={value} start={start} decimals={decimals} prefix={prefix} duration={1800} />{suffix}</p>
      <p className="relative mt-0.5 text-sm text-slate-400">{label}</p>
      {hint && <p className="relative text-xs text-slate-500">{hint}</p>}
      {spark && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={start ? spark : []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs><linearGradient id={`sp-${label.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BRAND} stopOpacity={0.35} /><stop offset="100%" stopColor={BRAND} stopOpacity={0} /></linearGradient></defs>
              <Area type="monotone" dataKey="v" stroke={BRAND} strokeWidth={2} fill={`url(#sp-${label.replace(/[^a-z0-9]/gi, '')})`} isAnimationActive animationDuration={2200} animationEasing="ease-out" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
    </div>
  );
}

/** Animated ring for a rate (0–100 %). */
function Ring({ label, value, color, start, hint, suffix = '%', max = 100, decimals = 0 }) {
  const size = 112;
  const r = size / 2 - 9;
  const c = 2 * Math.PI * r;
  const v = useCountUp(value ?? 0, { start, duration: 1800 });
  const off = c * (1 - Math.min(v / max, 1));
  return (
    <div className="flex flex-col items-center text-center">
      <div className="group relative transition-transform duration-300 hover:scale-105" style={{ width: size, height: size }}>
        <span className="pointer-events-none absolute inset-2 rounded-full opacity-25 blur-xl transition-opacity group-hover:opacity-50" style={{ background: color }} />
        <svg width={size} height={size} className="relative -rotate-90" style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--ink-700))" strokeWidth="9" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={value == null ? c : off} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-bold text-white tabular-nums">{value == null ? '—' : `${v.toFixed(decimals)}${suffix}`}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-200">{label}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </div>
  );
}

/** Modern breakdown list: name, count, share % and an animated bar. */
function Breakdown({ title, rows, start, empty = 'No data yet', limit = 8 }) {
  const merged = new Map();
  for (const r of rows || []) {
    const name = (r._id == null || r._id === '' ? 'Unknown' : String(r._id)).trim() || 'Unknown';
    merged.set(name, (merged.get(name) || 0) + r.n);
  }
  const list = [...merged].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
  const total = list.reduce((s, r) => s + r.n, 0);
  const top = list.slice(0, limit);
  const max = Math.max(...top.map((r) => r.n), 1);
  return (
    <div className="card spin-card glow-card h-full p-5" style={{ '--glow': 'rgba(139,92,246,.35)' }}>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-500">{total} total</span>
      </div>
      {!top.length ? <p className="py-6 text-center text-sm text-slate-500">{empty}</p> : (
        <ul className="stagger space-y-3">
          {top.map((r, i) => (
            <li key={r.name} className="rounded-lg px-1 transition hover:bg-ink-700/40">
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-300" title={r.name}>{r.name}</span>
                <span className="shrink-0 tabular-nums"><span className="font-semibold text-white">{r.n}</span><span className="ml-2 inline-block w-12 text-right text-xs text-slate-500">{pct(r.n, total)}%</span></span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                <div className="bar-shine h-full rounded-full bg-brand-gradient transition-[width] duration-[1400ms] ease-out" style={{ width: start ? `${(r.n / max) * 100}%` : '0%', transitionDelay: `${i * 80}ms` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Funnel({ steps, start }) {
  const top = Math.max(steps[0]?.n || 0, 1);
  return (
    <div className="card spin-card h-full p-5">
      <h3 className="font-semibold text-white">Conversion funnel</h3>
      <p className="mb-5 text-xs text-slate-500">Each step shows how many moved on from the step before it.</p>
      <div className="stagger space-y-2.5">
        {steps.map((f, i) => {
          const prev = i ? steps[i - 1].n : null;
          const stepRate = prev ? pct(f.n, prev) : null;
          const width = Math.max(4, (f.n / top) * 100);
          return (
            <div key={f.stage} className="grid grid-cols-[130px_1fr_120px] items-center gap-3 text-sm sm:grid-cols-[170px_1fr_140px]">
              <span className="text-slate-400">{f.stage}</span>
              <div className="flex h-9 items-center justify-center">
                <div className="bar-shine flex h-full items-center justify-end rounded-lg bg-brand-gradient px-2 text-xs font-semibold text-snow shadow-lg shadow-brand-500/30 transition-[width] duration-[1400ms] ease-out" style={{ width: start ? `${width}%` : '0%', opacity: 1 - i * 0.08, transitionDelay: `${i * 120}ms` }}>
                  {width > 12 && f.n.toLocaleString()}
                </div>
              </div>
              <span className="text-right">
                <span className="font-semibold text-white">{f.n.toLocaleString()}</span>
                {i > 0 && stepRate == null && <span className="ml-2 text-xs text-slate-500">—</span>}
                {i > 0 && stepRate != null && <span className={cn('ml-2 text-xs', stepRate >= 50 ? 'text-emerald-500' : stepRate >= 15 ? 'text-amber-500' : 'text-slate-500')}>{stepRate}%</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TREND = [['visitors', 'Visitors'], ['leads', 'Leads'], ['orders', 'Orders']];

export default function Reports() {
  const [days, setDays] = useState('30');
  const [metric, setMetric] = useState('visitors');
  const { data, loading, error } = useFetch('/reports/overview', { days });
  const [ref, inView] = useInView({ threshold: 0.05 });
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const a = data.analytics;
  const p = data.prev || {};
  const o = data.orders || {};
  const leads = data.funnel[1]?.n || 0;
  const won = data.funnel.at(-1)?.n || 0;
  const rev = data.revenue.reduce((acc, r) => ({ total: acc.total + (r.total || 0), paid: acc.paid + (r.paid || 0) }), { total: 0, paid: 0 });
  const trend = data.trend || [];
  const spark = (k) => trend.map((t) => ({ v: t[k] }));
  const periodLabel = PERIODS.find(([v]) => v === days)?.[1].toLowerCase();
  const visitorToLead = pct(leads, a.pageviews);
  const prevVisitorToLead = pct(p.leads, p.pageviews);
  const accepted = (data.proposals.find((x) => x._id === 'Accepted') || {}).n || 0;
  const proposalsTotal = data.proposals.reduce((s, x) => s + x.n, 0);
  const k = `${days}-${inView}`;

  return (
    <div ref={ref} className="space-y-6">
      <Aurora className="animate-fadeUp">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-snow/15 bg-snow/5 px-3 py-1 text-xs text-snow/70">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" /></span>
              Live analytics · compared with the {periodLabel?.replace('last ', 'previous ')}
            </p>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-snow sm:text-4xl">Reports <span className="shimmer-text">&amp; analytics</span></h1>
            <p className="mt-2 max-w-xl text-sm text-snow/60">Traffic, leads, orders and conversion — {periodLabel}.</p>
          </div>
          <span className="relative self-start">
            <select value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period" className="hero-glass min-w-[190px] cursor-pointer appearance-none rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-snow outline-none focus:ring-2 focus:ring-[#c4b5fd]">
              {PERIODS.map(([v, l]) => <option key={v} value={v} className="text-slate-900">{l}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-snow/70" />
          </span>
        </div>
        <div key={`h-${k}`} className="stagger mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Visitors', a.pageviews, '', 0, change(a.pageviews, p.pageviews)],
            ['Leads', leads, '', 0, change(leads, p.leads)],
            ['Orders', o.placed || 0, '', 0, change(o.placed || 0, o.prevPlaced || 0)],
            ['Visitor → won', pct(won, a.pageviews), '', 2, 'rate', '%'],
          ].map(([l, v, pre, d, dl, suf]) => (
            <div key={l} className="hero-glass rounded-2xl p-4 transition hover:-translate-y-1 hover:bg-snow/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-snow/60">{l}</p>
              <p className="shimmer-text mt-1 font-display text-3xl font-bold"><CountUp value={v} start={inView} decimals={d} prefix={pre} duration={2200} />{suf}</p>
              {dl === 'rate' ? <p className="mt-1 text-xs text-snow/50">of all visitors</p> : dl == null ? <p className="mt-1 text-xs font-semibold text-[#c4b5fd]">new this period</p> : <p className={cn('mt-1 text-xs font-semibold', dl >= 0 ? 'text-[#6ee7b7]' : 'text-[#fda4af]')}>{dl >= 0 ? '+' : ''}{dl}% vs previous</p>}
            </div>
          ))}
        </div>
      </Aurora>

      <div key={k} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Kpi icon={Globe} label="Visitors (pageviews)" value={a.pageviews} delta={change(a.pageviews, p.pageviews)} spark={spark('visitors')} start={inView} delay={0} />
        <Kpi icon={Users} label="New leads" value={leads} delta={change(leads, p.leads)} spark={spark('leads')} start={inView} delay={80} />
        <Kpi icon={Target} label="Visitor → lead" value={visitorToLead} decimals={1} suffix="%" delta={prevVisitorToLead ? change(visitorToLead, prevVisitorToLead) : null} start={inView} delay={160} hint="of visitors became leads" />
        <Kpi icon={Trophy} label="Lead → won" value={data.conversionRate} decimals={1} suffix="%" delta={p.leads ? change(data.conversionRate, pct(p.won, p.leads)) : null} start={inView} delay={240} hint={`${won} won deal${won === 1 ? '' : 's'}`} />
        <Kpi icon={ShoppingBag} label="Orders placed" value={o.placed || 0} delta={change(o.placed || 0, o.prevPlaced || 0)} spark={spark('orders')} start={inView} delay={320} />
        <Kpi icon={DollarSign} label="Average order value" value={o.aov || 0} prefix="$" decimals={0} delta={change(o.aov || 0, o.prevAov || 0)} start={inView} delay={400} />
      </div>

      <div className="card spin-card animate-fadeUp p-5" style={{ animationDelay: '300ms' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-white">Daily trend</h3>
            <p className="text-xs text-slate-500">{TREND.find(([v]) => v === metric)[1]} per day · {periodLabel}</p>
          </div>
          <div className="flex rounded-xl border border-ink-600 p-1" role="tablist">
            {TREND.map(([v, l]) => (
              <button key={v} role="tab" aria-selected={metric === v} onClick={() => setMetric(v)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition', metric === v ? 'bg-brand-500 text-snow shadow' : 'text-slate-400 hover:text-white')}>{l}</button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart key={`${k}-${metric}`} data={inView ? trend : []} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BRAND} stopOpacity={0.5} /><stop offset="100%" stopColor="#d946ef" stopOpacity={0} /></linearGradient>
                <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#d946ef" /></linearGradient>
                <filter id="trendGlow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <CartesianGrid stroke="rgb(var(--ink-700))" strokeDasharray="3 6" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(trend.length / 10) - 1)} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tipStyle} cursor={{ stroke: 'rgb(var(--ink-500))', strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey={metric} name={TREND.find(([v]) => v === metric)[1]} stroke="url(#trendStroke)" strokeWidth={3} fill="url(#trendFill)" filter="url(#trendGlow)" isAnimationActive animationDuration={1800} animationEasing="ease-out" dot={false} activeDot={{ r: 6, strokeWidth: 3, stroke: 'rgb(var(--ink-850))', fill: '#a78bfa' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid animate-fadeUp gap-6 xl:grid-cols-[1.4fr_1fr]" style={{ animationDelay: '400ms' }}>
        <Funnel steps={data.funnel} start={inView} />
        <div className="card spin-card h-full p-5" style={{ '--spin-color': '#10b981' }}>
          <h3 className="font-semibold text-white">Order health</h3>
          <p className="mb-5 text-xs text-slate-500">Orders placed {periodLabel}</p>
          <div className="stagger grid grid-cols-2 gap-y-6 sm:grid-cols-3">
            <Ring label="Completed" value={o.completionRate} color="#0f9f6e" start={inView} hint="of closed orders" />
            <Ring label="On time" value={o.onTimeRate} color="#0f9f6e" start={inView} hint="delivered by due date" />
            <Ring label="Repeat clients" value={o.repeatRate} color={BRAND} start={inView} hint="ordered more than once" />
            <Ring label="Revisions" value={o.revisionRate} color="#c47a00" start={inView} hint="of delivered orders" />
            <Ring label="Cancelled" value={o.cancelRate} color="#e11d48" start={inView} hint="of closed orders" />
            <Ring label="Avg rating" value={o.avgRating} max={5} suffix="★" decimals={1} color="#f59e0b" start={inView} hint={`${o.reviews || 0} published reviews`} />
          </div>
        </div>
      </div>

      <div key={`s-${k}`} className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { I: Receipt, l: 'Invoiced', v: fmtMoney(rev.total), h: `${pct(rev.paid, rev.total)}% collected` },
          { I: DollarSign, l: 'Collected', v: fmtMoney(rev.paid), h: `${fmtMoney(Math.max(0, rev.total - rev.paid))} outstanding` },
          { I: FileText, l: 'Proposals accepted', v: accepted, h: `${pct(accepted, proposalsTotal)}% of ${proposalsTotal} proposals` },
          { I: CalendarDays, l: 'Meetings booked', v: a.appointments, h: <Delta value={change(a.appointments, p.appointments)} /> },
          { I: FileText, l: 'Form submissions', v: a.formSubmits, h: <Delta value={change(a.formSubmits, p.formSubmits)} /> },
          { I: Bot, l: 'Chatbot sessions', v: a.chatOpens, h: `${a.chatMessages} messages` },
          { I: Star, l: 'Average rating', v: o.avgRating ? `${o.avgRating} / 5` : '—', h: `${o.reviews || 0} reviews` },
          { I: Users, l: 'Leads won', v: won, h: `${data.conversionRate}% of leads` },
        ].map((x) => (
          <div key={x.l} className="card spin-card glow-card group flex items-center gap-4 p-4 hover:-translate-y-1" style={{ '--glow': 'rgba(139,92,246,.4)' }}>
            <span className="pulse-ring rounded-xl bg-brand-500/10 p-2.5 text-brand-400 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" style={{ '--ring': 'rgba(139,92,246,.4)' }}><x.I className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500">{x.l}</p>
              <p className="font-display text-xl font-semibold text-white">{x.v}</p>
              <div className="text-xs text-slate-500">{x.h}</div>
            </div>
          </div>
        ))}
      </div>

      <div key={`b-${k}`} className="stagger grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Breakdown title="Leads by source" rows={data.bySource} start={inView} />
        <Breakdown title="Leads by status" rows={data.byStatus} start={inView} />
        <Breakdown title="Service interest" rows={data.byService} start={inView} />
        <Breakdown title="Industry interest" rows={data.byIndustry} start={inView} />
        <Breakdown title="Leads by country" rows={data.byCountry} start={inView} />
        <Breakdown title="Projects by status" rows={data.projectsByStatus} start={inView} />
        <Breakdown title="Traffic by source" rows={a.trafficBySource} start={inView} />
        <Breakdown title="Top pages" rows={a.topPages} start={inView} limit={10} />
      </div>
      <p className="text-xs text-slate-500">Percentages next to each row are its share of the total. First-party analytics respect cookie consent.</p>
    </div>
  );
}
