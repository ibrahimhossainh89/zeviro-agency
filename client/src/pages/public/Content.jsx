import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Search } from 'lucide-react';
import Seo from '../../components/Seo';
import LeadForm from '../../components/LeadForm';
import { PageLoader, Empty, Markdown, SectionHeading } from '../../components/ui';
import { useFetch, fmtDate, cn } from '../../lib/utils';
import { ItemCard, CaseCard, FaqList, CtaBand, PageHero, ProcessSteps } from './shared';
import NotFound from './NotFound';
import Packages, { PackageTable } from '../../components/Packages';
import ServiceReviews from '../../components/ServiceReviews';
import { ExternalLink } from 'lucide-react';

const META = {
  services: { eyebrow: 'Services', title: 'Services with clear packages', text: 'Web development, apps, design, marketing, B2B leads and data entry — order a package online or ask for a custom quote.', base: '/services' },
  solutions: { eyebrow: 'Solutions', title: 'Solutions built around your goal', text: 'Our services combined into complete outcomes — from launching a website to keeping your sales pipeline full.', base: '/solutions' },
  industries: { eyebrow: 'Industries', title: 'Industries we work with', text: 'The sectors where our websites, lead lists and data services make the biggest difference.', base: '/industries' },
};

export function Collection({ type }) {
  const m = META[type];
  const { data, loading } = useFetch(`/public/content/${type}`);
  return (
    <>
      <Seo title={m.eyebrow} description={m.text} />
      <PageHero eyebrow={m.eyebrow} title={m.title} text={m.text} />
      <section className="container-x py-16">
        {loading ? <PageLoader /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.map((s) => <ItemCard key={s._id} item={s} to={`${m.base}/${s.slug}`} showImage={type === 'services'} cta={type === 'services' ? 'View packages' : 'Learn more'} />)}
          </div>
        )}
      </section>
      <CtaBand />
    </>
  );
}

export function Detail({ type }) {
  const { slug } = useParams();
  const m = META[type];
  const { data: item, loading, error } = useFetch(`/public/content/${type}/${slug}`);
  const related = useFetch('/public/content/case-studies', type === 'services' && item ? { service: item.title } : type === 'industries' && item ? { industry: item.title } : undefined, { skip: !item || type === 'solutions' });
  const faqs = useFetch('/public/content/faqs', { limit: 5 });
  if (loading) return <PageLoader />;
  if (error || !item) return <NotFound />;
  const list = item.features?.length ? item.features : item.challenges || [];
  const hasPackages = type === 'services' && item.orderable !== false && item.packages?.length > 0;

  return (
    <>
      <Seo title={item.seo?.metaTitle || item.title} description={item.seo?.metaDescription || item.excerpt} schema={type === 'services' ? { '@context': 'https://schema.org', '@type': 'Service', name: item.title, description: item.excerpt, provider: { '@type': 'Organization', name: 'Zeviro' } } : undefined} />
      <PageHero eyebrow={m.eyebrow} title={item.title} text={item.excerpt}>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {hasPackages ? <a href="#packages" className="btn-primary">See packages & order <ArrowRight className="h-4 w-4" /></a> : <Link to="/book-a-call" className="btn-primary">Book a Discovery Call <ArrowRight className="h-4 w-4" /></Link>}
          <a href="#quote" className="btn-ghost">Get a custom quote</a>
        </div>
      </PageHero>

      <section className="container-x grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Link to={m.base} className="mb-6 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> All {m.eyebrow.toLowerCase()}</Link>
          {item.image && <img src={item.image} alt={item.title} className="mb-8 w-full rounded-2xl border border-ink-600/60" loading="lazy" />}
          <Markdown text={item.body || item.excerpt} />
          {item.audience && <p className="mt-4 text-sm text-slate-400"><span className="text-slate-200">Best for:</span> {item.audience}</p>}
          {item.deliverables?.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-2xl font-semibold">What you receive</h2>
              <ul className="grid gap-3 sm:grid-cols-2">{item.deliverables.map((d) => <li key={d} className="flex gap-2 rounded-xl border border-ink-600/60 bg-ink-800/40 p-3 text-sm text-slate-300"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />{d}</li>)}</ul>
            </div>
          )}
        </div>
        <aside id="packages" className="scroll-mt-24 space-y-6">
          {hasPackages && <Packages service={item} />}
          {item.marketplaceUrl && (
            <a href={item.marketplaceUrl} target="_blank" rel="noopener noreferrer" className="card flex items-center justify-between gap-3 p-4 text-sm text-slate-300 hover:text-white">
              <span>Prefer to order through <b className="text-white">Fiverr</b>? This service is also available there.</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          )}
          {list.length > 0 && (
            <div className="card p-6">
              <h3 className="mb-4 font-semibold">{type === 'industries' ? 'Challenges we solve' : "What's included"}</h3>
              <ul className="space-y-3">
                {list.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-300"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />{f}</li>)}
              </ul>
            </div>
          )}
          {item.technologies?.length > 0 && (
            <div className="card p-6">
              <h3 className="mb-4 font-semibold">Technologies</h3>
              <div className="flex flex-wrap gap-2">{item.technologies.map((t) => <span key={t} className="rounded-lg bg-ink-700 px-3 py-1 font-mono text-xs text-slate-300">{t}</span>)}</div>
            </div>
          )}
        </aside>
      </section>

      {hasPackages && item.packages.length > 1 && (
        <section className="container-x pb-16">
          <SectionHeading eyebrow="Compare" title="Compare packages" text={item.hourlyRate ? `Ongoing or flexible work is also available at $${item.hourlyRate}/hour.` : undefined} />
          <PackageTable service={item} />
        </section>
      )}

      {type === 'services' && <ServiceReviews slug={item.slug} />}

      <section className="container-x pb-16">
        <SectionHeading eyebrow="Process" title="How we deliver" />
        <ProcessSteps />
      </section>

      {related.data?.length > 0 && (
        <section className="container-x pb-16">
          <SectionHeading eyebrow="Portfolio" title="Related work" />
          <div className="grid gap-5 md:grid-cols-3">{related.data.slice(0, 3).map((c) => <CaseCard key={c._id} c={c} />)}</div>
        </section>
      )}

      <section id="quote" className="container-x grid scroll-mt-24 gap-10 pb-8 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <SectionHeading eyebrow="Get a quote" title={`Let's talk about ${item.title.toLowerCase()}`} center={false} text="Share a few details and we'll reply with next steps within one business day." />
          {faqs.data?.length > 0 && <FaqList faqs={faqs.data} />}
        </div>
        <LeadForm defaultService={type === 'services' ? item.title : ''} />
      </section>
    </>
  );
}

