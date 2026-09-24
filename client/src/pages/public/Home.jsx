import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Bot, Headphones, MessageCircle, Sparkles, ShoppingBag, UserPlus, CreditCard, PackageCheck, Star, BadgeCheck } from 'lucide-react';
import Seo from '../../components/Seo';
import { SectionHeading, Icon } from '../../components/ui';
import { useSite } from '../../context/SiteContext';
import { useFetch, track } from '../../lib/utils';
import { ProcessSteps, WhyGrid, ItemCard, CaseCard, FaqList, CtaBand } from './shared';
import { ReviewCard, PlatformBadge, Stars } from '../../components/Marketplace';
import LiveStats, { CountUp } from '../../components/LiveStats';
import { useLiveFetch } from '../../context/SiteContext';

function HeroVisual({ review }) {
  return (
    <div className="relative mx-auto w-full max-w-md animate-float lg:max-w-none">
      <div className="card relative overflow-hidden bg-ink-850/90 p-5 shadow-2xl">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs text-slate-500">zeviro.agency · client portal</span>
        </div>
        <div className="rounded-xl border border-ink-600 bg-ink-800 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-500">Your order</span>
            <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-brand-300">In progress</span>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">B2B Lead Generation — Growth list</p>
          <p className="text-xs text-slate-500">500 verified leads · 4-day delivery</p>
          <div className="mt-3 h-2 rounded-full bg-ink-700"><div className="h-2 w-[64%] rounded-full bg-brand-gradient" /></div>
          <div className="mt-4 space-y-2">
            {['Order placed & paid', 'Target list confirmed', 'Research & email verification'].map((t, i) => (
              <div key={t} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className={i < 2 ? 'h-4 w-4 text-emerald-400' : 'h-4 w-4 text-slate-600'} /> {t}
              </div>
            ))}
          </div>
        </div>
        {review && (
          <div className="mt-4 rounded-xl border border-ink-600 bg-ink-800 p-4">
            <div className="flex items-center justify-between"><Stars value={5} className="h-3.5 w-3.5" /><PlatformBadge platform="Fiverr" /></div>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-300">“{review.body}”</p>
            <p className="mt-2 text-[11px] text-slate-500">— {review.title}, {review.country}</p>
          </div>
        )}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 p-3">
          <Bot className="mt-0.5 h-4 w-4 text-brand-300" />
          <p className="text-xs text-slate-300">New message from your project manager: <span className="text-white">“First 200 leads are ready for review.”</span></p>
        </div>
      </div>
      <div className="glow-orb absolute -inset-10 -z-10 rounded-full bg-violet-700/50" />
    </div>
  );
}

const ORDER_STEPS = [
  [ShoppingBag, 'Choose a package', 'Pick a service and a Basic, Standard or Premium package — prices and delivery times are shown upfront.'],
  [UserPlus, 'Share your requirements', 'Create a free account and describe what you need. Add links or files in your portal.'],
  [CreditCard, 'Pay the invoice', 'Pay securely by bank transfer, Payoneer, Wise or card link. Work starts right after.'],
  [PackageCheck, 'Review & approve', 'Track progress, chat with the team, then accept the delivery or ask for a revision.'],
];

