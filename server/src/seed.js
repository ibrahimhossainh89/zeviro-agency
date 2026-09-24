// Seeds the database with Zeviro's real website content.
//
//   npm run seed                      fill empty collections with real content + create the super admin
//   npm run seed -- --refresh-content replace ALL website content (services, portfolio, policies…) with the latest
//                                     version from src/content/ (your own CMS edits to those collections are replaced)
//   npm run seed -- --remove-demo     delete the old demo users, demo client (Acme) and demo leads
//   npm run seed:real                 = --refresh-content --remove-demo (recommended once after upgrading)
//   npm run seed -- --demo            add demo team users + demo client/project data (local testing only)
//   npm run seed -- --reset           wipe the whole database first (development only!)
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import {
  User, Client, Lead, Project, Task, Proposal, Invoice, Appointment, Ticket, Message, File, Order, Notification,
  Service, Solution, Industry, CaseStudy, BlogPost, BlogCategory, Faq, Testimonial, TeamMember, Gig, Policy, Setting,
} from './models/index.js';
import { services } from './content/services.js';
import { siteSettings, solutions, industries, team, faqs } from './content/company.js';
import { portfolio, gigs, reviews } from './content/portfolio.js';
import { blog, blogCategories } from './content/blog.js';
import { policies } from './content/policies.js';

const args = process.argv.slice(2);
const reset = args.includes('--reset');
const refresh = args.includes('--refresh-content');
const removeDemo = args.includes('--remove-demo');
const withDemo = args.includes('--demo');
const days = (n) => new Date(Date.now() + n * 864e5);

const CONTENT = [
  [Service, services.map((s, i) => ({ ...s, order: i }))],
  [Solution, solutions],
  [Industry, industries],
  [CaseStudy, portfolio],
  [BlogCategory, blogCategories.map((title, i) => ({ title, order: i }))],
  [BlogPost, blog],
  [Faq, faqs],
  [Testimonial, reviews],
  [TeamMember, team],
  [Gig, gigs],
  [Policy, policies],
];

async function fill(Model, docs) {
  if (refresh) await Model.deleteMany({});
  else if ((await Model.countDocuments()) > 0) return console.log(`  · ${Model.modelName}: exists, skipped`);
  for (const d of docs) await Model.create(d); // create() so slug hooks run
  console.log(`  ✓ ${Model.modelName}: ${docs.length}`);
}

const PLACEHOLDER_SOCIALS = ['https://www.linkedin.com/company/zeviro', 'https://x.com/zeviro', 'https://www.facebook.com/zeviro', 'https://www.instagram.com/zeviro'];
const DEMO_STAFF = ['sales@zeviro.agency', 'pm@zeviro.agency', 'dev@zeviro.agency', 'agent@zeviro.agency', 'content@zeviro.agency'];

async function seedSettings() {
  let st = await Setting.findOne({ key: 'site' });
  if (!st) {
    st = await Setting.create({ key: 'site', ...siteSettings, socialDefaultsApplied: true, statsHistory: [{ at: new Date(), fiverrRating: siteSettings.marketplaces.fiverr.rating, fiverrReviews: siteSettings.marketplaces.fiverr.reviews, upworkRating: siteSettings.marketplaces.upwork.rating, upworkJobs: siteSettings.marketplaces.upwork.jobs }] });
    return console.log('  ✓ settings');
  }
  if (!refresh) return console.log('  · settings: exist, skipped');
  // refresh the content-type settings but keep anything you configured yourself
  st.tagline = siteSettings.tagline;
  st.stats = siteSettings.stats;
  st.techStack = siteSettings.techStack;
  st.chatbotGreeting = siteSettings.chatbotGreeting;
  st.marketplaces = siteSettings.marketplaces;
  if (st.payments?.showPrices === undefined) st.payments = { ...(st.payments?.toObject?.() || st.payments || {}), showPrices: false };
  if (!st.statsHistory?.length) st.statsHistory = [{ at: new Date(), fiverrRating: siteSettings.marketplaces.fiverr.rating, fiverrReviews: siteSettings.marketplaces.fiverr.reviews, upworkRating: siteSettings.marketplaces.upwork.rating, upworkJobs: siteSettings.marketplaces.upwork.jobs }];
  if (!st.contactEmail) st.contactEmail = siteSettings.contactEmail;
  if (!st.address || /Dhaka, Bangladesh · Serving clients worldwide/.test(st.address)) st.address = siteSettings.address;
  if (st.contactPhone === '+880 1XXX-XXXXXX') st.contactPhone = '';
  if (!st.payments?.manualInstructions) st.payments = { ...(st.payments?.toObject?.() || st.payments || {}), ...siteSettings.payments };
  const socials = st.socials?.toObject ? st.socials.toObject() : st.socials || {};
  for (const [k, v] of Object.entries(socials)) if (PLACEHOLDER_SOCIALS.includes(v)) socials[k] = '';
  st.socials = socials;
  st.socialDefaultsApplied = true;
  await st.save();
  console.log('  ✓ settings refreshed (your own contact details, integrations and social links were kept)');
}

