// Zeviro AI chatbot (Spec §6)
// - Answers ONLY from the approved knowledge base (FAQs + services + solutions + industries).
// - Optional LLM (Claude) rewriting, still grounded in the KB. Falls back to keyword retrieval.
// - Lead qualification flow → creates/updates CRM lead.
// - Escalates to a human when asked, or when confidence is low.
import { Faq, Service, Solution, Industry, User } from '../models/index.js';
import { upsertLead } from './leads.js';
import { notifyRoles } from './notify.js';
import { pricesVisible } from './pricing.js';

export const QUICK_OPTIONS = ['Web Development', 'B2B Lead Generation', 'Data Entry Services', 'Order a service', 'Talk to an Expert'];

const QUAL_STEPS = [
  { key: 'fullName', ask: "Great — let's get you a tailored plan. What's your name?" },
  { key: 'email', ask: 'Thanks {fullName}! What is your business email?', validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), error: 'That email looks off — could you double-check it?' },
  { key: 'company', ask: 'Which company are you with?' },
  { key: 'website', ask: "What's your company website? (type \"none\" if you don't have one yet)" },
  { key: 'service', ask: 'Which service do you need?', options: ['Web Development', 'Web & Mobile App Development', 'Web Design', 'Digital Marketing', 'B2B Lead Generation', 'Data Entry Services'] },
  { key: 'budget', ask: 'What budget range are you considering?', options: ['< $2k', '$2k – $5k', '$5k – $15k', '$15k – $50k', '$50k+', 'Not sure yet'] },
  { key: 'timeline', ask: 'And your ideal timeline?', options: ['ASAP', '1 – 3 months', '3 – 6 months', 'Just exploring'] },
];

const STOP = new Set('a an the is are do does can could would you your i we our us to of for and or in on with what how which who me my it be have has about at this that please tell offer offers provide need want get any there some like hi hello'.split(' '));
const tokens = (s = '') => s.toLowerCase().replace(/[^a-z0-9\s&/+-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w));

