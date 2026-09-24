import { Router } from 'express';
import { z } from 'zod';
import { ChatConversation, User, Setting, Event } from '../models/index.js';
import { asyncHandler, AppError, paginate } from '../utils/http.js';
import { validate, chatLimiter, formLimiter, audit } from '../middleware/common.js';
import { protect, staffOnly, requireModule } from '../middleware/auth.js';
import { handleVisitorMessage, QUICK_OPTIONS, escalate } from '../services/chatbot.js';
import { upsertLead } from '../services/leads.js';
import { notifyRoles, notifyUser } from '../services/notify.js';
import { emit, emitAll } from '../realtime.js';

// Push the latest state of a conversation to everyone watching it (visitor + agents) — no refresh needed.
function sync(conv) {
  const id = String(conv._id);
  emit(`chat:${id}`, 'chat:sync', { id, messages: conv.messages, mode: conv.mode, status: conv.status });
  emit('agents', 'chat:list', { id });
}

const r = Router();
const AGENT_ROLES = ['superadmin', 'admin', 'chat_agent', 'sales'];

async function agentsOnline() {
  return User.countDocuments({ isOnlineForChat: true, active: true, role: { $in: AGENT_ROLES }, lastSeenAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } });
}

async function getVisitorConv(req) {
  const conv = await ChatConversation.findById(req.params.id);
  if (!conv || conv.visitorId !== (req.body?.visitorId || req.query.visitorId)) throw new AppError(404, 'Conversation not found');
  return conv;
}

// ---------------- Visitor (public) ----------------
r.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const s = await Setting.findOne({ key: 'site' }).lean();
    res.json({ online: (await agentsOnline()) > 0, chatbotEnabled: s?.chatbotEnabled !== false, quickOptions: QUICK_OPTIONS });
  })
);

r.post(
  '/start',
  chatLimiter,
  validate(z.object({ visitorId: z.string().min(8).max(64), page: z.string().max(300).optional() })),
  asyncHandler(async (req, res) => {
    let conv = await ChatConversation.findOne({ visitorId: req.body.visitorId, status: { $ne: 'closed' } }).sort('-createdAt');
    if (!conv) {
      const s = await Setting.findOne({ key: 'site' }).lean();
      conv = await ChatConversation.create({
        visitorId: req.body.visitorId,
        page: req.body.page,
        messages: [{ sender: 'bot', text: s?.chatbotGreeting || "Hi! 👋 I'm Zeviro's assistant. How can we help you grow today?" }],
      });
      await Event.create({ type: 'chat_open', path: req.body.page, visitorId: req.body.visitorId });
    }
    res.json({ id: conv._id, mode: conv.mode, status: conv.status, messages: conv.messages, quickOptions: QUICK_OPTIONS });
  })
);

r.post(
  '/:id/message',
  chatLimiter,
  validate(z.object({ visitorId: z.string().min(8).max(64), text: z.string().trim().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    const conv = await getVisitorConv(req);
    if (conv.status === 'closed') throw new AppError(409, 'This conversation was closed. Please refresh to start a new one.');
    const out = await handleVisitorMessage(conv, req.body.text);
    await conv.save();
    sync(conv);
    await Event.create({ type: 'chat_message', visitorId: conv.visitorId, meta: { mode: conv.mode } });
    if (conv.mode === 'human' && conv.assignedAgent && out.text === null) {
      await notifyUser(conv.assignedAgent, { type: 'chat_message', title: 'New chat message', body: req.body.text.slice(0, 140), link: `/admin/chats?c=${conv._id}` });
    }
    res.json({ reply: out, mode: conv.mode, status: conv.status, messages: conv.messages });
  })
);

r.get(
  '/:id/messages',
  asyncHandler(async (req, res) => {
    const conv = await getVisitorConv(req);
    const since = req.query.since ? new Date(req.query.since) : null;
    const messages = since ? conv.messages.filter((m) => m.createdAt > since) : conv.messages;
    res.json({ mode: conv.mode, status: conv.status, messages, online: (await agentsOnline()) > 0 });
  })
);

r.post(
  '/:id/escalate',
  chatLimiter,
  asyncHandler(async (req, res) => {
    const conv = await getVisitorConv(req);
    if (conv.status === 'closed') throw new AppError(409, 'This conversation was closed. Please refresh to start a new one.');
    if (conv.mode !== 'human') await escalate(conv, 'visitor button');
    await conv.save();
    sync(conv);
    res.json({ mode: conv.mode, status: conv.status, messages: conv.messages });
  })
);

// Offline inquiry form (when no agent is online)
r.post(
  '/offline',
  formLimiter,
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email(),
      message: z.string().trim().min(5).max(3000),
      conversationId: z.string().optional(),
      visitorId: z.string().optional(),
      company_website: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    if (req.body.company_website) return res.status(201).json({ ok: true });
    const { lead } = await upsertLead(
      { fullName: req.body.name, email: req.body.email, description: req.body.message, service: 'General inquiry' },
      { source: 'Offline Inquiry', notifyTitle: 'New offline chat inquiry' }
    );
    if (req.body.conversationId) {
      const conv = await ChatConversation.findById(req.body.conversationId);
      if (conv && conv.visitorId === req.body.visitorId) {
        conv.lead = lead._id;
        conv.visitorName = req.body.name;
        conv.visitorEmail = req.body.email;
        conv.messages.push({ sender: 'system', text: `Offline inquiry submitted by ${req.body.name} (${req.body.email}).` });
        await conv.save();
        sync(conv);
      }
    }
    res.status(201).json({ ok: true });
  })
);

