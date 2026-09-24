import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, ArrowRight, LogIn, LayoutDashboard } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';
import { Icon } from './ui';
import ThemeSwitcher from './ThemeSwitcher';
import { cn, track } from '../lib/utils';

/** Brand mark: dark tile, gradient Z, AI sparkle. */
export function LogoMark({ className = 'h-9 w-9' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`zg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset=".5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="504" height="504" rx="118" fill="#0c0c16" stroke="#26263b" strokeWidth="8" />
      <path d="M146 162H350L178 366H358" fill="none" stroke={`url(#zg${id})`} strokeWidth="56" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M404 76Q411.9 104.1 440 112Q411.9 119.9 404 148Q396.1 119.9 368 112Q396.1 104.1 404 76Z" fill="#d946ef" />
    </svg>
  );
}

export function Logo({ className, compact }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="Zeviro Agency home">
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold tracking-tight text-white">Zeviro</span>
        {!compact && (
          <span className="mt-1 flex items-center gap-1.5">
            <span className="logo-agency text-[9px] font-semibold uppercase tracking-[0.42em]">Agency</span>
            <span className="logo-agency-line h-px w-4 rounded opacity-70" />
          </span>
        )}
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { nav } = useSite();
  const { user, isStaff } = useAuth();
  const [open, setOpen] = useState(null); // desktop dropdown key
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [loc.pathname]);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);

  const menus = [
    { key: 'services', label: 'Services', to: '/services', items: nav.services.map((s) => ({ ...s, to: `/services/${s.slug}` })) },
    { key: 'solutions', label: 'Solutions', to: '/solutions', items: nav.solutions.map((s) => ({ ...s, to: `/solutions/${s.slug}` })) },
    { key: 'industries', label: 'Industries', to: '/industries', items: nav.industries.map((s) => ({ ...s, to: `/industries/${s.slug}` })) },
    { key: 'portfolio', label: 'Portfolio', to: '/portfolio' },
    {
      key: 'resources', label: 'Resources', to: '/resources',
      items: [
        { title: 'Blog', to: '/resources?type=Blog', icon: 'BookOpen', excerpt: 'Ideas on growth, product and tech' },
        { title: 'Guides', to: '/resources?type=Guide', icon: 'ClipboardList', excerpt: 'Practical, step-by-step playbooks' },
        { title: 'Insights', to: '/resources?type=Insight', icon: 'Lightbulb', excerpt: 'Our take on trends that matter' },
        { title: 'FAQs', to: '/faq', icon: 'HelpCircle', excerpt: 'Answers to common questions' },
      ],
    },
    {
      key: 'about', label: 'About', to: '/about',
      items: [
        { title: 'About Zeviro', to: '/about', icon: 'Building2', excerpt: 'Who we are and what drives us' },
        { title: 'Our Team', to: '/team', icon: 'Users', excerpt: 'The people behind the work' },
        { title: 'How We Work', to: '/how-we-work', icon: 'Workflow', excerpt: 'Our 7-step delivery process' },
        { title: 'Why Zeviro', to: '/why-zeviro', icon: 'Star', excerpt: 'What makes us different' },
        { title: 'Fiverr & Upwork', to: '/hire-us', icon: 'BadgeCheck', excerpt: 'Our marketplace profiles, gigs & reviews' },
        { title: 'Company Policies', to: '/policies', icon: 'ShieldCheck', excerpt: 'Terms, privacy, refunds & more' },
      ],
    },
    { key: 'contact', label: 'Contact', to: '/contact' },
  ];

  const client = user && !isStaff ? user : null; // staff never sign in on the public website

  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 transition-all', scrolled ? 'border-b border-ink-600/60 bg-ink-950/85 backdrop-blur-xl' : 'bg-transparent')}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex xl:gap-1" onMouseLeave={() => setOpen(null)}>
          {menus.map((m) => (
            <div key={m.key} className="relative" onMouseEnter={() => setOpen(m.items ? m.key : null)}>
              <NavLink
                to={m.to}
                className={({ isActive }) => cn('flex items-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-2 text-sm font-medium transition xl:px-3', isActive ? 'text-white' : 'text-slate-400 hover:text-white')}
                aria-haspopup={!!m.items}
                aria-expanded={open === m.key}
              >
                {m.label}
                {m.items && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
              </NavLink>
              {m.items && open === m.key && (
                <div className="absolute left-1/2 top-full w-[560px] -translate-x-1/2 pt-3">
                  <div className="card grid animate-fadeUp grid-cols-2 gap-1 bg-ink-850/95 p-3 shadow-2xl">
                    {m.items.map((it) => (
                      <Link key={it.to} to={it.to} className="group flex gap-3 rounded-xl p-3 transition hover:bg-ink-700/60">
                        <span className="mt-0.5 rounded-lg border border-brand-500/30 bg-brand-500/10 p-2 text-brand-300">
                          <Icon name={it.icon} className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-white">{it.title}</span>
                          {it.excerpt && <span className="line-clamp-2 text-xs text-slate-500">{it.excerpt}</span>}
                        </span>
                      </Link>
                    ))}
                    <Link to={m.to} className="col-span-2 mt-1 flex items-center justify-between rounded-xl border border-ink-600 px-4 py-2.5 text-xs text-slate-400 hover:text-white">
                      View all {m.label.toLowerCase()} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 lg:flex xl:gap-2">
          <ThemeSwitcher />
          {client ? (
            <Link to="/portal" className="btn-ghost btn-sm whitespace-nowrap" title="My portal">
              <LayoutDashboard className="h-4 w-4" /> <span className="hidden xl:inline">My Portal</span>
            </Link>
          ) : (
            <>
              <Link to="/login" className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-slate-300 hover:text-white">
                <LogIn className="h-4 w-4" /> Log in
              </Link>
              <Link to="/signup" className="btn-ghost btn-sm hidden whitespace-nowrap xl:inline-flex">Sign up</Link>
            </>
          )}
          <Link to="/book-a-call" className="btn-primary btn-sm whitespace-nowrap" onClick={() => track('cta_click', { cta: 'nav_book_call' })}>
            <span className="xl:hidden">Book a Call</span>
            <span className="hidden xl:inline">Book a Discovery Call</span>
          </Link>
        </div>
        <button className="rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setMobile((v) => !v)} aria-label="Toggle menu">
          {mobile ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobile && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-ink-600 bg-ink-950 lg:hidden">
          <div className="container-x space-y-1 py-4">
            {menus.map((m) => (
              <details key={m.key} className="group rounded-xl">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-xl px-3 py-3 font-medium text-white hover:bg-ink-800">
                  {m.items ? m.label : <Link to={m.to} className="w-full">{m.label}</Link>}
                  {m.items && <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />}
                </summary>
                {m.items && (
                  <div className="space-y-1 pb-2 pl-4">
                    <Link to={m.to} className="block rounded-lg px-3 py-2 text-sm text-slate-400">All {m.label}</Link>
                    {m.items.map((it) => (
                      <Link key={it.to} to={it.to} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-ink-800">{it.title}</Link>
                    ))}
                  </div>
                )}
              </details>
            ))}
            <div className="flex items-center justify-between rounded-xl px-3 py-3">
              <span className="text-sm font-medium text-white">Theme</span>
              <ThemeSwitcher variant="segmented" />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-3">
              {client ? (
                <Link to="/portal" className="btn-ghost col-span-2">My Portal</Link>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost">Log in</Link>
                  <Link to="/signup" className="btn-ghost">Sign up</Link>
                </>
              )}
              <Link to="/book-a-call" className="btn-primary col-span-2">Book a Discovery Call</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
