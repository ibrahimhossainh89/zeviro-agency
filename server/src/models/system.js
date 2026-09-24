import mongoose from 'mongoose';

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    sender: { type: String, enum: ['visitor', 'bot', 'agent', 'system'], required: true },
    agent: { type: Schema.Types.ObjectId, ref: 'User' },
    agentName: String,
    agentTitle: String,
    agentAvatar: String,
    text: { type: String, required: true },
    confidence: Number,
  },
  { timestamps: true }
);

const chatConversationSchema = new Schema(
  {
    visitorId: { type: String, index: true, required: true },
    visitorName: String,
    visitorEmail: String,
    mode: { type: String, enum: ['bot', 'human'], default: 'bot' },
    status: { type: String, enum: ['open', 'escalated', 'closed'], default: 'open' },
    assignedAgent: { type: Schema.Types.ObjectId, ref: 'User' },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    qualification: {
      step: { type: String, default: null },
      data: { type: Schema.Types.Mixed, default: {} },
    },
    unreadByAgent: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
    messages: [chatMessageSchema],
    page: String,
  },
  { timestamps: true }
);
export const ChatConversation = mongoose.model('ChatConversation', chatConversationSchema);

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    type: String,
    title: String,
    body: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Notification = mongoose.model('Notification', notificationSchema);

// Key/value site settings (single document).
const settingSchema = new Schema(
  {
    key: { type: String, default: 'site', unique: true },
    siteName: { type: String, default: 'Zeviro' },
    tagline: String,
    contactEmail: String,
    contactPhone: String,
    address: String,
    socials: { linkedin: String, x: String, facebook: String, instagram: String, youtube: String, whatsapp: String, github: String },
    socialDefaultsApplied: { type: Boolean, default: false },
    stats: [{ label: String, value: String }], // trust signals — only truthful numbers!
    techStack: [String],
    calendlyUrl: String,
    liveChatEmbed: String, // optional third-party live chat script (Tawk/Crisp/etc.)
    gaMeasurementId: String,
    gtmId: String,
    autoReplyEnabled: { type: Boolean, default: true },
    chatbotEnabled: { type: Boolean, default: true },
    chatbotGreeting: String,
    maintenanceMode: { type: Boolean, default: false },
    allowedUploadTypes: [String],
    retentionDays: { type: Number, default: 365 },
    security: {
      loginVerification: { type: Boolean, default: true }, // send a one-time code (email or SMS) on every login
    },
    // Snapshots of the marketplace numbers, recorded each time they change (powers the live "growth" chart)
    statsHistory: [{ at: { type: Date, default: Date.now }, fiverrRating: Number, fiverrReviews: Number, upworkRating: Number, upworkJobs: Number }],
    // Online orders & payments (gateway is plugged in via server/src/services/payments.js)
    payments: {
      provider: { type: String, default: 'manual' }, // manual | stripe | paypal | sslcommerz | custom
      manualInstructions: String, // shown to clients when no gateway is connected (bank / Payoneer / Wise details)
      checkoutNote: String,
      invoiceDueDays: { type: Number, default: 3 },
      showPrices: { type: Boolean, default: false }, // false = packages show "Request price" and every order starts as a price request
    },
    // Marketplace profiles shown on the website (keep them in sync with your real profiles)
    marketplaces: {
      earnings: String, // e.g. "$160k+" — total earned from client work (shown as an animated stat)
      earningsLabel: String,
      fiverr: {
        url: String, username: String, displayName: String, level: String, badges: [String],
        rating: Number, reviews: Number, ordersCompleted: String, memberSince: String, responseTime: String, languages: [String],
        breakdown: { five: Number, four: Number, three: Number, two: Number, one: Number }, // star rating breakdown (chart)
        breakdownLabel: String,
      },
      upwork: {
        url: String, displayName: String, title: String, hourlyRate: Number, rating: Number, reviews: Number, jobs: Number, location: String,
      },
    },
  },
  { timestamps: true }
);
export const Setting = mongoose.model('Setting', settingSchema);

const auditLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    action: String,
    entity: String,
    entityId: String,
    meta: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true }
);
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// Lightweight analytics events (page views, form submits, chatbot usage)
const eventSchema = new Schema(
  {
    type: { type: String, index: true }, // pageview | form_submit | chat_open | chat_message | cta_click
    path: String,
    referrer: String,
    source: String, // utm_source or referrer host
    meta: Schema.Types.Mixed,
    visitorId: String,
  },
  { timestamps: true }
);
export const Event = mongoose.model('Event', eventSchema);
