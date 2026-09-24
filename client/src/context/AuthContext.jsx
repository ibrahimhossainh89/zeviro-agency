import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/http';
import { reconnectSocket } from '../lib/realtime';

const AuthCtx = createContext(null);

export const STAFF_ROLES = ['superadmin', 'admin', 'sales', 'pm', 'developer', 'chat_agent', 'content_manager'];

// Mirrors server/src/config/permissions.js for UI visibility (server is the real gatekeeper)
const PERMS = {
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
  users: [],
  reports: ['admin', 'sales'],
  settings: [],
  audit: ['admin'],
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  // Returns { verify } when a one-time code is required, otherwise the signed-in user
  const login = async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    if (d.verify) return { verify: d.verify };
    setUser(d.user);
    reconnectSocket();
    return d.user;
  };
  const verifyCode = async (ticket, code) => {
    const d = await api.post('/auth/verify', { ticket, code });
    setUser(d.user);
    reconnectSocket();
    return d.user;
  };
  const register = async (data) => {
    const d = await api.post('/auth/register', data);
    return { verify: d.verify };
  };
  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    reconnectSocket();
  };
  const can = (module) => !!user && (user.role === 'superadmin' || (PERMS[module] || []).includes(user.role));
  const isStaff = !!user && STAFF_ROLES.includes(user.role);

  return <AuthCtx.Provider value={{ user, setUser, ready, login, register, verifyCode, logout, can, isStaff }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
