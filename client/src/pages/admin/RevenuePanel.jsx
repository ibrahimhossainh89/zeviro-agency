import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Sector, ReferenceLine } from 'recharts';
import { CheckCircle2, Loader, RotateCcw, XCircle, TrendingUp, TrendingDown, Table2, BarChart3, ChevronDown, CalendarRange } from 'lucide-react';
import { useFetch, cn } from '../../lib/utils';
import { useSocketEvent } from '../../lib/realtime';
import { useInView, useTilt } from '../../lib/anim';
import { CountUp } from '../../components/LiveStats';

// Status colours — validated for light & dark surfaces (each one also carries an icon + label)
const C = { completed: '#0f9f6e', active: '#8b5cf6', revision: '#c47a00', cancelled: '#e11d48' };
const RANGES = [
  ['7d', 'Last 7 days'],
  ['15d', 'Last 15 days'],
  ['30d', 'Last 30 days'],
  ['60d', 'Last 60 days'],
  ['90d', 'Last 90 days'],
  ['6m', 'Last 6 months'],
  ['ytd', 'This year'],
  ['year', 'Yearly (pick a year)'],
  ['all', 'All years'],
  ['custom', 'Custom date range'],
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nice = (v) => {
  const [y, m, d] = v.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const TILES = [
  { key: 'completed', label: 'Completed revenue', icon: CheckCircle2, status: 'Completed', hint: 'Earned from completed orders' },
  { key: 'active', label: 'Active orders', icon: Loader, status: 'In Progress', hint: 'In progress + delivered, not yet accepted' },
  { key: 'revision', label: 'In revision', icon: RotateCcw, status: 'Revision Requested', hint: 'Client asked for changes' },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, status: 'Cancelled', hint: 'Value of cancelled orders' },
];
const usd = (n, d = 0) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
const tooltipStyle = { background: 'rgb(var(--ink-850))', border: '1px solid rgb(var(--ink-600))', color: 'rgb(var(--white))', borderRadius: 12, fontSize: 12 };

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-medium text-white">{label}</p>
      <p className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: C.completed }} /> Completed <span className="ml-auto pl-3 font-semibold text-white">{usd(p.completed, 2)}</span></p>
      <p className="text-slate-500">{p.orders} order{p.orders === 1 ? '' : 's'} completed</p>
      <p className="mt-1 flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: C.cancelled }} /> Cancelled <span className="ml-auto pl-3 font-semibold text-white">{usd(p.cancelled, 2)}</span></p>
    </div>
  );
}

