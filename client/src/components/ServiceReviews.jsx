import { BadgeCheck } from 'lucide-react';
import { useLiveFetch } from '../context/SiteContext';
import { useInView } from '../lib/anim';
import { CountUp } from './LiveStats';
import { StarRow, RATING_KEYS } from './Stars';
import { SectionHeading } from './ui';
import { fmtDate } from '../lib/utils';

/** Published client reviews for one service (updates live when the team publishes a review). */
export default function ServiceReviews({ slug }) {
  const { data } = useLiveFetch('/public/reviews', { service: slug });
  const [ref, inView] = useInView({ threshold: 0.2 });
  if (!data?.count) return null;
  return (
    <section ref={ref} id="reviews" className="container-x scroll-mt-24 pb-16">
      <SectionHeading eyebrow="Client reviews" title="What clients say about this service" text="Verified reviews from completed orders." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="card h-fit space-y-5 p-6 lg:sticky lg:top-24">
          <div className="text-center">
            <p className="font-display text-6xl font-bold text-white"><CountUp value={data.overall} decimals={1} start={inView} /></p>
            <div className="mt-2 flex justify-center"><StarRow value={data.overall} className="h-5 w-5" /></div>
            <p className="mt-1 text-sm text-slate-400">{data.count} review{data.count === 1 ? '' : 's'}</p>
          </div>
          <div className="space-y-3">
            {RATING_KEYS.map(([k, label], i) => (
              <div key={k}>
                <div className="flex justify-between text-sm"><span className="text-slate-300">{label}</span><span className="font-medium text-white">{data[k].toFixed(1)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-fuchsia-500 transition-[width] duration-[1400ms] ease-out" style={{ width: inView ? `${(data[k] / 5) * 100}%` : '0%', transitionDelay: `${i * 150}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-4">
          {data.items.map((r) => (
            <figure key={r._id} className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-snow">{r.reviewerName?.slice(0, 1)}</span>
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-white">{r.reviewerName} <BadgeCheck className="h-4 w-4 text-emerald-400" aria-label="Verified order" /></p>
                    <p className="text-xs text-slate-500">{[r.country, r.packageName && `${r.packageName} package`, fmtDate(r.createdAt)].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2"><StarRow value={r.overall} /><span className="text-sm font-semibold text-white">{r.overall.toFixed(1)}</span></div>
              </div>
              <blockquote className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-300">“{r.body}”</blockquote>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-ink-600/60 pt-3 text-xs text-slate-500">
                {RATING_KEYS.map(([k, l]) => <span key={k} className="flex items-center gap-1.5">{l} <StarRow value={r.ratings[k]} className="h-3 w-3" /></span>)}
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