// ---------------- Agents (staff) ----------------
const staff = Router();
staff.use(protect, staffOnly, requireModule('chats'));

staff.post(
  '/availability',
  asyncHandler(async (req, res) => {
    req.user.isOnlineForChat = !!req.body.online;
    req.user.lastSeenAt = new Date();
    await req.user.save();
    emitAll('chat:status', { online: (await agentsOnline()) > 0 });
    res.json({ online: req.user.isOnlineForChat });
  })
);

staff.get(
  '/',
  asyncHandler(async (req, res) => {
    // heartbeat for online status
    await User.updateOne({ _id: req.user._id }, { lastSeenAt: new Date() });
    const { page, limit, skip } = paginate(req);
    const q = {};
    if (req.query.status) q.status = req.query.status;
    if (req.query.mine === '1') q.assignedAgent = req.user._id;
    if (req.user.role === 'chat_agent' && req.query.all !== '1') q.$or = [{ assignedAgent: req.user._id }, { assignedAgent: null }];
    const [items, total, unanswered] = await Promise.all([
      ChatConversation.find(q).sort('-lastMessageAt').skip(skip).limit(limit).select('-messages').populate('assignedAgent', 'name').populate('lead', 'fullName leadId'),
      ChatConversation.countDocuments(q),
      ChatConversation.countDocuments({ status: 'escalated', unreadByAgent: { $gt: 0 } }),
    ]);
    res.json({ items, total, unanswered, online: req.user.isOnlineForChat });
  })
);

staff.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const conv = await ChatConversation.findById(req.params.id).populate('assignedAgent', 'name').populate('lead', 'fullName leadId status');
    if (!conv) throw new AppError(404, 'Conversation not found');
    if (conv.unreadByAgent) {
      conv.unreadByAgent = 0;
      await conv.save();
      sync(conv);
    }
    res.json(conv);
  })
);

staff.post(
  '/:id/reply',
  validate(z.object({ text: z.string().trim().min(1).max(3000) })),
  asyncHandler(async (req, res) => {
    const conv = await ChatConversation.findById(req.params.id);
    if (!conv) throw new AppError(404, 'Conversation not found');
    conv.mode = 'human';
    if (conv.status === 'open') conv.status = 'escalated';
    if (!conv.assignedAgent) conv.assignedAgent = req.user._id;
    conv.messages.push({ sender: 'agent', agent: req.user._id, agentName: req.user.name, agentTitle: req.user.title, agentAvatar: req.user.avatar, text: req.body.text });
    conv.lastMessageAt = new Date();
    conv.unreadByAgent = 0;
    await conv.save();
    sync(conv);
    res.json(conv);
  })
);

staff.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const conv = await ChatConversation.findById(req.params.id);
    if (!conv) throw new AppError(404, 'Conversation not found');
    const { status, assignedAgent, mode } = req.body;
    if (status) conv.status = status;
    if (mode) conv.mode = mode;
    if (assignedAgent !== undefined) {
      conv.assignedAgent = assignedAgent || null;
      if (assignedAgent)
        await notifyUser(assignedAgent, { type: 'chat_assigned', title: 'Chat assigned to you', body: `Conversation with ${conv.visitorName || 'visitor'}`, link: `/admin/chats?c=${conv._id}` });
    }
    if (status === 'closed') conv.messages.push({ sender: 'system', text: 'Conversation closed by agent.' });
    await conv.save();
    sync(conv);
    await audit(req, 'update', 'ChatConversation', conv._id, req.body);
    res.json(conv);
  })
);

staff.post(
  '/:id/convert',
  validate(z.object({ fullName: z.string().min(2), email: z.string().email(), company: z.string().optional(), service: z.string().optional(), phone: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const conv = await ChatConversation.findById(req.params.id);
    if (!conv) throw new AppError(404, 'Conversation not found');
    const transcript = conv.messages.map((m) => `[${m.sender}] ${m.text}`).join('\n').slice(0, 4500);
    const { lead, duplicate } = await upsertLead({ ...req.body, description: `Converted from live chat.\n\n${transcript}` }, { source: 'Live Chat', autoReply: false });
    conv.lead = lead._id;
    conv.visitorName = req.body.fullName;
    conv.visitorEmail = req.body.email;
    await conv.save();
    sync(conv);
    await audit(req, 'convert_chat', 'Lead', lead._id);
    res.json({ lead, duplicate });
  })
);

r.use('/admin', staff);

// Remind admins about unanswered escalated chats (called on an interval from index.js)
export async function checkUnansweredChats() {
  const stale = await ChatConversation.find({ status: 'escalated', unreadByAgent: { $gt: 0 }, lastMessageAt: { $lt: new Date(Date.now() - 5 * 60 * 1000), $gt: new Date(Date.now() - 6 * 60 * 1000) } }).select('_id visitorName');
  for (const c of stale)
    await notifyRoles(['admin', 'chat_agent'], { type: 'chat_unanswered', title: 'Unanswered chat (5+ min)', body: `${c.visitorName || 'A visitor'} is waiting for a reply.`, link: `/admin/chats?c=${c._id}` });
}

export default r;
