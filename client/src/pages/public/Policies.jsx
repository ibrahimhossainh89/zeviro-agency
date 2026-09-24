import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Printer } from 'lucide-react';
import Seo from '../../components/Seo';
import { PageLoader, Markdown, Icon } from '../../components/ui';
import { useFetch, fmtDate, cn } from '../../lib/utils';
import { useSite } from '../../context/SiteContext';
import { PageHero } from './shared';
import NotFound from './NotFound';

export function Policies() {
  const { data, loading } = useFetch('/public/content/policies');
  return (
    <>
      <Seo title="Company Policies" description="Zeviro's terms of service, privacy, refund, revision, payment, confidentiality, intellectual property, lead data compliance and cookie policies." />
      <PageHero eyebrow="Company policies" title="Clear rules, written down" text="How we work with clients, handle payments and refunds, protect your data and use B2B data responsibly." />
      <section className="container-x py-16">
        {loading ? <PageLoader /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(data || []).map((p) => (
              <Link key={p._id} to={`/policies/${p.slug}`} className="card card-hover group flex flex-col p-6">
                <span className="inline-flex w-fit rounded-xl border border-brand-500/30 bg-brand-500/10 p-2.5 text-brand-300"><Icon name={p.icon} fallback="ShieldCheck" /></span>
                <h2 className="mt-4 text-lg font-semibold">{p.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{p.excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-300">Read policy <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        )}
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-slate-500">Questions about any policy? Email us or <Link to="/contact" className="text-brand-300 underline">send a message</Link> — we're happy to explain.</p>
      </section>
    </>
  );
}

export function PolicyDetail() {
  const { slug } = useParams();
  const { nav } = useSite();
  const { data: p, loading, error } = useFetch(`/public/content/policies/${slug}`);
  if (loading) return <PageLoader />;
  if (error || !p) return <NotFound />;
  const all = nav.policies || [];
  return (
    <>
      <Seo title={p.seo?.metaTitle || p.title} description={p.seo?.metaDescription || p.excerpt} type="article" />
      <section className="container-x grid gap-10 py-14 lg:grid-cols-[260px_1fr]">
        <aside className="no-print hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <Link to="/policies" className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> All policies</Link>
            {all.map((x) => (
              <Link key={x.slug} to={`/policies/${x.slug}`} className={cn('block rounded-lg px-3 py-2 text-sm transition', x.slug === slug ? 'bg-brand-500/15 font-medium text-white' : 'text-slate-400 hover:bg-ink-800 hover:text-white')}>
                {x.title}
              </Link>
            ))}
          </nav>
        </aside>
        <article className="min-w-0 max-w-3xl">
          <Link to="/policies" className="no-print mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white lg:hidden"><ArrowLeft className="h-4 w-4" /> All policies</Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">{p.title}</h1>
              <p className="mt-2 text-sm text-slate-500">Effective {fmtDate(p.effectiveDate || p.updatedAt)} · Last updated {fmtDate(p.updatedAt)}</p>
            </div>
            <button onClick={() => window.print()} className="no-print btn-ghost btn-sm"><Printer className="h-4 w-4" /> Print / PDF</button>
          </div>
          {p.excerpt && <p className="mt-6 rounded-xl border border-ink-600/60 bg-ink-800/50 p-4 text-slate-300">{p.excerpt}</p>}
          <div className="mt-8"><Markdown text={p.body} /></div>
        </article>
      </section>
    </>
  );
}
