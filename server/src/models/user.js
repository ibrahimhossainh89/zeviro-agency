import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../config/permissions.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false, minlength: 8 },
    role: { type: String, enum: ROLES, default: 'client' },
    client: { type: Schema.Types.ObjectId, ref: 'Client' }, // only for role=client
    title: String,
    phone: String,
    avatar: String,
    active: { type: Boolean, default: true },
    isOnlineForChat: { type: Boolean, default: false },
    lastSeenAt: Date,
    lastLoginAt: Date,
    resetTokenHash: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: Date,
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: Date,
    // one-time verification code (sign-up, login, phone) — stored hashed
    otp: {
      type: { hash: String, purpose: String, channel: String, target: String, expires: Date, attempts: Number, sentAt: Date },
      select: false,
    },
    notificationPrefs: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      invoices: { type: Boolean, default: true },
      projects: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hash(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function compare(pw) {
  return bcrypt.compare(pw, this.password);
};

userSchema.methods.toSafeJSON = function safe() {
  const o = this.toObject();
  delete o.password;
  delete o.resetTokenHash;
  delete o.resetTokenExpires;
  delete o.otp;
  return o;
};

export const User = mongoose.model('User', userSchema);
