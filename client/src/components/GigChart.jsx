import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, AreaChart, Area, CartesianGrid } from 'recharts';
import { fmtDate } from '../lib/utils';

const shortName = (g) => {
  const t = `${g.title} ${g.service || ''}`;
  if (/excel|spreadsheet/i.test(t)) return 'Excel & sheets';
  if (/lead|prospect/i.test(t)) return 'B2B leads';
  if (/web dev|react|website/i.test(t)) return 'Web dev';
  if (/data entry/i.test(t)) return 'Data entry';
  return (g.service || 'Gig').slice(0, 14);
};

function TipBox({ active, payload }) {
  if (!active || !payload?.length) return null;
  const g = payload[0].payload;
  return (
    <div className="max-w-[240px] rounded-xl border border-ink-600 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-medium text-white">{g.full}</p>
      <p className="mt-1 text-slate-400"><span className="text-white">{g.reviews.toLocaleString()}</span> reviews · <span className="text-amber-400">★</span> {g.rating?.toFixed(1)}</p>
    </div>
  );
}

/** Horizontal bars: number of reviews per Fiverr gig (one series, one hue). */
export default function GigChart({ gigs = [] }) {
  const data = gigs
    .filter((g) => g.reviewsCount)
    .map((g) => ({ name: shortName(g), full: g.title, reviews: g.reviewsCount, rating: g.rating }))
    .sort((a, b) => b.reviews - a.reviews);
  return (
    <div className="mt-3 h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 44, left: 0, bottom: 0 }} barCategoryGap={8}>
          <defs>
            <linearGradient id="gigBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip content={<TipBox />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
          <Bar dataKey="reviews" fill="url(#gigBar)" radius={[0, 4, 4, 0]} minPointSize={3} isAnimationActive animationDuration={1600} animationEasing="ease-out">
            <LabelList dataKey="reviews" position="right" fill="#94a3b8" fontSize={12} formatter={(v) => v.toLocaleString()} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Area chart of the Fiverr review count over time (a point is recorded each time the admin updates it). */
export function ReviewHistory({ history = [] }) {
  const data = history.filter((h) => h.fiverrReviews).map((h) => ({ at: fmtDate(h.at, { day: 'numeric', month: 'short' }), reviews: h.fiverrReviews, rating: h.fiverrRating }));
  if (data.length < 2) return null;
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8b5cf6" stopOpacity={0.45} />
              <stop offset="1" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.12)" />
          <XAxis dataKey="at" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis width={40} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip contentStyle={{ background: 'rgba(18,18,31,.95)', border: '1px solid #2a2a40', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#fff' }} formatter={(v) => [v.toLocaleString(), 'Reviews']} />
          <Area type="monotone" dataKey="reviews" stroke="#a78bfa" strokeWidth={2} fill="url(#histFill)" dot={{ r: 4, strokeWidth: 2, fill: '#0b0b14' }} activeDot={{ r: 6 }} isAnimationActive animationDuration={1600} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
