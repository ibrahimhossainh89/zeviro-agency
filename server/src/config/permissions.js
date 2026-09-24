// Role-based access control map (Spec §15).
// Each module lists the roles that may access it. `superadmin` always has access.
export const ROLES = [
  'superadmin',
  'admin',
  'sales',
  'pm',
  'developer',
  'chat_agent',
  'content_manager',
  'client',
];

export const STAFF_ROLES = ROLES.filter((r) => r !== 'client');

export const PERMISSIONS = {
  dashboard: ['admin', 'sales', 'pm', 'developer', 'chat_agent', 'content_manager'],
  leads: ['admin', 'sales', 'chat_agent'],
  clients: ['admin', 'sales', 'pm'],
  projects: ['admin', 'pm', 'developer', 'sales'],
  tasks: ['admin', 'pm', 'developer'],
  files: ['admin', 'pm', 'developer'],
  messages: ['admin', 'pm'],
  chats: ['admin', 'chat_agent', 'sales'],
  appointments: ['admin', 'sales', 'pm'],
  proposals: ['admin', 'sales'],
  invoices: ['admin', 'sales'],
  orders: ['admin', 'sales', 'pm'],
  reviews: ['admin', 'sales', 'pm'],
  tickets: ['admin', 'pm'],
  cms: ['admin', 'content_manager'],
  users: [], // superadmin only
  reports: ['admin', 'sales'],
  settings: [], // superadmin only
  audit: ['admin'],
};

export function can(role, module) {
  if (role === 'superadmin') return true;
  return (PERMISSIONS[module] || []).includes(role);
}
