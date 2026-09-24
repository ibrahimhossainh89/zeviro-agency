import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X, ExternalLink, CheckCheck } from 'lucide-react';
import { Logo } from './Navbar';
import { IS_STAFF_PORTAL, siteUrl } from '../lib/portal';
import { Icon, Avatar } from './ui';
import ThemeSwitcher from './ThemeSwitcher';
import ErrorBoundary from './ErrorBoundary';
import { useSocketEvent } from '../lib/realtime';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/http';
import { cn, timeAgo } from '../lib/utils';

function NotificationBell({ endpoint, base }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], unread: 0 });
  const ref = useRef();
  const nav = useNavigate();

  const load = () =>
    api
      .get(endpoint, { limit: 12 })
      .then((d) => setData(Array.isArray(d) ? { items: d.slice(0, 12), unread: d.filter((n) => !n.read).length } : d))
      .catch(() => {});
  useSocketEvent('notification:new', () => load());
  useSocketEvent('notification:read', () => load()); // read in another tab / by opening the page
  // Opening a page clears the notifications that point to it (e.g. an order or a message thread)
  const { pathname } = useLocation();
  useEffect(() => {
    api.post(`${endpoint}/read-link`, { link: pathname }).then((r) => r?.updated && load()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const f = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);

  const readAll = async () => {
    await api.post(`${endpoint}/read-all`);
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="relative rounded-xl border border-ink-600 p-2 text-slate-300 hover:text-white" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {data.unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-snow">{data.unread > 9 ? '9+' : data.unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 animate-fadeUp overflow-hidden rounded-2xl border border-ink-600 bg-ink-850 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-600 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <button onClick={readAll} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">You're all caught up 🎉</p>}
            {data.items.map((n) => (
              <button
                key={n._id}
                onClick={() => {
                  setOpen(false);
                  if (!n.read) api.patch(`${endpoint}/${n._id}`).then(load).catch(() => {});
                  if (n.link) nav(n.link);
                }}
                className={cn('block w-full border-b border-ink-700/60 px-4 py-3 text-left hover:bg-ink-700/40', !n.read && 'bg-brand-500/5')}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />}
                  <div>
                    <p className="text-sm text-white">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body.replace(/<[^>]*>/g, '')}</p>}
                    <p className="mt-1 text-[11px] text-slate-600">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {base === '/admin' && <Link to="/admin/notifications" onClick={() => setOpen(false)} className="block py-2.5 text-center text-xs text-brand-300 hover:bg-ink-700/40">View all</Link>}
        </div>
      )}
    </div>
  );
}

/**
 * Shared shell for Admin Dashboard and Client Portal.
 * nav: [{ section?, to, label, icon, end?, badge? }]
 */
export default function AppShell({ nav, base, title, children, notificationsEndpoint }) {
  const { user, logout } = useAuth();
  const [mobile, setMobile] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    setMobile(false);
  }, [loc.pathname]);

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between border-b border-ink-600/60 px-5">
        <Logo />
        <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300">{title}</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((item, i) =>
          item.section ? (
            <p key={`s${i}`} className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-600">{item.section}</p>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition', isActive ? 'bg-brand-500/15 font-medium text-white' : 'text-slate-400 hover:bg-ink-700/50 hover:text-white')}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge > 0 && <span className="rounded-full bg-fuchsia-500 px-1.5 text-[10px] font-bold text-snow">{item.badge}</span>}
            </NavLink>
          )
        )}
      </nav>
      <div className="border-t border-ink-600/60 p-3">
        {IS_STAFF_PORTAL ? <a href={siteUrl("/")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /> View website</a> : <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-500 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /> View website</Link>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-ink-600/60 bg-ink-900 lg:block">{Sidebar}</aside>
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-ink-600 bg-ink-900">{Sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-ink-600/60 bg-ink-950/85 px-4 backdrop-blur-xl sm:px-6">
          <button className="rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setMobile((v) => !v)} aria-label="Menu">{mobile ? <X /> : <Menu />}</button>
          <div className="hidden text-sm text-slate-500 lg:block">Welcome back, <span className="text-slate-200">{user?.name?.split(' ')[0]}</span></div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <NotificationBell endpoint={notificationsEndpoint} base={base} />
            <Link to={`${base}/profile`} className="flex items-center gap-2 rounded-xl border border-ink-600 py-1 pl-1 pr-3 hover:border-brand-500/50">
              <Avatar name={user?.name} src={user?.avatar} seed={user?._id} size="sm" />
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium text-white">{user?.name}</span>
                <span className="block text-[10px] capitalize text-slate-500">{user?.role?.replace('_', ' ')}</span>
              </span>
            </Link>
            <button onClick={async () => { await logout(); navigate('/login'); }} className="rounded-xl border border-ink-600 p-2 text-slate-400 hover:text-white" aria-label="Log out"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8"><ErrorBoundary resetKey={loc.pathname}>{children}</ErrorBoundary></main>
      </div>
    </div>
  );
}
