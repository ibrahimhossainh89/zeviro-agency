import { Router } from 'express';
import crypto from 'crypto';
import { sendEmail } from '../services/notify.js';
import { z } from 'zod';
import { User, Client, Lead } from '../models/index.js';
import { PORTAL_ROLES, portalFromRequest, portalUrlFor } from '../config/portals.js';
import { notifyRoles } from '../services/notify.js';
import { esc } from '../utils/http.js';
import { makeTicket, readTicket, sendCode, checkCode, loginVerificationEnabled } from '../services/otp.js';
import { asyncHandler, AppError } from '../utils/http.js';
import { protect, signToken, setAuthCookie, COOKIE_NAME } from '../middleware/auth.js';
import { validate, authLimiter, audit, UPLOAD_DIR } from '../middleware/common.js';
import multer from 'multer';
import { mirrorDiskStorage, removeUpload } from '../services/uploadMirror.js';
import path from 'path';
import fs from 'fs';

// ---------- profile photos ----------
export const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
fs.mkdirSync(AVATAR_DIR, { recursive: true });
const AVATAR_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const avatarUpload = multer({
  storage: mirrorDiskStorage({
    destination: AVATAR_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + AVATAR_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (AVATAR_TYPES[file.mimetype] ? cb(null, true) : cb(new AppError(415, 'Please upload a JPG, PNG, WEBP or GIF image'))),
});
function removeOldAvatar(url) {
  if (!url || !url.startsWith('/api/v1/avatars/')) return;
  removeUpload(path.join(AVATAR_DIR, path.basename(url)));
}

const r = Router();

r.post(
  '/login',
  authLimiter,
  validate(z.object({ email: z.string().email(), password: z.string().min(1), portal: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) throw new AppError(401, 'Invalid email or password');
    if (!user.active) throw new AppError(403, 'Your account has been deactivated');
    // Each login page only accepts its own kind of account
    const portal = portalFromRequest(req);
    if (!PORTAL_ROLES[portal].includes(user.role)) {
      const where = portalUrlFor(user.role);
      throw new AppError(403, user.role === 'client' ? `This login is for the Zeviro ${portal === 'admin' ? 'administrator' : 'team'}. Clients sign in at ${where}` : `This account can't sign in here. Please use ${where}`);
    }
    // Step 2: one-time code by email (or SMS). Always required until the email address is verified.
    if (!user.emailVerified || (await loginVerificationEnabled())) {
      const sent = await sendCode(user._id, { purpose: 'login', channel: 'email' }).catch((e) => {
        if (e.status === 429) return { channel: 'email', to: null, resendIn: 45, reused: true }; // a code was just sent — keep using it
        throw e;
      });
      return res.json({ verify: { ticket: makeTicket(user, 'login', { portal }), purpose: 'login', ...sent, canUseSms: !!user.phone } });
    }
    res.json(await completeLogin(req, res, user, portal));
  })
);

async function completeLogin(req, res, user, portal) {
  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken(user);
  setAuthCookie(res, token);
  req.user = user;
  await audit(req, 'login', 'User', user._id, { portal });
  return { user: user.toSafeJSON(), token };
}

// Enter the 6-digit code (sign-up or login) → the session starts only now
r.post(
  '/verify',
  authLimiter,
  validate(z.object({ ticket: z.string().min(20), code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') })),
  asyncHandler(async (req, res) => {
    const t = readTicket(req.body.ticket);
    const user = await checkCode(t.sub, req.body.code, t.purpose);
    if (!user.active) throw new AppError(403, 'Your account has been deactivated');
    const portal = t.portal || portalFromRequest(req);
    if (!PORTAL_ROLES[portal]?.includes(user.role)) throw new AppError(403, 'This account cannot sign in here.');
    const out = await completeLogin(req, res, user, portal);
    if (t.purpose === 'signup') {
      const site = (process.env.SITE_URL || 'https://zeviro.agency').replace(/\/$/, '');
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Zeviro — your client account is ready',
        html: `Hi ${esc(user.name.split(' ')[0])},<br/><br/>Your email is confirmed and your client account is ready. From your portal you can order services, follow project progress, share files, message our team and pay invoices.<br/><br/><a href="${site}/portal">Open your client portal</a><br/><br/>— The Zeviro Team`,
      });
    }
    res.json(out);
  })
);

// Send the code again, or send it by SMS instead of email
r.post(
  '/verify/resend',
  authLimiter,
  validate(z.object({ ticket: z.string().min(20), channel: z.enum(['email', 'sms']).default('email') })),
  asyncHandler(async (req, res) => {
    const t = readTicket(req.body.ticket);
    if (t.purpose === 'signup' && req.body.channel !== 'email') throw new AppError(422, 'Please confirm your email address to finish signing up.');
    res.json(await sendCode(t.sub, { purpose: t.purpose, channel: req.body.channel }));
  })
);

// ---------- Client self-registration (public website + app) ----------
const strongPw = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/[0-9]/, 'Password needs a number');

r.post(
  '/register',
  authLimiter,
  validate(
    z.object({
      name: z.string().trim().min(2, 'Please enter your full name').max(80),
      email: z.string().trim().toLowerCase().email('Please enter a valid email'),
      password: strongPw,
      company: z.string().trim().max(120).optional().default(''),
      country: z.string().trim().max(80).optional().default(''),
      phone: z.string().trim().max(40).optional().default(''),
      website: z.string().trim().max(200).optional().default(''),
      acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Terms and Privacy Policy' }) }),
      marketingOptIn: z.boolean().optional().default(false),
      company_website: z.string().optional(), // honeypot
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.company_website) return res.status(201).json({ ok: true });
    const { name, email, password, company, country, phone, website, marketingOptIn } = req.body;
    if (await User.exists({ email })) throw new AppError(409, 'An account with this email already exists. Please log in or reset your password.');
    const client = await Client.create({
      name: company || name,
      website,
      country,
      primaryContact: { name, email, phone },
      contacts: [{ name, email, phone, role: 'Account owner' }],
      notes: `Self-registered on the website${marketingOptIn ? ' · opted in to updates' : ''}`,
      signupSource: portalFromRequest(req) === 'app' ? 'Android app' : 'Website',
      marketingOptIn,
      termsAcceptedAt: new Date(),
    });
    const user = await User.create({ name, email, password, phone, role: 'client', client: client._id });
    // link an existing lead with the same email, if any
    await Lead.updateMany({ email, convertedClient: { $exists: false } }, { convertedClient: client._id, $push: { activities: { type: 'system', text: 'Lead created a client account' } } }).catch(() => {});
    req.user = user;
    await audit(req, 'register', 'User', user._id);
    await notifyRoles(['admin', 'sales'], {
      type: 'client_signup',
      title: `New client account: ${name}`,
      body: `${esc(name)}${company ? ` (${esc(company)})` : ''} just created an account.`,
      link: `/admin/clients/${client._id}`,
    });
    // Email verification: the account can only be used after entering the code we send
    const sent = await sendCode(user._id, { purpose: 'signup', channel: 'email' });
    res.status(201).json({ verify: { ticket: makeTicket(user, 'signup', { portal: portalFromRequest(req) === 'app' ? 'app' : 'client' }), purpose: 'signup', ...sent, canUseSms: false } });
  })
);

r.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

r.get('/me', protect, (req, res) => res.json({ user: req.user.toSafeJSON() }));

// ---------- Phone verification (enables SMS codes at login) ----------
r.post(
  '/me/phone/send',
  protect,
  authLimiter,
  validate(z.object({ phone: z.string().trim().min(6).max(30) })),
  asyncHandler(async (req, res) => res.json(await sendCode(req.user._id, { purpose: 'phone', channel: 'sms', phone: req.body.phone })))
);
r.post(
  '/me/phone/verify',
  protect,
  authLimiter,
  validate(z.object({ code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code') })),
  asyncHandler(async (req, res) => {
    const user = await checkCode(req.user._id, req.body.code, 'phone');
    await audit(req, 'verify_phone', 'User', user._id);
    res.json({ user: user.toSafeJSON() });
  })
);

r.patch(
  '/me',
  protect,
  validate(
    z.object({
      name: z.string().min(2).max(80).optional(),
      phone: z.string().max(40).optional(),
      title: z.string().max(80).optional(),
      avatar: z.string().max(500).refine((v) => !v || v.startsWith('/api/v1/avatars/') || v.startsWith('https://'), 'Invalid image URL').optional(),
      notificationPrefs: z.record(z.boolean()).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.phone !== undefined && req.body.phone !== req.user.phone) req.user.phoneVerified = false;
    req.user.set(req.body);
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  })
);

r.post(
  '/me/avatar',
  protect,
  avatarUpload.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'No image uploaded');
    removeOldAvatar(req.user.avatar);
    req.user.avatar = `/api/v1/avatars/${req.file.filename}`;
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  })
);

r.delete(
  '/me/avatar',
  protect,
  asyncHandler(async (req, res) => {
    removeOldAvatar(req.user.avatar);
    req.user.avatar = undefined;
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  })
);

r.post(
  '/change-password',
  protect,
  authLimiter,
  validate(
    z.object({
      currentPassword: z.string().min(1),
      newPassword: z
        .string()
        .min(8, 'At least 8 characters')
        .regex(/[A-Z]/, 'Needs an uppercase letter')
        .regex(/[0-9]/, 'Needs a number'),
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(req.body.currentPassword))) throw new AppError(400, 'Current password is incorrect');
    user.password = req.body.newPassword;
    await user.save();
    await audit(req, 'change_password', 'User', user._id);
    res.json({ ok: true });
  })
);

// ---------- Password reset ----------
const strongPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/[0-9]/, 'Needs a number');

r.post(
  '/forgot-password',
  authLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email.toLowerCase(), active: true });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
      user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      // send each user back to their own portal (website / team / admin)
      const link = `${portalUrlFor(user.role).replace(/\/login$/, '')}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
      await sendEmail({ to: user.email, subject: 'Reset your Zeviro password', html: `Click the link below to set a new password (valid for 1 hour):<br/><br/><a href="${link}">${link}</a><br/><br/>If you didn't request this, you can ignore this email.` });
    }
    // Always respond the same way to avoid account enumeration
    res.json({ ok: true });
  })
);

r.post(
  '/reset-password',
  authLimiter,
  validate(z.object({ email: z.string().email(), token: z.string().min(32), password: strongPassword })),
  asyncHandler(async (req, res) => {
    const hash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({ email: req.body.email.toLowerCase(), resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpires');
    if (!user) throw new AppError(400, 'This reset link is invalid or has expired');
    user.password = req.body.password;
    user.emailVerified = true; // the reset link proved access to the inbox
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    req.user = user;
    await audit(req, 'reset_password', 'User', user._id);
    res.json({ ok: true });
  })
);

export default r;
