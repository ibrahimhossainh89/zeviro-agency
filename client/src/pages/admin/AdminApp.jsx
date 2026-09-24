import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import { PageLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/http';
import Seo from '../../components/Seo';
import { useSocketEvent } from '../../lib/realtime';

// Explicit dynamic imports so Vite can code-split each admin module
const pick = (loader, name = 'default') => lazy(() => loader().then((m) => ({ default: m[name] })));
const clientsMod = () => import('./Clients.jsx');
const projectsMod = () => import('./Projects.jsx');
const commercialMod = () => import('./Commercial.jsx');
const systemMod = () => import('./System.jsx');
const Dashboard = lazy(() => import('./Dashboard.jsx'));
const Leads = lazy(() => import('./Leads.jsx'));
const LeadDetail = lazy(() => import('./LeadDetail.jsx'));
const Clients = pick(clientsMod, 'Clients');
const ClientDetail = pick(clientsMod, 'ClientDetail');
const Projects = pick(projectsMod, 'Projects');
const ProjectDetail = pick(projectsMod, 'ProjectDetail');
const Tasks = lazy(() => import('./Tasks.jsx'));
const Chats = lazy(() => import('./Chats.jsx'));
const Messages = lazy(() => import('./Messages.jsx'));
const Appointments = pick(commercialMod, 'Appointments');
const Proposals = pick(commercialMod, 'Proposals');
const Invoices = pick(commercialMod, 'Invoices');
const Tickets = lazy(() => import('./Tickets.jsx'));
const Cms = lazy(() => import('./Cms.jsx'));
const Media = lazy(() => import('./Media.jsx'));
const Users = pick(systemMod, 'Users');
const Notifications = pick(systemMod, 'Notifications');
const Settings = pick(systemMod, 'Settings');
const AuditLogs = pick(systemMod, 'AuditLogs');
const Profile = pick(systemMod, 'Profile');
const Reports = lazy(() => import('./Reports.jsx'));
const Reviews = lazy(() => import('./Reviews.jsx'));
const Orders = lazy(() => import('./Orders.jsx').then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./Orders.jsx').then((m) => ({ default: m.OrderDetail })));

// Route guard by module permission (defined at module level so pages don't remount on re-render)
function G({ m, children }) {
  const { can } = useAuth();
  return can(m) ? children : <Navigate to="/admin" replace />;
}

export default function AdminApp() {
  const { can } = useAuth();
  const [badges, setBadges] = useState({});

  const loadBadges = () => {
    if (can('orders')) api.get('/orders', { limit: 1 }).then((d) => setBadges((b) => ({ ...b, orders: d.unread || 0 }))).catch(() => {});
    if (can('reviews')) api.get('/reviews', { status: 'pending', limit: 1 }).then((d) => setBadges((b) => ({ ...b, reviews: d.pending || 0 }))).catch(() => {});
    if (can('chats')) api.get('/chat/admin', { limit: 1 }).then((d) => setBadges((b) => ({ ...b, chats: d.unanswered }))).catch(() => {});
    if (can('messages')) api.get('/messages/threads').then((d) => setBadges((b) => ({ ...b, messages: d.reduce((s, t) => s + t.unread, 0) }))).catch(() => {});
  };
  useSocketEvent('chat:list', loadBadges);
  useSocketEvent('msg:thread', loadBadges);
  useSocketEvent('order:new', loadBadges);
  useSocketEvent('order:update', loadBadges);
  useSocketEvent('order:read', loadBadges);
  useSocketEvent('review:new', loadBadges);
  useSocketEvent('review:update', loadBadges);
  useSocketEvent('msg:read', loadBadges);
  useEffect(() => {
    loadBadges();
    const id = setInterval(loadBadges, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nav = [
    { to: '/admin', label: 'Dashboard', icon: 'LayoutDashboard', end: true, m: 'dashboard' },
    { section: 'Sales' },
    { to: '/admin/orders', label: 'Orders', icon: 'ShoppingBag', m: 'orders', badge: badges.orders },
    { to: '/admin/reviews', label: 'Reviews', icon: 'Star', m: 'reviews', badge: badges.reviews },
    { to: '/admin/leads', label: 'Leads / CRM', icon: 'Target', m: 'leads' },
    { to: '/admin/chats', label: 'Chats', icon: 'MessagesSquare', m: 'chats', badge: badges.chats },
    { to: '/admin/appointments', label: 'Appointments', icon: 'CalendarDays', m: 'appointments' },
    { to: '/admin/proposals', label: 'Proposals', icon: 'FileText', m: 'proposals' },
    { section: 'Delivery' },
    { to: '/admin/clients', label: 'Clients', icon: 'Building2', m: 'clients' },
    { to: '/admin/projects', label: 'Projects', icon: 'FolderKanban', m: 'projects' },
    { to: '/admin/tasks', label: 'Tasks', icon: 'CheckSquare', m: 'tasks' },
    { to: '/admin/messages', label: 'Client Messages', icon: 'MessageSquare', m: 'messages', badge: badges.messages },
    { to: '/admin/tickets', label: 'Support Tickets', icon: 'LifeBuoy', m: 'tickets' },
    { to: '/admin/invoices', label: 'Invoices', icon: 'Receipt', m: 'invoices' },
    { section: 'Content' },
    { to: '/admin/cms', label: 'Website CMS', icon: 'Globe', m: 'cms' },
    { to: '/admin/media', label: 'Media & Files', icon: 'Image', m: 'files' },
    { section: 'System' },
    { to: '/admin/reports', label: 'Reports', icon: 'BarChart3', m: 'reports' },
    { to: '/admin/users', label: 'Users & Roles', icon: 'UserCog', m: 'users' },
    { to: '/admin/notifications', label: 'Notifications', icon: 'Bell', m: 'dashboard' },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'Shield', m: 'audit' },
    { to: '/admin/settings', label: 'Settings', icon: 'Settings', m: 'settings' },
  ];
  // hide sections with no visible items
  const visible = nav.filter((n) => n.section || can(n.m));
  const cleaned = visible.filter((n, i) => !n.section || (visible[i + 1] && !visible[i + 1].section));

  return (
    <AppShell nav={cleaned} base="/admin" title="Admin" notificationsEndpoint="/notifications">
      <Seo title="Admin" noindex />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<G m="orders"><Orders /></G>} />
          <Route path="orders/:id" element={<G m="orders"><OrderDetail /></G>} />
          <Route path="reviews" element={<G m="reviews"><Reviews /></G>} />
          <Route path="leads" element={<G m="leads"><Leads /></G>} />
          <Route path="leads/:id" element={<G m="leads"><LeadDetail /></G>} />
          <Route path="clients" element={<G m="clients"><Clients /></G>} />
          <Route path="clients/:id" element={<G m="clients"><ClientDetail /></G>} />
          <Route path="projects" element={<G m="projects"><Projects /></G>} />
          <Route path="projects/:id" element={<G m="projects"><ProjectDetail /></G>} />
          <Route path="tasks" element={<G m="tasks"><Tasks /></G>} />
          <Route path="chats" element={<G m="chats"><Chats /></G>} />
          <Route path="messages" element={<G m="messages"><Messages /></G>} />
          <Route path="appointments" element={<G m="appointments"><Appointments /></G>} />
          <Route path="proposals" element={<G m="proposals"><Proposals /></G>} />
          <Route path="invoices" element={<G m="invoices"><Invoices /></G>} />
          <Route path="tickets" element={<G m="tickets"><Tickets /></G>} />
          <Route path="cms" element={<G m="cms"><Cms /></G>} />
          <Route path="cms/:type" element={<G m="cms"><Cms /></G>} />
          <Route path="media" element={<G m="files"><Media /></G>} />
          <Route path="reports" element={<G m="reports"><Reports /></G>} />
          <Route path="users" element={<G m="users"><Users /></G>} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="audit-logs" element={<G m="audit"><AuditLogs /></G>} />
          <Route path="settings" element={<G m="settings"><Settings /></G>} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