async function removeDemoData() {
  const demoClients = await Client.find({ $or: [{ name: /\(Demo\)$/ }, { 'primaryContact.email': /-demo\./ }] }).select('_id');
  const ids = demoClients.map((c) => c._id);
  if (ids.length) {
    const projects = await Project.find({ client: { $in: ids } }).select('_id');
    const pids = projects.map((p) => p._id);
    await Promise.all([
      Task.deleteMany({ project: { $in: pids } }),
      Project.deleteMany({ _id: { $in: pids } }),
      Proposal.deleteMany({ client: { $in: ids } }),
      Invoice.deleteMany({ client: { $in: ids } }),
      Appointment.deleteMany({ client: { $in: ids } }),
      Ticket.deleteMany({ client: { $in: ids } }),
      Message.deleteMany({ client: { $in: ids } }),
      File.deleteMany({ client: { $in: ids } }),
      Order.deleteMany({ client: { $in: ids } }),
      User.deleteMany({ client: { $in: ids } }),
      Client.deleteMany({ _id: { $in: ids } }),
    ]);
  }
  await Appointment.deleteMany({ email: /-demo\./ });
  const leads = await Lead.deleteMany({ email: /-demo\./ });
  const staff = await User.find({ email: { $in: DEMO_STAFF } }).select('_id');
  await Notification.deleteMany({ user: { $in: staff.map((u) => u._id) } });
  const users = await User.deleteMany({ email: { $in: DEMO_STAFF } });
  console.log(`  ✓ demo data removed (${ids.length} demo client(s), ${leads.deletedCount} demo lead(s), ${users.deletedCount} demo team user(s))`);
}

