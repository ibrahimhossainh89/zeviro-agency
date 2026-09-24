import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Meeting Booked',
  'Proposal Sent',
  'Won',
  'Lost',
];
export const LEAD_SOURCES = ['Website', 'AI Chatbot', 'Live Chat', 'Book a Call', 'Referral', 'Offline Inquiry', 'Manual', 'Other'];

const activitySchema = new Schema(
  {
    type: { type: String, default: 'note' }, // note | status | assign | email | call | system
    text: String,
    by: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

let counter = 0;
const leadSchema = new Schema(
  {
    leadId: { type: String, unique: true },
    fullName: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    website: String,
    domain: String, // normalized website domain for duplicate detection
    country: String,
    industry: String,
    service: String,
    budget: String,
    timeline: String,
    description: String,
    leadSource: { type: String, default: 'Website' }, // how they heard about us (form field)
    source: { type: String, enum: LEAD_SOURCES, default: 'Website' }, // channel
    status: { type: String, enum: LEAD_STATUSES, default: 'New' },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    followUpDate: Date,
    tags: [String],
    isDuplicateOf: { type: Schema.Types.ObjectId, ref: 'Lead' },
    duplicateCount: { type: Number, default: 0 },
    activities: [activitySchema],
    convertedClient: { type: Schema.Types.ObjectId, ref: 'Client' },
    meta: { ip: String, userAgent: String, page: String, utm: Schema.Types.Mixed },
  },
  { timestamps: true }
);

leadSchema.index({ email: 1 });
leadSchema.index({ domain: 1 });
leadSchema.index({ status: 1, createdAt: -1 });

leadSchema.pre('save', async function genId(next) {
  if (this.leadId) return next();
  counter = (counter + 1) % 1296;
  this.leadId = `ZL-${Date.now().toString(36).toUpperCase()}${counter.toString(36).toUpperCase().padStart(2, '0')}`;
  next();
});

export const Lead = mongoose.model('Lead', leadSchema);

const clientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // company name
    website: String,
    industry: String,
    country: String,
    address: String,
    logo: String,
    primaryContact: { name: String, email: String, phone: String },
    contacts: [{ name: String, email: String, phone: String, role: String }],
    status: { type: String, enum: ['active', 'suspended', 'archived'], default: 'active' },
    accountManager: { type: Schema.Types.ObjectId, ref: 'User' },
    fromLead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    notes: String,
    signupSource: String, // 'Website' | 'Android app' when the client registered themselves
    marketingOptIn: { type: Boolean, default: false },
    termsAcceptedAt: Date,
  },
  { timestamps: true }
);
export const Client = mongoose.model('Client', clientSchema);

const appointmentSchema = new Schema(
  {
    title: { type: String, default: 'Discovery Call' },
    name: String,
    email: String,
    company: String,
    phone: String,
    client: { type: Schema.Types.ObjectId, ref: 'Client' },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    project: { type: Schema.Types.ObjectId, ref: 'Project' },
    startsAt: { type: Date, required: true },
    durationMin: { type: Number, default: 30 },
    timezone: String,
    meetingLink: String,
    agenda: String,
    status: { type: String, enum: ['Requested', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'], default: 'Requested' },
    host: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Appointment = mongoose.model('Appointment', appointmentSchema);
