import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Loader, RotateCcw, FolderKanban, Target, Sparkles } from 'lucide-react';
import { useFetch } from '../../lib/utils';
import { useSocketEvent } from '../../lib/realtime';
import { useInView, useTilt } from '../../lib/anim';
import { CountUp } from '../../components/LiveStats';

// fixed "random" layout for the rising sparks (stable between renders)
const SPARKS = Array.from({ length: 18 }, (_, i) => ({ left: `${(i * 53) % 100}%`, dur: `${7 + ((i * 7) % 9)}s`, delay: `${(i * 1.3) % 9}s`, size: 2 + (i % 3) }));

function greeting(h) {
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">
      {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

function Mini({ icon: I, label, value, sub, to, color, start, delay, prefix }) {
  const tilt = useTilt(10);
  const body = (
    <div {...tilt} className="tilt hero-glass relative h-full rounded-2xl p-4 transition-colors hover:bg-snow/10">
      <span className="tilt-light" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-snow/60">{label}</span>
        <span className="pulse-ring rounded-lg p-1.5" style={{ background: `${color}33`, color, '--ring': `${color}88` }}><I className="h-3.5 w-3.5" /></span>
      </div>
      <p className="tilt-pop mt-2 font-display text-2xl font-bold text-snow"><CountUp value={value || 0} start={start} duration={1800} prefix={prefix} /></p>
      {sub && <p className="text-xs text-snow/50">{sub}</p>}
    </div>
  );
  return <div className="animate-fadeUp" style={{ animationDelay: `${delay}ms` }}>{to ? <Link to={to} className="block h-full">{body}</Link> : body}</div>;
}

/** Big animated welcome banner at the top of the admin dashboard. */
export default function DashboardHero({ user, kpis, showRevenue }) {
  const { data, refresh } = useFetch(showRevenue ? '/reports/revenue' : null, { range: '30d' }, { skip: !showRevenue });
  useSocketEvent('order:stats', () => showRevenue && refresh());
  const [ref, inView] = useInView({ threshold: 0.1 });
  const t = data?.totals;
  const change = t?.completed?.change;
  const spark = (data?.series || []).map((s, i, arr) => ({ v: arr.slice(0, i + 1).reduce((a, x) => a + x.completed, 0) })); // running total
  const first = user?.name?.split(' ')[0] || 'there';

  return (
    <section ref={ref} className="dash-hero rounded-3xl p-6 shadow-2xl shadow-brand-900/30 sm:p-8">
      <span className="blob blob-a" /><span className="blob blob-b" /><span className="blob blob-c" /><span className="blob blob-d" />
      <span className="hero-grid" />
      {SPARKS.map((s, i) => <span key={i} className="spark" style={{ left: s.left, animationDuration: s.dur, animationDelay: s.delay, width: s.size, height: s.size }} />)}

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div className="animate-fadeUp">
          <p className="inline-flex items-center gap-2 rounded-full border border-snow/15 bg-snow/5 px-3 py-1 text-xs text-snow/70">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" /></span>
            Live · <Clock />
          </p>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-snow sm:text-4xl">
            {greeting(new Date().getHours())}, <span className="shimmer-text">{first}</span>
          </h1>
          {showRevenue ? (
            <>
              <p className="mt-5 text-sm text-snow/60">Revenue earned · last 30 days</p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <p className="shimmer-text font-display text-5xl font-bold leading-none sm:text-6xl"><CountUp value={t?.completed?.amount || 0} start={inView && !!t} duration={2400} prefix="$" /></p>
                {change != null && (
                  <span className={`mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${change >= 0 ? 'bg-[#34d399]/15 text-[#6ee7b7]' : 'bg-[#fb7185]/15 text-[#fda4af]'}`}>
                    {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{change >= 0 ? '+' : ''}{change}% vs previous 30 days
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-snow/50">{t ? `${t.completed.count} completed order${t.completed.count === 1 ? '' : 's'}` : 'Loading…'}</p>
              <div className="mt-4 h-16 max-w-md">
                {spark.length > 1 && inView && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c4b5fd" stopOpacity={0.55} /><stop offset="100%" stopColor="#c4b5fd" stopOpacity={0} /></linearGradient>
                        <filter id="heroGlow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#e9d5ff" strokeWidth={2.5} fill="url(#heroSpark)" filter="url(#heroGlow)" isAnimationActive animationDuration={2400} animationEasing="ease-out" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          ) : (
            <p className="mt-4 max-w-lg text-snow/60"><Sparkles className="mr-1 inline h-4 w-4" /> Here's what's happening across Zeviro today.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {showRevenue && <Mini icon={Loader} label="Active orders" value={t?.active?.count} sub={t ? `$${Math.round(t.active.amount).toLocaleString()} in progress` : ''} to="/admin/orders?status=In%20Progress" color="#a78bfa" start={inView && !!t} delay={150} />}
          {showRevenue && <Mini icon={RotateCcw} label="In revision" value={t?.revision?.count} sub={t ? `$${Math.round(t.revision.amount).toLocaleString()} value` : ''} to="/admin/orders?status=Revision%20Requested" color="#fbbf24" start={inView && !!t} delay={250} />}
          <Mini icon={FolderKanban} label="Active projects" value={kpis.activeProjects} sub="being delivered" to="/admin/projects" color="#38bdf8" start={inView} delay={350} />
          <Mini icon={Target} label="New leads" value={kpis.newLeads} sub="last 30 days" to="/admin/leads" color="#34d399" start={inView} delay={450} />
        </div>
      </div>
    </section>
  );
}
