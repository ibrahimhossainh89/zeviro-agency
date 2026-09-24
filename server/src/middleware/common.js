import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { AppError } from '../utils/http.js';
import { AuditLog } from '../models/index.js';
import { mirrorDiskStorage } from '../services/uploadMirror.js';

// ---------- validation (zod) ----------
export const validate = (schema, where = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[where]);
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new AppError(422, 'Validation failed', details));
  }
  req[where] = r.data;
  next();
};

// ---------- rate limiters ----------
export const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.API_RATE_LIMIT) || 1200, standardHeaders: true, legacyHeaders: false });
export const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { message: 'Too many attempts, try again later' } });
export const formLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 15, message: { message: 'Too many submissions, try again later' } });
export const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 40, message: { message: 'Slow down a little 🙂' } });

// ---------- uploads ----------
export const UPLOAD_DIR = path.resolve('uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
export const MEDIA_DIR = path.join(UPLOAD_DIR, 'media'); // public CMS images
fs.mkdirSync(MEDIA_DIR, { recursive: true });

const ALLOWED = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/figma': '.fig',
};

export const upload = multer({
  storage: mirrorDiskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex') + (ALLOWED[file.mimetype] || '')),
  }),
  limits: { fileSize: (parseInt(process.env.MAX_UPLOAD_MB, 10) || 15) * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new AppError(415, `File type not allowed: ${file.mimetype}`));
    cb(null, true);
  },
});

// ---------- audit ----------
export async function audit(req, action, entity, entityId, meta) {
  try {
    await AuditLog.create({ user: req.user?._id, action, entity, entityId: entityId?.toString(), meta, ip: req.ip });
  } catch (e) {
    console.error('[audit] failed', e.message);
  }
}

// ---------- errors ----------
export function notFound(req, _res, next) {
  next(new AppError(404, `Not found: ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.name === 'ValidationError') {
    status = 422;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid id';
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'File too large';
  }
  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);
  res.status(status).json({ message, details: err.details });
}
