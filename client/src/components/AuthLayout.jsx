import { Link } from 'react-router-dom';
import { CheckCircle2, Star, ShieldCheck } from 'lucide-react';
import { Logo } from './Navbar';
import ThemeSwitcher from './ThemeSwitcher';
import { useSite } from '../context/SiteContext';

const BENEFITS = [
  ['Order services online', 'Pick a package, share your requirements and pay securely.'],
  ['Track every project', 'Milestones, tasks, deliveries and deadlines in one place.'],
  ['Talk to your team', 'Real-time messages with the people doing the work.'],
  ['Invoices & files', 'Download deliverables and invoices whenever you need them.'],
];

/** Split-screen layout for the client login and signup pages. */
export default function AuthLayout({ children, aside = true }) {
  const { settings } = useSite();
  const fv = settings.marketplaces?.fiverr;
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {aside && (
        <aside className="relative hidden overflow-hidden border-r border-ink-600/60 bg-ink-900 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="bg-grid-fade pointer-events-none absolute inset-0" />
          <div className="glow-orb pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-indigo-700/60" />
          <div className="glow-orb pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-fuchsia-700/40" />
          <div className="relative"><Logo /></div>
          <div className="relative max-w-lg">
            <h2 className="text-4xl font-semibold leading-tight xl:text-5xl">
              Your projects, orders and team — <span className="text-gradient">in one portal.</span>
            </h2>
            <ul className="mt-10 space-y-5">
              {BENEFITS.map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-medium text-white">{t}</p>
                    <p className="text-sm text-slate-400">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-400">
            {fv?.rating ? (
              <span className="flex items-center gap-2">
                <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}</span>
                <span><b className="text-white">{fv.rating}</b> from {fv.reviews?.toLocaleString()} Fiverr reviews</span>
              </span>
            ) : null}
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-300" /> Encrypted & private</span>
          </div>
        </aside>
      )}
      <main className="relative flex min-h-screen flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="lg:invisible"><Logo /></div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-slate-400 hover:text-white">← Website</Link>
            <ThemeSwitcher />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Zeviro · <Link to="/policies/terms-of-service" className="hover:text-white">Terms</Link> · <Link to="/policies/privacy-policy" className="hover:text-white">Privacy</Link>
        </p>
      </main>
    </div>
  );
}
