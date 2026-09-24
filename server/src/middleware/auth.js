import jwt from 'jsonwebtoken';
import { User, Client } from '../models/index.js';
import { AppError, asyncHandler } from '../utils/http.js';
import { can, STAFF_ROLES } from '../config/permissions.js';

export const COOKIE_NAME = 'zv_token';

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function readToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Attaches req.user when a valid token exists (does not fail otherwise).
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (user && user.active) req.user = user;
  } catch {
    /* ignore invalid token */
  }
  next();
});

export const protect = asyncHandler(async (req, _res, next) => {
  const token = readToken(req);
  if (!token) throw new AppError(401, 'Authentication required');
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'Session expired, please log in again');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new AppError(401, 'Account inactive or not found');
  if (user.role === 'client') {
    const client = await Client.findById(user.client);
    if (!client || client.status !== 'active') throw new AppError(403, 'Client access is suspended. Please contact Zeviro.');
    req.clientId = client._id;
  }
  req.user = user;
  next();
});

export const staffOnly = (req, _res, next) => {
  if (!STAFF_ROLES.includes(req.user?.role)) return next(new AppError(403, 'Staff access only'));
  next();
};

export const clientOnly = (req, _res, next) => {
  if (req.user?.role !== 'client' || !req.clientId) return next(new AppError(403, 'Client portal access only'));
  next();
};

export const requireModule = (module) => (req, _res, next) => {
  if (!req.user || !can(req.user.role, module)) return next(new AppError(403, `You don't have access to ${module}`));
  next();
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || (req.user.role !== 'superadmin' && !roles.includes(req.user.role)))
    return next(new AppError(403, 'Insufficient permissions'));
  next();
};

// Project/Developer roles only see projects they manage or are on the team of.
export function projectScope(user) {
  if (['superadmin', 'admin', 'sales'].includes(user.role)) return {};
  return { $or: [{ manager: user._id }, { team: user._id }] };
}
