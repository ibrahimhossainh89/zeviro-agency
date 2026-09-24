import { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatWidget from './ChatWidget';
import { track } from '../lib/utils';

function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem('zv_cookie'));
    } catch {
      /* noop */
    }
  }, []);
  const decide = (v) => {
    try {
      localStorage.setItem('zv_cookie', v);
    } catch {
      /* noop */
    }
    setShow(false);
    if (v === 'accepted') window.location.reload();
  };
  if (!show) return null;
  return (
    <div className="fixed bottom-24 left-4 right-4 z-[55] max-w-sm sm:bottom-4 sm:right-auto rounded-2xl border border-ink-600 bg-ink-850/95 p-4 text-sm shadow-2xl backdrop-blur">
      <p className="text-slate-300">
        We use essential cookies and, with your consent, analytics to improve our site. See our <Link to="/policies/cookie-policy" className="underline">Cookie Policy</Link>.
      </p>
      <div className="mt-3 flex gap-2">
        <button className="btn-primary btn-sm" onClick={() => decide('accepted')}>Accept</button>
        <button className="btn-ghost btn-sm" onClick={() => decide('rejected')}>Essential only</button>
      </div>
    </div>
  );
}

export default function PublicLayout() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    track('pageview');
  }, [pathname, search]);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-3 focus:py-2 focus:text-snow">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
      <ChatWidget />
      <CookieBanner />
    </div>
  );
}