function Tile({ t, data, start, delay, rangeLabel, share }) {
  const I = t.icon;
  const change = t.key === 'completed' ? data.change : null;
  const tilt = useTilt(6);
  const color = C[t.key];
  return (
    <div className="animate-fadeUp" style={{ animationDelay: `${delay}ms` }}>
      <Link
        to={`/admin/orders?status=${encodeURIComponent(t.status)}`}
        {...tilt}
        className="card tilt spin-card glow-card group relative block h-full overflow-hidden p-5"
        style={{ '--spin-color': color, '--glow': `${color}66` }}
      >
        <span className="tilt-light" />
        <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity duration-500 group-hover:opacity-40" style={{ background: color }} />
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
        {t.key === 'completed' && <span className="earn-shine pointer-events-none absolute inset-0" />}
        <div className="relative flex items-start justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.label}</span>
          <span className="pulse-ring rounded-xl p-2" style={{ background: `${color}1f`, color, '--ring': `${color}77` }}><I className={cn('h-4 w-4', t.key === 'active' && 'animate-[spin_4s_linear_infinite]')} /></span>
        </div>
        <p className="tilt-pop relative mt-2 font-display text-3xl font-bold text-white sm:text-[2rem]"><CountUp value={data.amount} start={start} duration={2200} decimals={0} prefix="$" /></p>
        <p className="relative mt-1 text-sm text-slate-400"><span className="font-semibold text-white"><CountUp value={data.count} start={start} duration={1600} /></span> order{data.count === 1 ? '' : 's'} · {/^(Last|This|All)/.test(rangeLabel) ? rangeLabel.toLowerCase() : /^Year/.test(rangeLabel) ? rangeLabel : 'selected dates'}</p>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-ink-700">
          <div className="bar-shine h-full rounded-full transition-[width] duration-[1800ms] ease-out" style={{ width: start ? `${Math.max(share, data.amount ? 3 : 0)}%` : '0%', background: `linear-gradient(90deg, ${color}aa, ${color})`, transitionDelay: `${delay + 250}ms` }} />
        </div>
        <div className="relative mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{t.hint}</span>
          {change != null ? (
            <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', change >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
              {change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{change >= 0 ? '+' : ''}{change}%
            </span>
          ) : <span className="font-medium text-slate-400">{Math.round(share)}%</span>}
        </div>
      </Link>
    </div>
  );
}

/** Bar with a rounded top that rises into place — each bar a little after the one before (a wave). */
function RiseBar({ x, y, width, height, fill, index, count }) {
  if (!height || height <= 0 || !width) return null;
  const r = Math.min(5, width / 2, height);
  const d = `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
  const step = Math.min(60, 1400 / Math.max(count, 1));
  return <path d={d} fill={fill} className="bar-rise" style={{ animationDelay: `${index * step}ms` }} filter="url(#barGlow)" />;
}

/** Donut slice that grows when hovered. */
function ActiveSlice(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 11} outerRadius={outerRadius + 14} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.5} />
    </g>
  );
}

/** Live order-revenue dashboard: completed revenue, active, revision and cancelled orders for a chosen period. */
export default function RevenuePanel() {
  const thisYear = new Date().getFullYear();
  const [range, setRange] = useState('30d'); // default: last 30 days
  const [year, setYear] = useState(thisYear);
  const [custom, setCustom] = useState(() => ({ from: iso(new Date(Date.now() - 29 * 864e5)), to: iso(new Date()) }));
  const [applied, setApplied] = useState(custom);
  const [table, setTable] = useState(false);
  const [mode, setMode] = useState('period'); // 'period' | 'total'
  const [hover, setHover] = useState(-1);
  const params = range === 'year' ? { range, year } : range === 'custom' ? { range, from: applied.from, to: applied.to } : { range };
  const { data, refresh, error } = useFetch('/reports/revenue', params);
  const [ref, inView] = useInView({ threshold: 0.15 });
  useSocketEvent('order:stats', refresh);
  useSocketEvent('order:update', refresh);
  const viewKey = JSON.stringify(params);
  const years = data?.years?.length ? data.years : [thisYear];
  const rangeLabel = range === 'year' ? `Year ${year}` : range === 'all' ? 'All time' : range === 'custom' ? `${nice(applied.from)} – ${nice(applied.to)}` : RANGES.find(([k]) => k === range)[1];
  const chartTitle = range === 'all' ? 'by year' : range === 'year' ? `${year}, by month` : range === 'custom' ? rangeLabel : rangeLabel.toLowerCase();
  const customBad = !custom.from || !custom.to || custom.from > custom.to;

  const t = data?.totals;
  const pie = useMemo(() => (t ? TILES.map((x) => ({ key: x.key, name: x.label, value: t[x.key].amount })).filter((x) => x.value > 0) : []), [t]);
  const pipeline = t ? TILES.reduce((s, x) => s + t[x.key].amount, 0) : 0;
  const tickEvery = data ? Math.max(0, Math.ceil(data.series.length / 8) - 1) : 0;
  const series = useMemo(() => {
    let a = 0;
    let c = 0;
    return (data?.series || []).map((x) => ({ ...x, completedTotal: (a += x.completed), cancelledTotal: (c += x.cancelled) }));
  }, [data]);
  const withRevenue = series.filter((x) => x.completed > 0);
  const avg = withRevenue.length ? withRevenue.reduce((s2, x) => s2 + x.completed, 0) / withRevenue.length : 0;
  const best = series.reduce((m, x) => (x.completed > (m?.completed || 0) ? x : m), null);

  return (
    <section ref={ref} className="space-y-4">
      <div className="flex flex-col justify-between gap-3 2xl:flex-row 2xl:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            Order revenue
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
            <span className="text-xs font-normal text-slate-500">live</span>
          </h2>
          <p className="text-sm text-slate-500">Completed and cancelled by the date it happened · active and revision by the date work started</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            Period
            <span className="relative">
              <select value={range} onChange={(e) => setRange(e.target.value)} className="input min-w-[190px] cursor-pointer appearance-none py-2 pr-9 text-sm font-medium" aria-label="Period">
                {RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
          {range === 'year' && (
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Year
              <span className="relative">
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input min-w-[110px] cursor-pointer appearance-none py-2 pr-9 text-sm font-medium" aria-label="Year">
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </span>
            </label>
          )}
          {range === 'custom' && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!customBad) setApplied(custom); }}>
              <label className="flex flex-col gap-1 text-xs text-slate-500">From<input type="date" className="input py-2 text-sm" value={custom.from} max={custom.to || iso(new Date())} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">To<input type="date" className="input py-2 text-sm" value={custom.to} min={custom.from} max={iso(new Date())} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></label>
              <button type="submit" disabled={customBad || (custom.from === applied.from && custom.to === applied.to)} className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"><CalendarRange className="mr-1.5 inline h-4 w-4" />Apply</button>
            </form>
          )}
        </div>
      </div>
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">{error}</p>}

      {!t ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{TILES.map((x) => <div key={x.key} className="card h-40 animate-pulse" />)}</div>
      ) : (
        <>
          <div key={viewKey} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {TILES.map((x, i) => <Tile key={x.key} t={x} data={t[x.key]} start={inView} delay={i * 120} rangeLabel={rangeLabel} share={pipeline ? (t[x.key].amount / pipeline) * 100 : 0} />)}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <div className="card spin-card animate-fadeUp p-5 xl:col-span-2" style={{ animationDelay: '450ms', '--spin-color': C.completed }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">Revenue — {chartTitle}</h3>
                  <div className="mt-1 flex gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.completed }} /> Completed revenue</span>
                    <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t-2 border-dashed" style={{ borderColor: C.cancelled }} /> Cancelled value</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                {!table && (
                  <div className="flex rounded-xl border border-ink-600 p-0.5 text-xs" role="tablist" aria-label="Chart mode">
                    {[['period', 'Per period'], ['total', 'Running total']].map(([v, l]) => (
                      <button key={v} role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={cn('rounded-lg px-2.5 py-1 font-medium transition', mode === v ? 'bg-brand-500 text-snow shadow' : 'text-slate-400 hover:text-white')}>{l}</button>
                    ))}
                  </div>
                )}
                <button onClick={() => setTable(!table)} className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white">
                  {table ? <><BarChart3 className="h-3.5 w-3.5" /> Chart</> : <><Table2 className="h-3.5 w-3.5" /> Table</>}
                </button>
                </div>
              </div>
              {table ? (
                <div className="max-h-72 overflow-auto text-sm">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-ink-850 text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Period</th><th className="py-2 text-right">Completed</th><th className="py-2 text-right">Orders</th><th className="py-2 text-right">Cancelled</th></tr></thead>
                    <tbody>{data.series.filter((s) => s.completed || s.cancelled).map((s) => <tr key={s.label} className="border-t border-ink-700/60"><td className="py-1.5 text-slate-300">{s.label}</td><td className="py-1.5 text-right text-white">{usd(s.completed, 2)}</td><td className="py-1.5 text-right text-slate-300">{s.orders}</td><td className="py-1.5 text-right text-slate-300">{usd(s.cancelled, 2)}</td></tr>)}</tbody>
                  </table>
                  {!data.series.some((s) => s.completed || s.cancelled) && <p className="py-6 text-center text-slate-500">No completed or cancelled orders in this period.</p>}
                </div>
              ) : (
                <>
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-500">Total <b className="ml-1"><CountUp value={t.completed.amount} start={inView} prefix="$" duration={1800} /></b></span>
                  {avg > 0 && <span className="rounded-full bg-ink-700/60 px-2.5 py-1 text-slate-400">Average <b className="ml-1 text-white">{usd(avg)}</b> per {data.bucket === 'day' ? 'day' : data.bucket} with sales</span>}
                  {best?.completed > 0 && <span className="rounded-full bg-ink-700/60 px-2.5 py-1 text-slate-400">Best <b className="ml-1 text-white">{usd(best.completed)}</b> · {best.label}</span>}
                </div>
                <div className={cn('h-72', mode === 'total' && 'draw-line')}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart key={`${viewKey}-${inView}-${mode}`} data={inView ? series : []} margin={{ left: 0, right: 16, top: 16 }} barCategoryGap={series.length > 20 ? 2 : '28%'}>
                      <defs>
                        <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                          <stop offset="55%" stopColor={C.completed} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={C.completed} stopOpacity={0.35} />
                        </linearGradient>
                        <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.completed} stopOpacity={0.45} />
                          <stop offset="100%" stopColor={C.completed} stopOpacity={0} />
                        </linearGradient>
                        <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={C.completed} floodOpacity="0.45" /></filter>
                        <filter id="lineGlow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                      </defs>
                      <CartesianGrid stroke="rgb(var(--ink-700))" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={tickEvery} padding={{ left: 4, right: 4 }} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`)} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(139,92,246,0.08)', stroke: 'rgb(var(--ink-500))', strokeDasharray: '3 3' }} />
                      {mode === 'period' ? (
                        <>
                          <Bar dataKey="completed" name="Completed" fill="url(#revBar)" maxBarSize={56} isAnimationActive={false} shape={(p) => <RiseBar {...p} count={series.length} />} />
                          {avg > 0 && <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: `avg ${usd(avg)}`, position: 'insideTopRight', fill: '#94a3b8', fontSize: 11 }} />}
                          <Line type="monotone" dataKey="cancelled" name="Cancelled" stroke={C.cancelled} strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--ink-850))' }} isAnimationActive animationDuration={2200} animationBegin={900} animationEasing="ease-out" />
                        </>
                      ) : (
                        <>
                          <Area type="monotone" dataKey="completedTotal" name="Completed (running total)" stroke={C.completed} strokeWidth={3} fill="url(#revArea)" filter="url(#lineGlow)" isAnimationActive animationDuration={2400} animationEasing="ease-out" dot={false} activeDot={{ r: 6, strokeWidth: 3, stroke: 'rgb(var(--ink-850))', fill: C.completed }} />
                          <Line type="monotone" dataKey="cancelledTotal" name="Cancelled (running total)" stroke={C.cancelled} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive animationDuration={2400} animationBegin={500} />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                </>
              )}
            </div>

            <div className="card spin-card flex animate-fadeUp flex-col p-5" style={{ animationDelay: '550ms' }}>
              <h3 className="font-semibold text-white">Where the money is</h3>
              <p className="text-xs text-slate-500">{rangeLabel}</p>
              <div className="relative mx-auto my-4 h-52 w-52">
                <span className="donut-halo" />
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie key={`${viewKey}-${inView}`} data={inView ? pie : []} activeIndex={hover} activeShape={ActiveSlice} onMouseEnter={(_, i) => setHover(i)} onMouseLeave={() => setHover(-1)} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="98%" paddingAngle={pie.length > 1 ? 2 : 0} stroke="rgb(var(--ink-850))" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive animationDuration={1800} animationEasing="ease-out">
                      {pie.map((p) => <Cell key={p.key} fill={C[p.key]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => usd(v, 2)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-500">{hover >= 0 ? `${pipeline ? Math.round((pie[hover]?.value / pipeline) * 100) : 0}%` : 'Total value'}</span>
                  <span className="font-display text-2xl font-bold text-white">{hover >= 0 && pie[hover] ? usd(pie[hover].value) : <CountUp value={pipeline} start={inView} duration={2000} prefix="$" />}</span>
                  {hover >= 0 && pie[hover] && <span className="text-[11px] text-slate-400">{pie[hover].name}</span>}
                </div>
              </div>
              <ul className="stagger mt-auto space-y-1 text-sm">
                {TILES.map((x) => (
                  <li key={x.key} onMouseEnter={() => setHover(pie.findIndex((p) => p.key === x.key))} onMouseLeave={() => setHover(-1)} className={cn('flex cursor-default items-center gap-2 rounded-lg px-2 py-1 transition', pie[hover]?.key === x.key && 'bg-ink-700/60')}>
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: C[x.key] }} />
                    <span className="text-slate-400">{x.label}</span>
                    <span className="ml-auto font-medium text-white">{usd(t[x.key].amount)}</span>
                    <span className="w-10 text-right text-xs text-slate-500">{pipeline ? Math.round((t[x.key].amount / pipeline) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
