import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../../components/AppShell';
import { PageLoader } from '../../components/ui';
import Seo from '../../components/Seo';
import { api } from '../../api/http';
import { useSocketEvent } from '../../lib/realtime';

const L = (name) => lazy(() => import('./Portal.jsx').then((m) => ({ default: m[name] })));
const Overview = L('Overview');
const Projects = L('Projects');
const ProjectDetail = L('ProjectDetail');
const Tasks = L('Tasks');
const Files = L('Files');
const Messages = L('Messages');
const Proposals = L('Proposals');
const Invoices = L('Invoices');
const InvoiceView = L('InvoiceView');
const Meetings = L('Meetings');
const Support = L('Support');
const Profile = L('Profile');
const Orders = lazy(() => import('./Orders.jsx').then((m) => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./Orders.jsx').then((m) => ({ default: m.OrderDetail })));

export default function PortalApp() {
  const [unread, setUnread] = useState(0);
  const [ordersUnread, setOrdersUnread] = useState(0);
  const loadOrders = () => api.get('/portal/orders-unread').then((d) => setOrdersUnread(d.unread)).catch(() => {});
  useSocketEvent('order:update', loadOrders);
  useSocketEvent('order:read', loadOrders);
  useEffect(() => {
    loadOrders();
  }, []);
  useSocketEvent('msg:new', ({ message }) => {
    if (!message.fromClient && !window.location.pathname.startsWith('/portal/messages')) setUnread((n) => n + 1);
  });
  useEffect(() => {
    const load = () => api.get('/portal/overview').then((d) => setUnread(d.unreadMessages)).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const nav = [
    { to: '/portal', label: 'Dashboard', icon: 'LayoutDashboard', end: true },
    { section: 'Work' },
    { to: '/portal/orders', label: 'My Orders', icon: 'ShoppingBag', badge: ordersUnread },
    { to: '/portal/projects', label: 'My Projects', icon: 'FolderKanban' },
    { to: '/portal/tasks', label: 'Tasks', icon: 'CheckSquare' },
    { to: '/portal/files', label: 'Files & Documents', icon: 'FileText' },
    { to: '/portal/messages', label: 'Messages', icon: 'MessageSquare', badge: unread },
    { to: '/portal/meetings', label: 'Meetings', icon: 'CalendarDays' },
    { section: 'Billing' },
    { to: '/portal/proposals', label: 'Proposals', icon: 'ClipboardList' },
    { to: '/portal/invoices', label: 'Invoices & Payments', icon: 'Receipt' },
    { section: 'Account' },
    { to: '/portal/support', label: 'Support', icon: 'LifeBuoy' },
    { to: '/portal/profile', label: 'Profile & Settings', icon: 'Settings' },
  ];

  return (
    <AppShell nav={nav} base="/portal" title="Client" notificationsEndpoint="/portal/notifications">
      <Seo title="Client Portal" noindex />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Overview />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="files" element={<Files />} />
          <Route path="messages" element={<Messages onRead={() => setUnread(0)} />} />
          <Route path="proposals" element={<Proposals />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceView />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="support" element={<Support />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
