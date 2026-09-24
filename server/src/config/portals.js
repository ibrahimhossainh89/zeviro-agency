// Which roles may sign in through which login portal.
//   zeviro.agency/login        → clients only (public website)
//   team.zeviro.agency/login   → team members (every staff role except superadmin)
//   admin.zeviro.agency/login  → super admin only
//   Android app                → clients + team (never superadmin)
import { STAFF_ROLES } from './permissions.js';

const TEAM_ROLES = STAFF_ROLES.filter((r) => r !== 'superadmin');

export const PORTAL_ROLES = {
  client: ['client'],
  team: TEAM_ROLES,
  admin: ['superadmin'],
  app: [...TEAM_ROLES, 'client'],
};

export const PORTAL_LABEL = { client: 'client', team: 'team', admin: 'super admin', app: 'app' };

/** Portal from the request host (admin.* / team.*), falling back to the X-Zeviro-Portal header in development. */
/** Free hosting URLs have no admin./team. sub-domains, so the portal comes from ?portal=… there. Set ALLOW_PORTAL_PARAM=true for any other host. */
export function isTestHost(host = '') {
  return String(process.env.ALLOW_PORTAL_PARAM).toLowerCase() === 'true' || /\.(onrender\.com|up\.railway\.app|vercel\.app|fly\.dev|koyeb\.app)$/i.test(host);
}

export function portalFromRequest(req) {
  const host = String(req.hostname || '').toLowerCase();
  if (host.startsWith('admin.')) return 'admin';
  if (host.startsWith('team.')) return 'team';
  const hinted = String(req.get('x-zeviro-portal') || req.body?.portal || '').toLowerCase();
  if (hinted === 'app') return 'app'; // mobile app (Bearer token, no browser host)
  // local dev (admin.localhost behind the Vite proxy) and free test hosts without sub-domains (xxx.onrender.com?portal=admin)
  if (PORTAL_ROLES[hinted] && (process.env.NODE_ENV !== 'production' || isTestHost(host))) return hinted;
  return 'client';
}

/** Where a role should sign in instead (used in friendly error messages). */
export function portalUrlFor(role) {
  const base = (process.env.SITE_URL || 'https://zeviro.agency').replace(/\/$/, '');
  const u = new URL(base);
  if (role === 'client') return `${base}/login`;
  const sub = role === 'superadmin' ? 'admin' : 'team';
  return `${u.protocol}//${sub}.${u.host.replace(/^www\./, '')}/login`;
}
