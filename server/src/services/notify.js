import nodemailer from 'nodemailer';
import { Notification, User } from '../models/index.js';
import { esc } from '../utils/http.js';
import { emit } from '../realtime.js';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

const SITE = (process.env.SITE_URL || 'https://zeviro.agency').replace(/\/$/, '');
const wrap = (title, body) => `
<div style="font-family:Inter,Arial,sans-serif;background:#0b0b14;padding:32px">
  <div style="max-width:560px;margin:auto;background:#12121f;border:1px solid #26263a;border-radius:14px;padding:28px;color:#e5e7eb">
    <table role="presentation" style="margin-bottom:18px"><tr><td><img src="${SITE}/brand/zeviro-icon-64.png" width="36" height="36" alt="Zeviro" style="display:block;border-radius:9px"/></td><td style="padding-left:10px"><div style="font-weight:800;font-size:18px;color:#fff;line-height:1">Zeviro</div><div style="font-size:9px;letter-spacing:3px;color:#a78bfa;margin-top:3px">AGENCY</div></td></tr></table>
    <h2 style="color:#fff;font-size:18px;margin:0 0 12px">${esc(title)}</h2>
    <div style="font-size:14px;line-height:1.6;color:#cbd5e1">${body}</div>
  </div>
</div>`;

// Emails are sent in the background: API responses never wait for (or fail because of) SMTP.
export function sendEmail({ to, subject, html, text }) {
  if (!to) return Promise.resolve();
  const payload = { from: process.env.MAIL_FROM || 'Zeviro <no-reply@zeviro.agency>', to, subject, html: wrap(subject, html || text), text };
  if (!transporter) {
    console.log(`[email:dev] to=${to} subject="${subject}" (SMTP not configured — not sent)`);
    return Promise.resolve();
  }
  transporter
    .sendMail(payload)
    .then(() => console.log(`[email] sent to=${to} subject="${subject}"`))
    .catch((e) => console.error(`[email] FAILED to=${to}: ${e.message}`));
  return Promise.resolve();
}

// In-app notification (+ optional email) for a specific user.
export async function notifyUser(userId, { type, title, body, link, email = false }) {
  if (!userId) return;
  try {
    await notifyUserUnsafe(userId, { type, title, body, link, email });
  } catch (e) {
    console.error('[notify] failed:', e.message); // notifications must never break the main action
  }
}

async function notifyUserUnsafe(userId, { type, title, body, link, email }) {
  const user = await User.findById(userId);
  if (!user) return;
  if (user.notificationPrefs?.inApp !== false) {
    const n = await Notification.create({ user: user._id, type, title, body, link });
    emit(`user:${user._id}`, 'notification:new', n);
  }
  if (email && user.notificationPrefs?.email !== false) await sendEmail({ to: user.email, subject: title, html: body });
}

// Notify every staff member with one of these roles (superadmin always included).
export async function notifyRoles(roles, payload) {
  const users = await User.find({ role: { $in: ['superadmin', ...roles] }, active: true }).select('_id');
  await Promise.all(users.map((u) => notifyUser(u._id, { ...payload, email: false })));
  if (payload.email && process.env.ADMIN_NOTIFY_EMAIL)
    await sendEmail({ to: process.env.ADMIN_NOTIFY_EMAIL, subject: payload.title, html: payload.body });
}