async function main() {
  await connectDB();
  if (reset) {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to reset in production');
    await mongoose.connection.db.dropDatabase();
    console.log('  ! database dropped');
  }

  await seedSettings();
  for (const [Model, docs] of CONTENT) await fill(Model, docs);
  if (removeDemo) await removeDemoData();

  // ---------- Super admin (the only account created by default) ----------
  const pw = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const mk = async (email, name, role, extra = {}) =>
    (await User.findOne({ email })) || User.create({ email, name, role, password: extra.password || pw, ...extra });
  const superadmin = await mk(process.env.SEED_ADMIN_EMAIL || 'admin@zeviro.agency', process.env.SEED_ADMIN_NAME || 'Md Ibrahim Hossain', 'superadmin', { title: 'Founder', emailVerified: true });
  console.log(`  ✓ super admin: ${superadmin.email}`);

  if (withDemo) {
    if (process.env.NODE_ENV === 'production') throw new Error('Refusing to add demo data in production');
    const sales = await mk('sales@zeviro.agency', 'Sara Sales', 'sales', { title: 'Business Development' });
    const pm = await mk('pm@zeviro.agency', 'Paul Manager', 'pm', { title: 'Project Manager' });
    const dev = await mk('dev@zeviro.agency', 'Dana Developer', 'developer', { title: 'Full-stack Developer' });
    await mk('agent@zeviro.agency', 'Chris Agent', 'chat_agent', { title: 'Chat Agent' });
    await mk('content@zeviro.agency', 'Cora Content', 'content_manager', { title: 'Content Manager' });
    console.log('  ✓ demo team users');
    // ---------- Demo CRM + portal data ----------
    if ((await Lead.countDocuments()) === 0) {
      const sample = [
        ['Emma Clarke', 'Northwind Logistics', 'emma@northwind-demo.com', 'northwind-demo.com', 'United Kingdom', 'Professional Services', 'Web Development', '$5k – $15k', '1 – 3 months', 'New', 'Website'],
        ['Liam Becker', 'Brightpath SaaS', 'liam@brightpath-demo.io', 'brightpath-demo.io', 'Germany', 'Technology & SaaS', 'SaaS Development', '$15k – $50k', '3 – 6 months', 'Qualified', 'AI Chatbot'],
        ['Olivia Martin', 'Harbor Realty', 'olivia@harbor-demo.com', 'harbor-demo.com', 'United States', 'Real Estate', 'B2B Lead Generation', '$2k – $5k', 'ASAP', 'Contacted', 'Live Chat'],
        ['Noah Wilson', 'Medline Clinics', 'noah@medline-demo.org', 'medline-demo.org', 'Canada', 'Healthcare', 'UI/UX Design', '$5k – $15k', '1 – 3 months', 'Meeting Booked', 'Book a Call'],
        ['Ava Rossi', 'Verde Commerce', 'ava@verde-demo.shop', 'verde-demo.shop', 'Italy', 'E-commerce', 'AI & Automation', '$5k – $15k', '1 – 3 months', 'Proposal Sent', 'Referral'],
        ['Mason Lee', 'Forge Industrial', 'mason@forge-demo.com', 'forge-demo.com', 'Australia', 'Manufacturing', 'Data Services', '< $2k', 'Just exploring', 'Lost', 'Website'],
      ];
      for (const [i, [fullName, company, email, website, country, industry, service, budget, timeline, status, source]] of sample.entries()) {
        await Lead.create({
          fullName, company, email, website, domain: website, country, industry, service, budget, timeline, status, source,
          description: `Demo lead — interested in ${service.toLowerCase()}.`,
          owner: i % 2 ? sales._id : superadmin._id,
          followUpDate: status === 'Contacted' ? days(1) : undefined,
          activities: [{ type: 'system', text: `Lead created via ${source}` }],
          createdAt: days(-i * 3),
        });
      }
      console.log('  ✓ demo leads');
    }

    let client = await Client.findOne({ name: 'Acme Robotics (Demo)' });
    if (!client) {
      client = await Client.create({
        name: 'Acme Robotics (Demo)',
        website: 'https://acme-demo.com',
        industry: 'Manufacturing',
        country: 'United States',
        primaryContact: { name: 'Jordan Blake', email: 'client@acme-demo.com', phone: '+1 555 0100' },
        contacts: [{ name: 'Jordan Blake', email: 'client@acme-demo.com', role: 'CEO' }],
        accountManager: pm._id,
      });
      const clientUser = await mk('client@acme-demo.com', 'Jordan Blake', 'client', { client: client._id, password: 'Client@12345' });

      const project = await Project.create({
        name: 'Corporate Website & Lead Portal',
        description: 'New Next.js website with CMS, lead capture and CRM integration.',
        client: client._id,
        service: 'Web Development',
        status: 'In Progress',
        progress: 55,
        startDate: days(-30),
        deadline: days(28),
        manager: pm._id,
        team: [dev._id],
        milestones: [
          { title: 'Discovery & sitemap', status: 'Completed', dueDate: days(-24), completedAt: days(-24) },
          { title: 'UI/UX design approval', status: 'Completed', dueDate: days(-10), completedAt: days(-11) },
          { title: 'Development & CMS', status: 'In Progress', dueDate: days(12) },
          { title: 'QA & launch', status: 'Pending', dueDate: days(28) },
        ],
        activity: [
          { text: 'Project kicked off', by: pm._id },
          { text: 'Homepage design approved by client', by: pm._id },
          { text: 'Development sprint 2 started', by: dev._id },
        ],
      });
      const p2 = await Project.create({ name: 'Q3 Prospect List — North America', client: client._id, service: 'B2B Lead Generation', status: 'Review', progress: 90, startDate: days(-14), deadline: days(3), manager: pm._id, team: [sales._id] });

      await Task.create([
        { title: 'Provide brand assets (logo, fonts)', project: project._id, status: 'Done', priority: 'High', visibleToClient: true, dueDate: days(-20), assignee: pm._id },
        { title: 'Review homepage copy', description: 'Please review the draft homepage copy in Files → Documents and leave comments here.', project: project._id, status: 'Review', priority: 'High', visibleToClient: true, dueDate: days(2), assignee: pm._id, comments: [{ text: 'Draft copy uploaded — looking forward to your feedback!', by: pm._id }] },
        { title: 'Approve services page layout', project: project._id, status: 'To Do', priority: 'Medium', visibleToClient: true, dueDate: days(6), assignee: pm._id },
        { title: 'Build CMS collections', project: project._id, status: 'In Progress', priority: 'Medium', visibleToClient: false, dueDate: days(8), assignee: dev._id },
        { title: 'Verify 500 contacts', project: p2._id, status: 'Review', priority: 'High', visibleToClient: true, dueDate: days(2), assignee: sales._id },
      ]);

      await Proposal.create({
        title: 'Phase 2 — Client Portal', client: client._id, status: 'Sent', sentAt: days(-1), validUntil: days(21), createdBy: sales._id,
        summary: 'Secure client portal with projects, files, messaging, invoices and support tickets.',
        scope: 'Design and develop a client portal connected to the existing CRM, including authentication, role-based access and notifications.',
        deliverables: ['Portal UI/UX', 'Secure authentication', 'Projects, tasks & files', 'Messaging & notifications', 'Invoices & support tickets'],
        timeline: '8 weeks',
        milestones: [{ title: 'Design', amount: 1500, dueInDays: 14 }, { title: 'Build', amount: 3500, dueInDays: 45 }, { title: 'Launch', amount: 1000, dueInDays: 56 }],
        items: [{ description: 'Portal design', quantity: 1, unitPrice: 1500 }, { description: 'Portal development', quantity: 1, unitPrice: 3500 }, { description: 'QA & launch', quantity: 1, unitPrice: 1000 }],
      });
      await Invoice.create({ client: client._id, project: project._id, items: [{ description: 'Website — milestone 1 (design)', quantity: 1, unitPrice: 2000 }], dueDate: days(-15), payments: [{ amount: 2000, method: 'Bank Transfer', reference: 'TRX-1001', paidAt: days(-16) }] });
      await Invoice.create({ client: client._id, project: project._id, items: [{ description: 'Website — milestone 2 (development)', quantity: 1, unitPrice: 3000 }], dueDate: days(10) });
      await Appointment.create({ title: 'Sprint review', client: client._id, project: project._id, name: clientUser.name, email: clientUser.email, startsAt: days(3), durationMin: 45, meetingLink: 'https://meet.google.com/xxx-xxxx-xxx', status: 'Confirmed', host: pm._id });
      await Appointment.create({ title: 'Kick-off meeting', client: client._id, project: project._id, name: clientUser.name, email: clientUser.email, startsAt: days(-30), status: 'Completed', host: pm._id });
      await Appointment.create({ title: 'Discovery Call', name: 'Noah Wilson', email: 'noah@medline-demo.org', company: 'Medline Clinics', startsAt: days(2), status: 'Requested' });
      await Ticket.create({ subject: 'Add second contact to portal', description: 'Can you give our marketing lead access to the portal?', client: client._id, category: 'General', priority: 'Low', status: 'In Progress', createdBy: clientUser._id, replies: [{ body: 'Sure — please share their name and email.', by: pm._id, fromClient: false }] });
      await Message.create([
        { client: client._id, project: project._id, from: pm._id, body: 'Welcome to your Zeviro portal, Jordan! You can follow progress, share files and message us here.', readByTeam: true },
        { client: client._id, project: project._id, from: clientUser._id, fromClient: true, body: 'Thanks Paul — the homepage design looks great.', readByClient: true },
      ]);
      console.log('  ✓ demo client, project, tasks, proposal, invoices, meetings, ticket, messages');
    }

  }

  console.log('\nDone.');
  console.log(`  Super admin login: https://admin.<your-domain>/login  (local: http://admin.localhost:5173/login) → ${superadmin.email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) console.log('  Password: Admin@12345 — change it right after your first login!');
  if (withDemo) console.log('  Demo team: sales@ / pm@ / dev@ / agent@ / content@zeviro.agency (same password) · demo client: client@acme-demo.com / Client@12345');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