export function CaseStudies() {
  const { data, loading } = useFetch('/public/content/case-studies');
  const [service, setService] = useState('');
  const [industry, setIndustry] = useState('');
  const services = useMemo(() => [...new Set((data || []).map((c) => c.service).filter(Boolean))], [data]);
  const industries = useMemo(() => [...new Set((data || []).map((c) => c.industry).filter(Boolean))], [data]);
  const list = (data || []).filter((c) => (!service || c.service === service) && (!industry || c.industry === industry));
  const Chip = ({ v, cur, set }) => (
    <button onClick={() => set(cur === v ? '' : v)} className={cn('rounded-full border px-3.5 py-1.5 text-xs transition', cur === v ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:text-white')}>{v}</button>
  );
  return (
    <>
      <Seo title="Portfolio" description="Real projects delivered by Zeviro: websites, React web apps, B2B lead lists and data entry work for clients in the USA, Europe and Australia." />
      <PageHero eyebrow="Portfolio" title="Real work for real clients" text="A selection of websites, lead-generation and data projects we have delivered — many of them through Fiverr." />
      <section className="container-x py-12">
        <div className="mb-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xs uppercase tracking-wide text-slate-500">Service</span>{services.map((s) => <Chip key={s} v={s} cur={service} set={setService} />)}</div>
          {industries.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="mr-2 text-xs uppercase tracking-wide text-slate-500">Industry</span>{industries.map((s) => <Chip key={s} v={s} cur={industry} set={setIndustry} />)}</div>}
        </div>
        {loading ? <PageLoader /> : list.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CaseCard key={c._id} c={c} />)}</div> : <Empty title="No projects match these filters" />}
      </section>
      <CtaBand />
    </>
  );
}

export function CaseStudyDetail() {
  const { slug } = useParams();
  const { data: c, loading, error } = useFetch(`/public/content/case-studies/${slug}`);
  if (loading) return <PageLoader />;
  if (error || !c) return <NotFound />;
  return (
    <>
      <Seo title={c.seo?.metaTitle || c.title} description={c.seo?.metaDescription || c.excerpt} type="article" />
      <PageHero eyebrow={`${c.service || 'Project'}${c.industry ? ` · ${c.industry}` : ''}`} title={c.title} text={c.clientName} />
      <section className="container-x grid gap-10 py-16 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          {[c.image, ...(c.gallery || [])].filter(Boolean).length > 0 && (
            <div className="grid gap-4">
              {[c.image, ...(c.gallery || [])].filter(Boolean).map((src) => (
                <img key={src} src={src} alt={c.title} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full rounded-2xl border border-ink-600/60 bg-ink-800 object-contain" />
              ))}
            </div>
          )}
          {c.challenge && <div><h2 className="mb-3 text-2xl font-semibold">The challenge</h2><p className="leading-relaxed text-slate-300">{c.challenge}</p></div>}
          {c.solution && <div><h2 className="mb-3 text-2xl font-semibold">Our solution</h2><p className="leading-relaxed text-slate-300">{c.solution}</p></div>}
          {c.body && c.body !== `${c.challenge}\n\n${c.solution}` && <Markdown text={c.body} />}
        </div>
        <aside className="space-y-6">
          {c.results?.length > 0 && (
            <div className="card p-6"><h3 className="mb-4 font-semibold">Results</h3><ul className="space-y-3">{c.results.map((r) => <li key={r} className="flex gap-2 text-sm"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />{r}</li>)}</ul></div>
          )}
          {c.technologies?.length > 0 && (
            <div className="card p-6"><h3 className="mb-4 font-semibold">Stack</h3><div className="flex flex-wrap gap-2">{c.technologies.map((t) => <span key={t} className="rounded-lg bg-ink-700 px-3 py-1 font-mono text-xs">{t}</span>)}</div></div>
          )}
          {(c.platform || c.year || c.clientName) && (
            <div className="card space-y-2 p-6 text-sm">
              {c.clientName && <p><span className="text-slate-500">Client:</span> <span className="text-slate-200">{c.clientName}</span></p>}
              {c.platform && <p><span className="text-slate-500">Delivered via:</span> <span className="text-slate-200">{c.platform}</span></p>}
              {c.year && <p><span className="text-slate-500">Year:</span> <span className="text-slate-200">{c.year}</span></p>}
            </div>
          )}
          {c.externalUrl && <a href={c.externalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">View project <ExternalLink className="h-4 w-4" /></a>}
          <Link to="/portfolio" className="btn-ghost w-full"><ArrowLeft className="h-4 w-4" /> Back to portfolio</Link>
        </aside>
      </section>
      <CtaBand title="Want something similar?" />
    </>
  );
}

