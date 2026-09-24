import { Link } from 'react-router-dom';
import { ArrowRight, Linkedin, Users, Code2, PenTool, Target, Bot, LayoutDashboard } from 'lucide-react';
import Seo from '../../components/Seo';
import { SectionHeading, PageLoader } from '../../components/ui';
import { useSite } from '../../context/SiteContext';
import { useFetch } from '../../lib/utils';
import { PageHero, WhyGrid, ProcessSteps, CtaBand, PROCESS } from './shared';

export function About() {
  const { settings } = useSite();
  const fv = settings.marketplaces?.fiverr;
  return (
    <>
      <Seo title="About Zeviro" description="Zeviro is a web development, B2B lead generation and data services agency from Bangladesh, founded by a freelancer with 1,200+ completed projects on Fiverr." />
      <PageHero eyebrow="About Zeviro" title="From one freelancer to a dedicated agency team" text="We help businesses build their online presence, reach the right customers and keep their data in order — with the care of a small team and the range of a full agency." />
      <section className="container-x grid gap-12 py-16 lg:grid-cols-2">
        <div className="space-y-5 text-lg leading-relaxed text-slate-300">
          <p>Zeviro started in 2015, when our founder <span className="text-white">Md Ibrahim Hossain</span> began freelancing with data entry and web research. Clients kept coming back — and asking for more: lead lists for their sales teams, then websites, then complete web applications.</p>
          <p>Since joining Fiverr in 2019 we have completed <span className="text-white">{fv?.ordersCompleted || '1,200+'} projects</span> with a <span className="text-white">{fv?.rating || 4.8}★ average from {Number(fv?.reviews || 824).toLocaleString()} reviews</span>, earning Level 2 and Vetted Pro status. Zeviro is the next step: a proper agency with a project manager, developers and trained researchers, so we can take on bigger projects without losing the personal service our clients value.</p>
          <p>We work remotely from Bangladesh with clients in the USA, Europe, Canada, Australia and New Zealand. Every client gets a private portal to order services, follow progress, share files, message the team and pay invoices — and we write down how we work in clear <Link to="/policies" className="text-brand-300 underline">company policies</Link>.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 self-start">
          {(settings.stats || []).map((s) => (
            <div key={s.label} className="card p-6"><div className="font-display text-3xl font-semibold text-white">{s.value}</div><div className="mt-1 text-sm text-slate-500">{s.label}</div></div>
          ))}
        </div>
      </section>
      <section className="container-x pb-16">
        <SectionHeading eyebrow="What we believe" title="How we like to work" />
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ['Clarity before code', 'Scope, price and delivery date are agreed in writing before we start. No surprises.'],
            ['Accuracy over volume', 'A smaller, correct lead list or dataset beats a big messy one — every file is double-checked.'],
            ['Long-term relationships', 'Many of our clients have ordered from us again and again. We would rather earn the next order than rush this one.'],
          ].map(([t, d]) => <div key={t} className="card p-6"><h3 className="text-lg font-semibold">{t}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p></div>)}
        </div>
      </section>
      <section className="container-x py-16">
        <SectionHeading eyebrow="Explore" title="Get to know us" />
        <div className="grid gap-5 md:grid-cols-3">
          {[['Our Team', '/team', Users, 'The people behind the work'], ['Fiverr & Upwork', '/hire-us', Target, 'Our profiles, gigs & reviews'], ['How We Work', '/how-we-work', LayoutDashboard, 'Our delivery process, step by step']].map(([t, to, I, d]) => (
            <Link key={to} to={to} className="card card-hover p-6"><I className="h-6 w-6 text-brand-300" /><h3 className="mt-4 text-lg font-semibold">{t}</h3><p className="mt-1 text-sm text-slate-400">{d}</p><span className="mt-4 inline-flex items-center gap-1 text-sm text-brand-300">Read more <ArrowRight className="h-4 w-4" /></span></Link>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}

export function WhyZeviro() {
  return (
    <>
      <Seo title="Why Zeviro" description="Why clients choose Zeviro: a proven track record on Fiverr, online ordering with a client portal, and development plus data services under one roof." />
      <PageHero eyebrow="Why Zeviro" title="Why clients choose Zeviro" text="The reliability of a dedicated team with the range of a full agency." />
      <section className="container-x py-16"><WhyGrid /></section>
      <CtaBand />
    </>
  );
}

const DEPARTMENTS = [
  [Code2, 'Development', 'MERN and React Native developers building websites, web apps, portals and Android apps.'],
  [PenTool, 'Design', 'Website and landing page design in Figma, ready for development.'],
  [Target, 'Lead research', 'Researchers who build and verify B2B prospect lists around your ideal customer.'],
  [Bot, 'Data services', 'A trained data entry team for research, spreadsheets, CRM updates and product uploads.'],
];

export function Team() {
  const { data, loading } = useFetch('/public/content/team');
  return (
    <>
      <Seo title="Our Team" description="Meet the team behind Zeviro: development, project management, lead research and data services." />
      <PageHero eyebrow="Our Team" title="The people behind the work" text="A small, focused team — you always know who is working on your project." />
      <section className="container-x py-16">
        {loading ? <PageLoader /> : data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((m) => (
              <div key={m._id} className="card p-6 text-center">
                {m.image ? <img src={m.image} alt={m.title} loading="lazy" className="mx-auto h-24 w-24 rounded-full object-cover" /> : <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-gradient font-display text-2xl font-semibold text-snow">{m.title.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>}
                <h3 className="mt-4 font-semibold">{m.title}</h3>
                <p className="text-sm text-brand-300">{m.role}</p>
                {m.excerpt && <p className="mt-2 text-sm text-slate-400">{m.excerpt}</p>}
                {m.linkedin && <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-slate-400 hover:text-white" aria-label="LinkedIn"><Linkedin className="h-4 w-4" /></a>}
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-14">
          <SectionHeading eyebrow="Teams" title="How the work is split" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DEPARTMENTS.map(([I, t, d]) => (
              <div key={t} className="card p-6"><I className="h-6 w-6 text-brand-300" /><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-2 text-sm text-slate-400">{d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <CtaBand title="Want to work with us?" />
    </>
  );
}

export function HowWeWork() {
  return (
    <>
      <Seo title="How We Work" description="Brief, plan & price, design, build & research, quality check, delivery and support — how Zeviro delivers every project." />
      <PageHero eyebrow="How We Work" title="A clear process, from first call to long-term support" text="You always know what's happening, what's next and what it costs." />
      <section className="container-x py-16"><ProcessSteps /></section>
      <section className="container-x max-w-4xl space-y-6 pb-16">
        {PROCESS.map(({ t, d, I }, i) => (
          <div key={t} className="card flex gap-5 p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient font-display font-semibold text-snow">{i + 1}</span>
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold"><I className="h-4 w-4 text-brand-300" /> {t}</h3>
              <p className="mt-1 text-slate-400">{d} Progress, files and approvals for this step are visible in your client portal.</p>
            </div>
          </div>
        ))}
      </section>
      <CtaBand />
    </>
  );
}
