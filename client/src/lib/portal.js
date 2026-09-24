// Which site am I? One React build serves three hosts:
//   zeviro.agency        → public website + client portal (client login / signup)
//   team.zeviro.agency   → team login + dashboard
//   admin.zeviro.agency  → super admin login + dashboard
// Local development: http://admin.localhost:5173 and http://team.localhost:5173 work in Chrome/Edge/Firefox,
// or add ?portal=admin / ?portal=team to any localhost URL (remembered for the tab).
// Free test hosts have no admin./team. sub-domains → use ?portal=admin / ?portal=team / ?portal=client there
const TEST_HOST = /\.(onrender\.com|up\.railway\.app|vercel\.app|fly\.dev|koyeb\.app)$/i;

function detect() {
  if (typeof window === 'undefined') return 'client';
  const h = window.location.hostname.toLowerCase();
  if (h.startsWith('admin.')) return 'admin';
  if (h.startsWith('team.')) return 'team';
  if (import.meta.env.DEV || TEST_HOST.test(h)) {
    try {
      const q = new URLSearchParams(window.location.search).get('portal');
      if (q === 'client') sessionStorage.removeItem('zv_portal');
      else if (q) sessionStorage.setItem('zv_portal', q);
      const s = sessionStorage.getItem('zv_portal');
      if (s === 'admin' || s === 'team') return s;
    } catch {
      /* ignore */
    }
  }
  return 'client';
}

export const PORTAL = detect();
export const IS_STAFF_PORTAL = PORTAL === 'admin' || PORTAL === 'team';

/** URL of the public website (used for links from the team/admin portals). */
export function siteUrl(path = '/') {
  if (typeof window === 'undefined') return path;
  const { protocol, host, hostname } = window.location;
  if (TEST_HOST.test(hostname)) return `${protocol}//${host}${path}${path.includes('?') ? '&' : '?'}portal=client`;
  const bare = host.replace(/^(admin|team)\./i, '');
  return `${protocol}//${bare}${path}`;
}
