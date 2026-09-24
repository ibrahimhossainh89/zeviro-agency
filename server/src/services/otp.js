// One-time verification codes for sign-up (email), login (email or SMS) and phone verification.
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { User, Setting } from '../models/index.js';
import { AppError, esc } from '../utils/http.js';
import { sendEmail } from './notify.js';
import { sendSms } from './sms.js';

const TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 45;

const hash = (userId, code) => crypto.createHash('sha256').update(`${userId}:${code}:${process.env.JWT_SECRET}`).digest('hex');

export const maskEmail = (e = '') => e.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c);
export const maskPhone = (p = '') => (p.length > 4 ? `${p.slice(0, 3)}${'•'.repeat(Math.max(p.length - 6, 2))}${p.slice(-3)}` : p);
export const normalizePhone = (p = '') => {
  const d = String(p).replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return d;
  if (/^01\d{9}$/.test(d)) return `+88${d}`; // Bangladeshi mobile without country code
  return `+${d}`;
};

/** Short-lived ticket that identifies a pending verification (no session is created until the code is correct). */
export const makeTicket = (user, purpose, extra = {}) => jwt.sign({ sub: String(user._id), typ: 'otp', purpose, ...extra }, process.env.JWT_SECRET, { expiresIn: '20m' });
export function readTicket(ticket) {
  try {
    const p = jwt.verify(ticket, process.env.JWT_SECRET);
    if (p.typ !== 'otp') throw new Error('bad');
    return p;
  } catch {
    throw new AppError(401, 'This verification has expired. Please start again.');
  }
}

export async function loginVerificationEnabled() {
  const s = await Setting.findOne({ key: 'site' }).select('security').lean();
  return s?.security?.loginVerification !== false;
}

/** Create + send a code. channel: 'email' | 'sms' */
export async function sendCode(userId, { purpose, channel = 'email', phone } = {}) {
  const user = await User.findById(userId).select('+otp');
  if (!user) throw new AppError(404, 'Account not found');
  if (user.otp?.sentAt && Date.now() - new Date(user.otp.sentAt).getTime() < RESEND_SECONDS * 1000 && user.otp.purpose === purpose && user.otp.channel === channel)
    throw new AppError(429, `Please wait ${RESEND_SECONDS} seconds before requesting another code.`);
  const target = channel === 'sms' ? normalizePhone(phone || user.phone) : user.email;
  if (channel === 'sms' && !/^\+\d{8,15}$/.test(target)) throw new AppError(422, 'Please add a valid mobile number (with country code) first.');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.otp = { hash: hash(user._id, code), purpose, channel, target, expires: new Date(Date.now() + TTL_MIN * 60000), attempts: 0, sentAt: new Date() };
  await user.save();
  const what = { signup: 'confirm your email address', login: 'finish signing in', phone: 'verify your phone number' }[purpose] || 'continue';
  if (channel === 'sms') {
    const ok = await sendSms(target, `Your Zeviro code is ${code}. It expires in ${TTL_MIN} minutes. Never share this code.`);
    if (!ok) throw new AppError(502, "We couldn't send the SMS right now. Please use email instead.");
  } else {
    await sendEmail({
      to: target,
      subject: `${code} is your Zeviro verification code`,
      html: `Hi ${esc(user.name.split(' ')[0])},<br/><br/>Use this code to ${what}:<br/><div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#fff;background:#1b1b2c;border:1px solid #2a2a40;border-radius:12px;padding:14px 18px;margin:16px 0;display:inline-block">${code}</div><br/>The code expires in ${TTL_MIN} minutes. If you didn't try to ${what}, you can ignore this email — and consider changing your password.`,
    });
    if (!process.env.SMTP_HOST) console.log(`[otp:dev] ${purpose} code for ${target}: ${code}`);
  }
  return { channel, to: channel === 'sms' ? maskPhone(target) : maskEmail(target), resendIn: RESEND_SECONDS };
}

/** Check a code. Returns the user (with the verified channel marked). */
export async function checkCode(userId, code, purpose) {
  const user = await User.findById(userId).select('+otp');
  const o = user?.otp;
  if (!o?.hash || o.purpose !== purpose) throw new AppError(400, 'Please request a new code.');
  if (new Date(o.expires) < new Date()) throw new AppError(400, 'This code has expired. Please request a new one.');
  if ((o.attempts || 0) >= MAX_ATTEMPTS) throw new AppError(429, 'Too many wrong codes. Please request a new one.');
  const ok = crypto.timingSafeEqual(Buffer.from(hash(user._id, String(code).trim())), Buffer.from(o.hash));
  if (!ok) {
    user.otp.attempts = (o.attempts || 0) + 1;
    await user.save();
    throw new AppError(400, `That code isn't right. ${MAX_ATTEMPTS - user.otp.attempts} attempt(s) left.`);
  }
  if (o.channel === 'email' && o.target === user.email) {
    user.emailVerified = true;
    user.emailVerifiedAt = user.emailVerifiedAt || new Date();
  }
  if (o.channel === 'sms') {
    user.phone = o.target;
    user.phoneVerified = true;
    user.phoneVerifiedAt = new Date();
  }
  user.otp = undefined;
  await user.save();
  return user;
}