export default function Home() {
  const { settings, nav } = useSite();
  const cases = useLiveFetch('/public/content/case-studies', { featured: true, limit: 3 });
  const faqs = useFetch('/public/content/faqs', { limit: 6 });
  const reviews = useLiveFetch('/public/content/testimonials', { limit: 6 });
  const stats = settings.stats || [];
  const tech = settings.techStack || [];
  const fv = settings.marketplaces?.fiverr;

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Zeviro',
    url: 'https://zeviro.agency',
    logo: 'https://zeviro.agency/brand/zeviro-icon-512.png',
    email: settings.contactEmail,
    description: 'Web development, B2B lead generation and data entry agency.',
    sameAs: [...Object.values(settings.socials || {}), fv?.url, settings.marketplaces?.upwork?.url].filter((u) => typeof u === 'string' && /^https?:/.test(u)),
  };

  return (
    <>
      <Seo description="Zeviro is a web development, B2B lead generation and data entry agency. 1,200+ projects completed on Fiverr with a 4.8★ rating. Order online, track everything in your client portal." schema={orgSchema} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="bg-grid-fade pointer-events-none absolute inset-0" />
        <div className="glow-orb pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-indigo-700/60" />
        <div className="glow-orb pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-fuchsia-700/40" />
        <div className="container-x relative grid items-center gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fadeUp">
            <span className="eyebrow"><Sparkles className="h-3.5 w-3.5" /> Web development · B2B leads · Data services</span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
              We build your website, find your <span className="text-gradient">next customers</span> and handle your data.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Zeviro is a hands-on agency trusted by clients in the USA, Europe, Canada and Australia. Order a package online, share your brief, and follow every step in your own client portal.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/services" className="btn-primary px-6 py-3" onClick={() => track('cta_click', { cta: 'hero_services' })}>
                Browse services & order <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/book-a-call" className="btn-ghost px-6 py-3" onClick={() => track('cta_click', { cta: 'hero_book_call' })}>Book a free call</Link>
            </div>
            {fv?.url && (
              <a href={fv.url} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-ink-600 bg-ink-850/70 px-4 py-3 text-sm hover:border-[#1dbf73]/60">
                <PlatformBadge platform="Fiverr" />
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><b className="text-white"><CountUp value={Number(fv.rating)} decimals={1} /></b><span className="text-slate-400">(<CountUp value={Number(fv.reviews)} /> reviews)</span></span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300"><CountUp value={fv.ordersCompleted} /> projects</span>
                {fv.level && <><span className="text-slate-500">·</span><span className="flex items-center gap-1 text-emerald-400"><BadgeCheck className="h-4 w-4" />{[fv.level, ...(fv.badges || [])].join(' · ')}</span></>}
              </a>
            )}
          </div>
          <HeroVisual review={reviews.data?.[0]} />
        </div>
      </section>

      {/* TRUST SIGNALS (Admin → Settings; keep them truthful) */}
      {stats.length > 0 && (
        <section className="border-y border-ink-600/50 bg-ink-900/60">
          <div className="container-x grid grid-cols-2 gap-6 py-10 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-semibold text-white sm:text-4xl"><CountUp value={s.value} /></div>
                <div className="mt-1 text-sm text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SERVICES */}
      <section className="container-x py-24">
        <SectionHeading eyebrow="Services" title="What we can do for you" text="Six service lines with clear packages — order online or ask for a custom quote." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {nav.services.map((s) => <ItemCard key={s._id} item={s} to={`/services/${s.slug}`} showImage cta="View packages" />)}
        </div>
      </section>

      {/* HOW ORDERING WORKS */}
      <section className="border-y border-ink-600/50 bg-ink-900/40 py-24">
        <div className="container-x">
          <SectionHeading eyebrow="Order online" title="From package to delivery in four steps" text="No long email threads. Everything happens in your private client portal." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ORDER_STEPS.map(([I, t, d], i) => (
              <div key={t} className="card relative p-6">
                <div className="flex items-center justify-between">
                  <span className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-2.5 text-brand-300"><I className="h-5 w-5" /></span>
                  <span className="font-mono text-sm text-slate-600">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="btn-primary">Create a free account <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/policies/refund-and-cancellation-policy" className="btn-ghost">Read our refund policy</Link>
          </div>
        </div>
      </section>

      {/* MARKETPLACE PROOF */}
      <section className="container-x py-24">
        <SectionHeading eyebrow="Fiverr & Upwork" title="Proven with real clients" text="We've been delivering on freelance marketplaces for years. You can check every review yourself." />
        <LiveStats />
        {reviews.data?.length > 0 && (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {reviews.data.slice(0, 3).map((r) => <ReviewCard key={r._id} r={r} />)}
          </div>
        )}
        <div className="mt-10 text-center"><Link to="/hire-us" className="btn-ghost">See our gigs & all reviews <ArrowRight className="h-4 w-4" /></Link></div>
      </section>

      {/* PORTFOLIO */}
      {cases.data?.length > 0 && (
        <section className="border-y border-ink-600/50 bg-ink-900/40 py-24">
          <div className="container-x">
            <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <SectionHeading eyebrow="Portfolio" title="Recent work" center={false} className="mb-0" />
              <Link to="/portfolio" className="btn-ghost">Full portfolio <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {cases.data.map((c) => <CaseCard key={c._id} c={c} />)}
            </div>
          </div>
        </section>
      )}

      {/* WHY */}
      <section className="container-x py-24">
        <SectionHeading eyebrow="Why Zeviro" title="A partner, not just a vendor" text="The reliability of a small, dedicated team — with the range of a full agency." />
        <WhyGrid />
      </section>

      {/* INDUSTRIES */}
      {nav.industries.length > 0 && (
        <section className="container-x pb-24">
          <SectionHeading eyebrow="Industries" title="Who we work with" />
          <div className="flex flex-wrap justify-center gap-3">
            {nav.industries.map((i) => (
              <Link key={i._id} to={`/industries/${i.slug}`} className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800/60 px-5 py-3 text-sm text-slate-200 transition hover:border-brand-500 hover:text-white">
                <Icon name={i.icon} className="h-4 w-4 text-brand-300" /> {i.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* HOW WE WORK */}
      <section className="border-y border-ink-600/50 bg-ink-900/40 py-24">
        <div className="container-x">
          <SectionHeading eyebrow="How we work" title="A clear process for every project" text="Brief → Plan & price → Design → Build & research → Quality check → Delivery → Support" />
          <ProcessSteps />
        </div>
      </section>

      {/* TECH STACK */}
      {tech.length > 0 && (
        <section className="container-x py-24">
          <SectionHeading eyebrow="Tools" title="Technology & tools we use every day" />
          <div className="flex flex-wrap justify-center gap-3">
            {tech.map((t) => (
              <span key={t} className="rounded-xl border border-ink-600 bg-ink-800/60 px-4 py-2.5 font-mono text-sm text-slate-300">{t}</span>
            ))}
          </div>
        </section>
      )}

      {/* AI CHATBOT / LIVE CHAT */}
      <section className="container-x pb-24">
        <div className="grid items-center gap-10 rounded-3xl border border-ink-600 bg-ink-850 p-8 sm:p-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow"><Bot className="h-3.5 w-3.5" /> AI Assistant + Live Chat</span>
            <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">Questions? Get answers in seconds.</h2>
            <p className="mt-4 text-slate-400">Our assistant answers from Zeviro's own knowledge base — services, prices, delivery times and policies — and connects you to a real person whenever you want.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {['Instant answers about services, prices & delivery', 'Help choosing the right package', 'Talk to the team when we are online'].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-400" />{t}</li>
              ))}
            </ul>
            <button className="btn-primary mt-8" onClick={() => window.dispatchEvent(new Event('zv:open-chat'))}>
              <MessageCircle className="h-4 w-4" /> Start a chat
            </button>
          </div>
          <div className="space-y-3">
            {[
              ['bot', "Hi! 👋 I'm Zeviro's assistant. What can I help you with?"],
              ['visitor', 'How much for 500 B2B leads?'],
              ['bot', 'Our Growth list package includes 500 verified B2B leads, delivered in 4 days. Click "Request price", tell us your target market and we\'ll send a fixed price within hours.'],
              ['agent', "Hi, I'm from the Zeviro team — happy to tailor the list to your target market!"],
            ].map(([who, t], i) => (
              <div key={i} className={who === 'visitor' ? 'flex justify-end' : 'flex gap-2'}>
                {who !== 'visitor' && <span className="h-8 w-8 shrink-0 rounded-full bg-ink-700 p-2 text-brand-300">{who === 'agent' ? <Headphones className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</span>}
                <p className={who === 'visitor' ? 'max-w-[75%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-snow' : who === 'agent' ? 'max-w-[75%] rounded-2xl rounded-bl-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm' : 'max-w-[75%] rounded-2xl rounded-bl-md bg-ink-700 px-4 py-2.5 text-sm'}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.data?.length > 0 && (
        <section className="container-x pb-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <SectionHeading eyebrow="FAQ" title="Frequently asked questions" center={false} text="Can't find your answer? Ask our assistant or send us a message." />
              <Link to="/faq" className="btn-ghost">See all FAQs <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <FaqList faqs={faqs.data} />
          </div>
        </section>
      )}

      <CtaBand title="Ready to get started?" text="Order a package in minutes, or book a free call and we'll recommend the best option for your goals." />
    </>
  );
}