async function loadKB() {
  const [faqs, services, solutions, industries] = await Promise.all([
    Faq.find({ published: true, useInChatbot: true }).lean(),
    Service.find({ published: true }).lean(),
    Solution.find({ published: true }).lean(),
    Industry.find({ published: true }).lean(),
  ]);
  const showPrices = await pricesVisible();
  return [
    ...faqs.map((f) => ({ kind: 'faq', q: f.title, a: f.body, keys: [...(f.keywords || []), ...tokens(f.title)] })),
    ...services.map((s) => {
      const pk = (s.packages || []).map((p) => `${p.name}${p.title ? ` (${p.title})` : ''}: ${showPrices && p.price ? `$${p.price}` : 'price on request'}${p.deliveryDays ? `, ${p.deliveryDays}-day delivery` : ''}`);
      return { kind: 'service', q: s.title, a: `${s.excerpt || ''}${pk.length ? `\n\nPackages — ${pk.join(' · ')}. You can order online on the service page.` : ''}${s.features?.length ? `\n\nWhat's included: ${s.features.join(', ')}.` : ''}`, keys: [...tokens(s.title), ...(s.tags || [])], link: `/services/${s.slug}` };
    }),
    ...solutions.map((s) => ({ kind: 'solution', q: s.title, a: s.excerpt || '', keys: [...tokens(s.title), ...(s.tags || [])], link: `/solutions/${s.slug}` })),
    ...industries.map((s) => ({ kind: 'industry', q: s.title, a: s.excerpt || '', keys: [...tokens(s.title), ...(s.tags || [])], link: `/industries/${s.slug}` })),
  ];
}

function retrieve(kb, text) {
  const q = tokens(text).filter((w) => !/^\d+$/.test(w)); // numbers ("500 leads") carry no topic
  if (!q.length) return [];
  // IDF weighting: words that appear in many entries (e.g. "offer", "service") count less than specific ones ("refund")
  const N = kb.length;
  const df = Object.fromEntries(q.map((w) => [w, kb.filter((it) => it.keys.some((k) => k.toLowerCase().startsWith(w) || w.startsWith(k.toLowerCase())) || tokens(it.a).includes(w)).length]));
  const idf = (w) => Math.log(1 + N / (1 + df[w]));
  const totalIdf = q.reduce((sum, w) => sum + idf(w), 0) || 1;
  return kb
    .map((item) => {
      const keys = new Set(item.keys.map((k) => k.toLowerCase()));
      const body = tokens(item.a);
      let score = 0;
      for (const w of q) {
        let s = 0;
        if (keys.has(w)) s += 3;
        else if ([...keys].some((k) => k.startsWith(w) || w.startsWith(k))) s += 1.5;
        if (body.includes(w)) s += 0.5;
        score += s * idf(w);
      }
      return { item, score: score / totalIdf };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

async function llmAnswer(question, context) {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        max_tokens: 350,
        system:
          'You are the website assistant for Zeviro, a B2B technology and growth agency. Answer ONLY using the KNOWLEDGE provided. ' +
          'Be concise (max 90 words), friendly and professional. Never invent prices, clients, numbers or guarantees. ' +
          'If the knowledge does not contain the answer, reply with exactly: UNSURE',
        messages: [{ role: 'user', content: `KNOWLEDGE:\n${context}\n\nQUESTION: ${question}` }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text?.trim();
    if (!text || text.includes('UNSURE')) return 'UNSURE';
    return text;
  } catch {
    return null;
  }
}

const reply = (conv, text, extra = {}) => {
  conv.messages.push({ sender: 'bot', text, confidence: extra.confidence });
  return { text, quickReplies: extra.quickReplies || [], escalated: !!extra.escalated };
};

async function escalate(conv, reason) {
  conv.mode = 'human';
  conv.status = 'escalated';
  const online = await User.countDocuments({ isOnlineForChat: true, active: true, role: { $in: ['superadmin', 'admin', 'chat_agent', 'sales'] } });
  await notifyRoles(['admin', 'chat_agent'], {
    type: 'chat_escalation',
    title: 'Chat escalated to human',
    body: `A visitor needs help (${reason}). Conversation ${conv._id}`,
    link: `/admin/chats?c=${conv._id}`,
  });
  if (online > 0) return reply(conv, "I'm connecting you with a Zeviro specialist now — they'll reply here in a moment. 👋", { escalated: true });
  return reply(
    conv,
    "Our team is offline right now. Leave your name, email and question using the form below and we'll get back to you within one business day.",
    { escalated: true, quickReplies: ['__offline_form__'] }
  );
}

async function continueQualification(conv, text) {
  const q = conv.qualification;
  const idx = QUAL_STEPS.findIndex((s) => s.key === q.step);
  const step = QUAL_STEPS[idx];
  const value = text.trim();
  if (step.validate && !step.validate(value)) return reply(conv, step.error);
  q.data = { ...(q.data || {}), [step.key]: step.key === 'website' && /^none$/i.test(value) ? '' : value };
  conv.markModified('qualification');
  if (step.key === 'fullName') conv.visitorName = value;
  if (step.key === 'email') conv.visitorEmail = value.toLowerCase();

  const next = QUAL_STEPS[idx + 1];
  if (next) {
    q.step = next.key;
    return reply(conv, next.ask.replace('{fullName}', q.data.fullName?.split(' ')[0] || ''), { quickReplies: next.options });
  }
  // done → create or update CRM lead
  q.step = null;
  const { lead } = await upsertLead(
    { ...q.data, description: `Qualified via AI chatbot.\n\nTranscript excerpt:\n${conv.messages.slice(-6).map((m) => `${m.sender}: ${m.text}`).join('\n')}` },
    { source: 'AI Chatbot', status: 'Qualified', notifyTitle: 'New AI-qualified lead' }
  );
  conv.lead = lead._id;
  return reply(
    conv,
    `Thank you, ${q.data.fullName?.split(' ')[0]}! 🎉 Your request is with our team — expect a reply at ${q.data.email} within one business day. Want to lock in a time now?`,
    { quickReplies: ['Book a Discovery Call', 'Talk to an Expert'] }
  );
}

export async function handleVisitorMessage(conv, rawText) {
  const text = (rawText || '').toString().slice(0, 1000).trim();
  conv.messages.push({ sender: 'visitor', text });
  conv.lastMessageAt = new Date();

  // Human mode → just queue for the agent.
  if (conv.mode === 'human') {
    conv.unreadByAgent += 1;
    return { text: null, quickReplies: [], escalated: true };
  }

  if (conv.qualification?.step) return continueQualification(conv, text);

  const lower = text.toLowerCase();
  if (/\b(talk to (an )?(expert|human|person|agent|someone)|human|real person|live agent|speak to)\b/.test(lower)) return escalate(conv, 'visitor request');
  if (/book a discovery call|book a call|schedule|meeting/.test(lower))
    return reply(conv, 'You can pick a time that suits you on our booking page: /book-a-call — or I can collect your details and the team will reach out.', { quickReplies: ['Get a quote', 'Talk to an Expert'] });
  if (/\b(quote|estimate|start a project|hire|proposal|get started|work with you)\b/.test(lower)) {
    conv.qualification = { step: 'fullName', data: {} };
    conv.markModified('qualification');
    return reply(conv, QUAL_STEPS[0].ask);
  }

  const kb = await loadKB();
  const hits = retrieve(kb, text);
  const top = hits[0];
  const confidence = top ? Math.min(top.score / 3, 1) : 0;

  if (process.env.ANTHROPIC_API_KEY && hits.length) {
    const ctx = hits.slice(0, 5).map((h) => `Q/Topic: ${h.item.q}\nA: ${h.item.a}`).join('\n---\n');
    const ans = await llmAnswer(text, ctx);
    if (ans && ans !== 'UNSURE') return reply(conv, ans, { confidence: 0.9, quickReplies: ['Get a quote', 'Talk to an Expert'] });
    if (ans === 'UNSURE') return lowConfidence(conv);
  }

  if (top && confidence >= 0.4) {
    const more = top.item.link ? `\n\nMore details: ${top.item.link}` : '';
    return reply(conv, `${top.item.a.trim()}${more}`, { confidence, quickReplies: ['Get a quote', 'Talk to an Expert'] });
  }
  return lowConfidence(conv);
}

function lowConfidence(conv) {
  return reply(
    conv,
    "I'm not 100% sure about that one and I don't want to guess. Would you like me to connect you with a specialist, or collect your details for a tailored answer?",
    { confidence: 0.1, quickReplies: ['Talk to an Expert', 'Get a quote', ...QUICK_OPTIONS.slice(0, 3)] }
  );
}

export { escalate };
