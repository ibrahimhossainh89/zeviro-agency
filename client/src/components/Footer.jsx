import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import SocialIcons from './SocialIcons';
import { useSite } from '../context/SiteContext';
import { Logo } from './Navbar';
import ThemeSwitcher from './ThemeSwitcher';
import { PlatformBadge } from './Marketplace';

export default function Footer() {
  const { settings, nav } = useSite();
  const mk = settings.marketplaces || {};
  const cols = [
    { title: 'Services', links: nav.services.slice(0, 6).map((s) => [s.title, `/services/${s.slug}`]) },
    { title: 'Company', links: [['About', '/about'], ['Our Team', '/team'], ['Portfolio', '/portfolio'], ['Fiverr & Upwork', '/hire-us'], ['How We Work', '/how-we-work'], ['Contact', '/contact']] },
    { title: 'Resources', links: [['Blog & Guides', '/resources'], ['FAQs', '/faq'], ['Solutions', '/solutions'], ['Industries', '/industries'], ['Client Login', '/login'], ['Create Account', '/signup']] },
    { title: 'Policies', links: [...(nav.policies || []).slice(0, 5).map((p) => [p.title.replace(/ Policy$/, ''), `/policies/${p.slug}`]), ['All policies', '/policies']] },
  ];

  return (
    <footer className="relative mt-24 border-t border-ink-600/60 bg-ink-900">
      <div className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              {settings.tagline || 'Web development, B2B lead generation & data services agency'} — helping businesses in the USA, Europe, Canada and Australia build, sell and grow since 2015.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-400">
              {settings.contactEmail && (
                <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-400" /><a href={`mailto:${settings.contactEmail}`} className="hover:text-white">{settings.contactEmail}</a></li>
              )}
              {settings.contactPhone && (
                <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-400" />{settings.contactPhone}</li>
              )}
              {settings.address && (
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-400" />{settings.address}</li>
              )}
            </ul>
            {Object.values(settings.socials || {}).some(Boolean) && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Follow us</p>
                <SocialIcons />
              </div>
            )}
            {(mk.fiverr?.url || mk.upwork?.url) && (
              <div className="mt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Hire us on</p>
                <div className="flex flex-wrap gap-2">
                  {mk.fiverr?.url && <a href={mk.fiverr.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800/60 px-3 py-2 text-sm hover:border-[#1dbf73]"><PlatformBadge platform="Fiverr" /><span className="text-slate-300">{mk.fiverr.rating}★ · {Number(mk.fiverr.reviews || 0).toLocaleString()} reviews</span></a>}
                  {mk.upwork?.url && <a href={mk.upwork.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800/60 px-3 py-2 text-sm hover:border-[#14a800]"><PlatformBadge platform="Upwork" /><span className="text-slate-300">View profile</span></a>}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="mb-4 text-sm font-semibold text-white">{c.title}</h4>
                <ul className="space-y-2.5 text-sm">
                  {c.links.map(([l, to]) => (
                    <li key={to}><Link to={to} className="text-slate-400 transition hover:text-white">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-ink-600 bg-ink-850 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-lg font-semibold text-white">Have a project in mind?</p>
            <p className="text-sm text-slate-400">Tell us about it — we reply within one business day.</p>
          </div>
          <Link to="/book-a-call" className="btn-primary">Book a Discovery Call <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-ink-600/60 pb-16 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} {settings.siteName || 'Zeviro'}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/policies/terms-of-service" className="hover:text-white">Terms</Link>
            <Link to="/policies/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link to="/policies/refund-and-cancellation-policy" className="hover:text-white">Refunds</Link>
            <Link to="/policies/cookie-policy" className="hover:text-white">Cookies</Link>
            <ThemeSwitcher variant="segmented" />
          </div>
        </div>
      </div>
    </footer>
  );
}
