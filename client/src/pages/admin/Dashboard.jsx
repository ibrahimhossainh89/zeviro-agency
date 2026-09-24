import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowRight, CalendarDays, AlarmClock } from 'lucide-react';
import { Stat, Badge, PageLoader, ErrorBox, Empty } from '../../components/ui';
import { useFetch, fmtDateTime, fmtDate, timeAgo } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import RevenuePanel from './RevenuePanel';
import DashboardHero from './DashboardHero';

export default function Dashboard() {
  const { data, loading, error } = useFetch('/reports/dashboard');
  const { can, user } = useAuth();
  if (loading) return <PageLoader />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const k = data.kpis;

  // fill missing days so the chart is continuous
  const byDay = Object.fromEntries(data.leadsByDay.map((d) => [d._id, d.n]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10);
    return { day: d.slice(5), leads: byDay[d] || 0 };
  });

  return (
    <div className="space-y-6">
      <DashboardHero user={user} kpis={k} showRevenue={can('orders') || can('invoices')} />
      {(can('orders') || can('invoices')) && <RevenuePanel />}
      <h2 className="pt-2 text-lg font-semibold text-white">Sales & delivery at a glance</h2>
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="New leads (30d)" value={k.newLeads} icon="Target" to={can('leads') ? '/admin/leads' : undefined} />
        <Stat label="Qualified pipeline" value={k.qualifiedLeads} icon="TrendingUp" tone="green" to={can('leads') ? '/admin/leads?status=Qualified' : undefined} />
        <Stat label="Active chats (24h)" value={k.openChats} icon="MessagesSquare" tone="cyan" hint={k.escalatedChats ? `${k.escalatedChats} waiting for an agent` : 'No one waiting'} to={can('chats') ? '/admin/chats' : undefined} />
        <Stat label="Upcoming appointments" value={k.upcomingAppointments} icon="CalendarDays" tone="pink" to={can('appointments') ? '/admin/appointments' : undefined} />
        <Stat label="Active clients" value={k.activeClients} icon="Building2" tone="blue" to={can('clients') ? '/admin/clients' : undefined} />
        <Stat label="Active projects" value={k.activeProjects} icon="FolderKanban" tone="violet" to={can('projects') ? '/admin/projects' : undefined} />
        <Stat label="Open tickets" value={k.openTickets} icon="LifeBuoy" tone="amber" to={can('tickets') ? '/admin/tickets' : undefined} />
        <Stat label="Overdue invoices" value={k.overdueInvoices} icon="Receipt" tone={k.overdueInvoices ? 'red' : 'gray'} to={can('invoices') ? '/admin/invoices?status=Overdue' : undefined} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card spin-card animate-fadeUp p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Leads — last 30 days</h2>
            <span className="text-xs text-slate-500">{k.totalLeads} all-time</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lgStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#d946ef" />
                  </linearGradient>
                  <filter id="lgGlow" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                </defs>
                <CartesianGrid stroke="rgb(var(--ink-700))" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={4} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ stroke: 'rgb(var(--ink-500))', strokeDasharray: '3 3' }} contentStyle={{ background: 'rgb(var(--ink-850))', border: '1px solid rgb(var(--ink-600))', color: 'rgb(var(--white))', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="leads" stroke="url(#lgStroke)" strokeWidth={3} fill="url(#lg1)" filter="url(#lgGlow)" isAnimationActive animationDuration={2200} animationEasing="ease-out" activeDot={{ r: 6, strokeWidth: 3, stroke: 'rgb(var(--ink-850))', fill: '#a78bfa' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-brand-300" /> Upcoming meetings</h2>
          {data.upcoming.length === 0 ? <Empty title="No upcoming meetings" /> : (
            <ul className="stagger space-y-3">
              {data.upcoming.map((a) => (
                <li key={a._id} className="rounded-xl border border-ink-600 p-3 transition hover:-translate-y-0.5 hover:border-brand-500/50">
                  <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-white">{a.title}</p><Badge>{a.status}</Badge></div>
                  <p className="mt-1 text-xs text-slate-400">{a.name}{a.company ? ` · ${a.company}` : ''}</p>
                  <p className="mt-1 text-xs text-brand-300">{fmtDateTime(a.startsAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card overflow-x-auto xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-semibold">Recent leads</h2>
            {can('leads') && <Link to="/admin/leads" className="flex items-center gap-1 text-xs text-brand-300">View all <ArrowRight className="h-3.5 w-3.5" /></Link>}
          </div>
          <table className="table-x mt-2">
            <thead><tr><th>Lead</th><th>Service</th><th>Source</th><th>Status</th><th>Received</th></tr></thead>
            <tbody className="stagger">
              {data.recentLeads.map((l) => (
                <tr key={l._id}>
                  <td>{can('leads') ? <Link to={`/admin/leads/${l._id}`} className="font-medium text-white hover:underline">{l.fullName}</Link> : l.fullName}<div className="text-xs text-slate-500">{l.company}</div></td>
                  <td className="text-slate-300">{l.service || '—'}</td>
                  <td className="text-slate-400">{l.source}</td>
                  <td><Badge>{l.status}</Badge></td>
                  <td className="text-xs text-slate-500">{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold"><AlarmClock className="h-4 w-4 text-amber-300" /> Follow-ups due</h2>
          {data.followUps.length === 0 ? <p className="text-sm text-slate-500">Nothing due — nice work, {user?.name?.split(' ')[0]}.</p> : (
            <ul className="stagger space-y-2">
              {data.followUps.map((l) => (
                <li key={l._id}><Link to={`/admin/leads/${l._id}`} className="flex items-center justify-between rounded-xl border border-ink-600 px-3 py-2 text-sm hover:border-brand-500/50"><span className="text-white">{l.fullName}</span><span className="text-xs text-amber-300">{fmtDate(l.followUpDate)}</span></Link></li>
              ))}
            </ul>
          )}
          <div className="mt-5 rounded-xl bg-ink-700/40 p-3 text-xs text-slate-400">You have <span className="font-semibold text-white">{k.myTasks}</span> open task(s) assigned to you.</div>
        </div>
      </div>
    </div>
  );
}
