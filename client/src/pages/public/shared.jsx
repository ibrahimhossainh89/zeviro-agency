import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Search, Compass, PenTool, Code2, ShieldCheck, Rocket, LifeBuoy } from 'lucide-react';
import { Icon } from '../../components/ui';
import { cn } from '../../lib/utils';

export const PROCESS = [
  { t: 'Brief', d: 'You choose a package or tell us what you need — goals, examples, files and deadline.', I: Search },
  { t: 'Plan & price', d: 'We confirm the scope, delivery date and price in writing before any work starts.', I: Compass },
  { t: 'Design', d: 'For websites and apps: layouts you approve first. For data: a sample batch to confirm the format.', I: PenTool },
  { t: 'Build & research', d: 'Our developers and researchers do the work, with updates in your client portal.', I: Code2 },
  { t: 'Quality check', d: 'A second person checks every delivery — code, pages, rows and emails — before it reaches you.', I: ShieldCheck },
  { t: 'Delivery', d: 'You receive the files or the live site, review it and request revisions if needed.', I: Rocket },
  { t: 'Support', d: '30-day bug fixes for code, free replacement of bounced leads, and help whenever you need more.', I: LifeBuoy },
];

export const WHY = [
  { icon: 'Award', t: 'Proven track record', d: '1,200+ completed projects on Fiverr since 2019 with a 4.8★ average from 824 reviews — and freelancing since 2015.' },
  { icon: 'ShoppingBag', t: 'Order online, track everything', d: 'Pick a package, pay the invoice and follow your order, files and messages in a private client portal or our Android app.' },
  { icon: 'Layers', t: 'Development + data under one roof', d: 'The same team builds your website, researches your leads and handles your data work — one partner, one conversation.' },
  { icon: 'Zap', t: 'Fast, direct communication', d: 'You talk to the people doing the work. Our average response time on Fiverr is about one hour.' },
  { icon: 'ShieldCheck', t: 'Confidential & compliant', d: 'NDA on request, role-based access to your data, and written policies for privacy, refunds and B2B data use.' },
  { icon: 'Lock', t: 'You own everything', d: 'Code, designs and data are yours once the order is paid. No lock-in and no hidden fees.' },
];

export function ProcessSteps() {
  return (
    <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
      {PROCESS.map(({ t, d, I }, i) => (
        <div key={t} className="card relative p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-2 text-brand-300"><I className="h-4 w-4" /></span>
            <span className="font-mono text-xs text-slate-600">0{i + 1}</span>
          </div>
          <h3 className="text-base font-semibold">{t}</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{d}</p>
        </div>
      ))}
    </div>
  );
}

export function WhyGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {WHY.map((w) => (
        <div key={w.t} className="card card-hover p-6">
          <span className="inline-flex rounded-xl border border-brand-500/30 bg-brand-500/10 p-2.5 text-brand-300"><Icon name={w.icon} /></span>
          <h3 className="mt-4 text-lg font-semibold">{w.t}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{w.d}</p>
        </div>
      ))}
    </div>
  );
}

export function startingPrice(item) {
  const prices = (item?.packages || []).map((p) => p.price).filter((n) => n > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function ItemCard({ item, to, cta = 'Learn more', showImage }) {
  const from = startingPrice(item);
  return (
    <Link to={to} className="card card-hover group flex flex-col overflow-hidden">
      {showImage && item.image && (
        <div className="aspect-[1200/630] overflow-hidden border-b border-ink-600/60 bg-ink-800">
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-flex w-fit rounded-xl border border-brand-500/30 bg-brand-500/10 p-2.5 text-brand-300"><Icon name={item.icon} /></span>
          {from ? <span className="rounded-full bg-ink-700 px-3 py-1 text-xs text-slate-300">From <b className="text-white">${from}</b></span> : null}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{item.excerpt}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-300">
          {cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export function CaseCard({ c }) {
  return (
    <Link to={`/portfolio/${c.slug}`} className="card card-hover group flex flex-col overflow-hidden">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-700">
        {c.image ? (
          <img src={c.image} alt={c.title} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-fuchsia-500/20">
            <span className="font-display text-2xl font-semibold text-white/80">{c.service}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap gap-2 text-xs">
          {c.platform && <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-400">{c.platform}</span>}
          {c.industry && <span className="rounded-full bg-ink-700 px-2.5 py-1 text-slate-300">{c.industry}</span>}
          {c.service && <span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-brand-300">{c.service}</span>}
        </div>
        <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
        <p className="mt-2 flex-1 text-sm text-slate-400">{c.excerpt}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-300">View project <ArrowRight className="h-4 w-4" /></span>
      </div>
    </Link>
  );
}

export function FaqList({ faqs = [] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <div key={f._id || i} className="card overflow-hidden">
          <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
            <span className="font-medium text-white">{f.title}</span>
            <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition', open === i && 'rotate-180')} />
          </button>
          {open === i && <p className="animate-fadeUp px-5 pb-5 text-sm leading-relaxed text-slate-400">{f.body}</p>}
        </div>
      ))}
    </div>
  );
}

export function CtaBand({ title = 'Ready to build something great?', text = 'Book a free discovery call and get a clear plan, timeline and quote.' }) {
  return (
    <section className="container-x">
      <div className="relative overflow-hidden rounded-3xl border border-brand-500/30 bg-ink-850 px-6 py-14 text-center sm:px-12">
        <div className="glow-orb pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-indigo-600" />
        <div className="glow-orb pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-fuchsia-600" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">{text}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/book-a-call" className="btn-primary">Book a Discovery Call <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contact" className="btn-ghost">Send us a brief</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageHero({ eyebrow, title, text, children }) {
  return (
    <section className="relative overflow-hidden border-b border-ink-600/50">
      <div className="bg-grid-fade pointer-events-none absolute inset-0" />
      <div className="glow-orb pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-violet-700/60" />
      <div className="container-x relative py-20 text-center sm:py-24">
        {eyebrow && <span className="eyebrow mb-5">{eyebrow}</span>}
        <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
        {text && <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">{text}</p>}
        {children}
      </div>
    </section>
  );
}
