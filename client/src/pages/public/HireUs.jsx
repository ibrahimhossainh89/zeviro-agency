import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, MessagesSquare } from 'lucide-react';
import Seo from '../../components/Seo';
import { SectionHeading, PageLoader } from '../../components/ui';
import { useSite } from '../../context/SiteContext';
import { GigCard, ReviewCard } from '../../components/Marketplace';
import LiveStats from '../../components/LiveStats';
import { useLiveFetch } from '../../context/SiteContext';
import { PageHero, CtaBand } from './shared';

export default function HireUs() {
  const { settings } = useSite();
  const gigs = useLiveFetch('/public/content/gigs');
  const reviews = useLiveFetch('/public/content/testimonials');
  const f = settings.marketplaces?.fiverr;
  return (
    <>
      <Seo title="Hire us on Fiverr & Upwork" description={`Zeviro on Fiverr (@${f?.username || 'riyanh89'}) and Upwork: ${f?.ordersCompleted || '1,200+'} projects completed, ${f?.rating || '4.8'}★ from ${f?.reviews || 824} reviews. See our gigs and real client reviews.`} />
      <PageHero eyebrow="Fiverr & Upwork" title="Trusted on the world's biggest freelance marketplaces" text="Prefer to hire through a marketplace? Order our gigs on Fiverr or work with us on Upwork — or order directly on this website. Same team, same quality." />

      <section className="container-x py-16">
        <LiveStats />
      </section>

      <section className="container-x pb-20">
        <SectionHeading eyebrow="Our gigs" title="Order on Fiverr" text="Our live Fiverr gigs — click any gig to see full details, packages and reviews on Fiverr." />
        {gigs.loading ? <PageLoader /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{(gigs.data || []).map((g) => <GigCard key={g._id} g={g} />)}</div>
        )}
      </section>

      <section id="reviews" className="scroll-mt-24 border-y border-ink-600/50 bg-ink-900/40 py-20">
        <div className="container-x">
          <SectionHeading eyebrow="Reviews" title="What buyers say about our work" text="Real reviews left by clients on Fiverr, shown exactly as written." />
          {reviews.loading ? <PageLoader /> : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{(reviews.data || []).map((r) => <ReviewCard key={r._id} r={r} />)}</div>
          )}
          {f?.url && <div className="mt-10 text-center"><a href={f.url} target="_blank" rel="noopener noreferrer" className="btn-ghost">Read all {Number(f.reviews || 0).toLocaleString()} reviews on Fiverr <ArrowRight className="h-4 w-4" /></a></div>}
        </div>
      </section>

      <section className="container-x py-20">
        <SectionHeading eyebrow="Direct or marketplace?" title="Ordering directly on zeviro.agency" text="Both work. Ordering here gives you a few extras." />
        <div className="grid gap-5 md:grid-cols-3">
          {[
            [MessagesSquare, 'Your own client portal', 'Orders, real-time messages, files, invoices and project progress in one place — plus our Android app.'],
            [Zap, 'Custom scopes & ongoing work', 'Milestone projects, monthly retainers and dedicated data teams that don\'t fit a single gig.'],
            [ShieldCheck, 'Clear policies', 'Written refund, revision, confidentiality and data-compliance policies you can read before you order.'],
          ].map(([I, t, d]) => (
            <div key={t} className="card p-6"><I className="h-6 w-6 text-brand-300" /><h3 className="mt-4 text-lg font-semibold">{t}</h3><p className="mt-2 text-sm text-slate-400">{d}</p></div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/services" className="btn-primary">Browse services & packages <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/signup" className="btn-ghost">Create a free account</Link>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500">If you first found us on Fiverr or Upwork, please keep ordering through that platform so both of us stay within its terms of service.</p>
      </section>
      <CtaBand />
    </>
  );
}
