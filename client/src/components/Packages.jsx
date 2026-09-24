import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, RefreshCcw, MessageSquareQuote } from 'lucide-react';
import { cn, fmtMoney, track } from '../lib/utils';

export const priceLabel = (p) => (p?.price ? fmtMoney(p.price) : 'On request');

/** Fiverr-style package picker used on service pages. */
export default function Packages({ service }) {
  const pkgs = service?.packages || [];
  const [active, setActive] = useState(() => Math.max(0, pkgs.findIndex((p) => p.popular)));
  if (!pkgs.length || service.orderable === false) return null;
  const p = pkgs[active] || pkgs[0];
  return (
    <div className="card overflow-hidden">
      <div className="grid border-b border-ink-600/60" style={{ gridTemplateColumns: `repeat(${pkgs.length}, minmax(0, 1fr))` }}>
        {pkgs.map((x, i) => (
          <button
            key={x.name}
            onClick={() => setActive(i)}
            className={cn('relative px-3 py-3.5 text-sm font-semibold transition', i === active ? 'bg-brand-500/10 text-white' : 'text-slate-400 hover:text-white')}
            aria-pressed={i === active}
          >
            {x.name}
            {i === active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-gradient" />}
          </button>
        ))}
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white">{p.title || p.name}</h3>
            {p.popular && <span className="mt-1 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">Most popular</span>}
          </div>
          <p className="font-display text-2xl font-semibold text-white">{p.price ? fmtMoney(p.price) : <span className="text-sm font-medium text-brand-300">Price on request</span>}</p>
        </div>
        {p.description && <p className="mt-3 text-sm leading-relaxed text-slate-400">{p.description}</p>}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-300">
          {p.deliveryDays ? <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand-300" /> {p.deliveryDays}-day delivery</span> : null}
          {p.revisions ? <span className="flex items-center gap-1.5"><RefreshCcw className="h-4 w-4 text-brand-300" /> {p.revisions} revision{p.revisions === '1' ? '' : 's'}</span> : null}
        </div>
        {p.features?.length > 0 && (
          <ul className="mt-5 space-y-2.5">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2 text-sm text-slate-300"><CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-emerald-400" />{f}</li>
            ))}
          </ul>
        )}
        <Link
          to={`/order/${service.slug}?package=${encodeURIComponent(p.name)}`}
          className="btn-primary mt-6 w-full py-3"
          onClick={() => track('cta_click', { cta: 'order_package', service: service.title, package: p.name })}
        >
          {p.price ? <>Continue ({fmtMoney(p.price)})</> : <>Request price</>} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to={`/contact?service=${encodeURIComponent(service.title)}`} className="mt-3 flex items-center justify-center gap-1.5 text-sm text-slate-400 hover:text-white">
          <MessageSquareQuote className="h-4 w-4" /> Need something custom? Send us a message
        </Link>
        {service.pricingNote && <p className="mt-4 border-t border-ink-600/60 pt-4 text-xs leading-relaxed text-slate-500">{service.pricingNote}</p>}
      </div>
    </div>
  );
}

/** Side-by-side comparison table (desktop) */
export function PackageTable({ service }) {
  const pkgs = service?.packages || [];
  if (pkgs.length < 2) return null;
  const all = [...new Set(pkgs.flatMap((p) => p.features || []))];
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink-600/60 text-left">
            <th className="p-4 font-medium text-slate-400">Package</th>
            {pkgs.map((p) => (
              <th key={p.name} className="p-4">
                <p className="font-semibold text-white">{p.name}</p>
                <p className="text-xs font-normal text-slate-500">{p.title}</p>
                <p className="mt-1 font-display text-lg text-white">{priceLabel(p)}</p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-700/60">
          {all.map((f) => (
            <tr key={f}>
              <td className="p-4 text-slate-300">{f}</td>
              {pkgs.map((p) => <td key={p.name} className="p-4">{p.features?.includes(f) ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <span className="text-slate-600">—</span>}</td>)}
            </tr>
          ))}
          <tr>
            <td className="p-4 text-slate-300">Delivery time</td>
            {pkgs.map((p) => <td key={p.name} className="p-4 text-slate-200">{p.deliveryDays ? `${p.deliveryDays} days` : 'Agreed with you'}</td>)}
          </tr>
          <tr>
            <td className="p-4 text-slate-300">Revisions</td>
            {pkgs.map((p) => <td key={p.name} className="p-4 text-slate-200">{p.revisions || '—'}</td>)}
          </tr>
          <tr>
            <td className="p-4" />
            {pkgs.map((p) => (
              <td key={p.name} className="p-4">
                <Link to={`/order/${service.slug}?package=${encodeURIComponent(p.name)}`} className="btn-primary btn-sm">Select</Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