export function Resources() {
  const [params, setParams] = useSearchParams();
  const type = params.get('type') || '';
  const [q, setQ] = useState('');
  const { data, loading } = useFetch('/public/content/blog', type ? { type } : undefined);
  const list = (data || []).filter((p) => !q || `${p.title} ${p.excerpt}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Seo title="Resources — Blog, Guides & Insights" description="Practical guides on data entry briefs, B2B lead lists, choosing a website platform and local SEO — from the Zeviro team." />
      <PageHero eyebrow="Resources" title="Blog, guides & insights" text="Practical, no-fluff advice from the work we do every day." />
      <section className="container-x py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row">
          <div className="flex flex-wrap gap-2">
            {['', 'Blog', 'Guide', 'Insight'].map((t) => (
              <button key={t} onClick={() => setParams(t ? { type: t } : {})} className={cn('rounded-full border px-4 py-1.5 text-sm', type === t ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:text-white')}>{t ? `${t}s` : 'All'}</button>
            ))}
            <Link to="/faq" className="rounded-full border border-ink-600 px-4 py-1.5 text-sm text-slate-400 hover:text-white">FAQs</Link>
          </div>
          <div className="relative sm:w-72"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input className="input pl-9" placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <PageLoader /> : list.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <Link key={p._id} to={`/resources/${p.slug}`} className="card card-hover group flex flex-col overflow-hidden">
                {p.image && <div className="aspect-[1200/630] overflow-hidden border-b border-ink-600/60 bg-ink-800"><img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2 text-xs"><span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-brand-300">{p.type}</span><span className="text-slate-500">{p.category}</span></div>
                  <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-slate-400">{p.excerpt}</p>
                  <div className="mt-5 flex items-center gap-3 text-xs text-slate-500"><span>{fmtDate(p.publishedAt)}</span>{p.readMinutes && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{p.readMinutes} min read</span>}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : <Empty title="No articles yet" />}
      </section>
    </>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { data: p, loading, error } = useFetch(`/public/content/blog/${slug}`);
  if (loading) return <PageLoader />;
  if (error || !p) return <NotFound />;
  return (
    <>
      <Seo title={p.seo?.metaTitle || p.title} description={p.seo?.metaDescription || p.excerpt} type="article" schema={{ '@context': 'https://schema.org', '@type': 'Article', headline: p.title, datePublished: p.publishedAt, author: { '@type': 'Organization', name: p.author || 'Zeviro' } }} />
      <article className="container-x max-w-3xl py-16">
        <Link to="/resources" className="mb-8 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> All resources</Link>
        <div className="flex items-center gap-2 text-xs"><span className="rounded-full bg-brand-500/15 px-2.5 py-1 text-brand-300">{p.type}</span><span className="text-slate-500">{p.category}</span></div>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">{p.title}</h1>
        <p className="mt-4 text-sm text-slate-500">{p.author} · {fmtDate(p.publishedAt)}{p.readMinutes ? ` · ${p.readMinutes} min read` : ''}</p>
        {p.image && <img src={p.image} alt="" loading="lazy" className="mt-8 rounded-2xl" />}
        <div className="mt-10"><Markdown text={p.body} /></div>
      </article>
      <CtaBand />
    </>
  );
}

export function Faq() {
  const { data, loading } = useFetch('/public/content/faqs');
  const schema = data && { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: data.map((f) => ({ '@type': 'Question', name: f.title, acceptedAnswer: { '@type': 'Answer', text: f.body } })) };
  return (
    <>
      <Seo title="FAQ" description="Answers to common questions about working with Zeviro." schema={schema} />
      <PageHero eyebrow="FAQ" title="Frequently asked questions" text="Everything you need to know about working with us." />
      <section className="container-x max-w-3xl py-16">{loading ? <PageLoader /> : <FaqList faqs={data || []} />}</section>
      <CtaBand title="Still have questions?" text="Chat with our assistant or book a quick call with the team." />
    </>
  );
}

