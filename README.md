# Zeviro.agency — Website, Admin Dashboard/CRM & Client Portal

Full-stack MERN build of the **Zeviro.agency Complete A–Z Requirement Specification v2**.

- **Frontend:** React 18 + Vite + Tailwind CSS (dark premium theme), React Router, code-split pages, `react-helmet-async` SEO
- **Backend:** Node.js + Express REST API (`/api/v1`), Mongoose/MongoDB, JWT in httpOnly cookie, RBAC, Zod validation
- **Extras:** AI chatbot (knowledge-base grounded, optional Claude API), built-in live chat, email notifications (SMTP), file uploads, audit logs, first-party analytics, sitemap/robots

---

## 1. Quick start (local)

Requirements: **Node 18+** and **MongoDB 6+** (local or MongoDB Atlas).

```bash
# 1) install
npm install            # installs "concurrently" for the root dev script
npm run install:all    # installs server + client

# 2) configure
cp server/.env.example server/.env
#   → set MONGO_URI, JWT_SECRET (long random string), SMTP_*, optional ANTHROPIC_API_KEY

# 3) seed the real website content + super admin
npm run seed           # first install
npm run seed:real      # upgrading an older install: replaces website content with the latest real content and deletes the old demo data

# 4) run
npm run dev            # API → http://localhost:5000   Web → http://localhost:5173
```

### Demo logins (created by the seed — change them before going live!)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@zeviro.agency | Admin@12345 |
| Sales / BD | sales@zeviro.agency | Admin@12345 |
| Project Manager | pm@zeviro.agency | Admin@12345 |
| Developer / Designer | dev@zeviro.agency | Admin@12345 |
| Chat Agent | agent@zeviro.agency | Admin@12345 |
| Content Manager | content@zeviro.agency | Admin@12345 |
| Client (portal) | client@acme-demo.com | Client@12345 |

Login at `/login` → staff go to `/admin`, clients go to `/portal`.

---

## 2. Production deployment

```bash
npm run build          # builds client/dist
npm start              # NODE_ENV=production — Express serves the API + built SPA on PORT
```

- Put it behind HTTPS (Nginx / Caddy / Render / Railway / a VPS). Auth cookies are `secure` in production.
- Set `CLIENT_URL` and `SITE_URL` to your real domain (used for CORS, email links, sitemap, canonical URLs).
- Use MongoDB Atlas (or managed Mongo) with automated backups. Manual backup: `mongodump --uri "$MONGO_URI" --out ./backup-$(date +%F)`; restore with `mongorestore`.
- Uploaded files live in `server/uploads/` — mount a persistent volume, or swap `middleware/common.js → upload` for S3 (multer-s3) when you move to cloud storage.
- Set `VITE_SITE_URL=https://zeviro.agency` at build time for canonical/OG URLs.

---

## 3. Spec coverage (section → where it lives)

| Spec | Implementation |
|---|---|
| §2–3 Navigation & public pages | `client/src/components/Navbar.jsx` (mega menus from CMS), `pages/public/*` — Home, Services/Solutions/Industries (+detail), Case Studies (filters), Resources (Blog/Guides/Insights), FAQ, About, Team, How We Work, Why Zeviro, Contact, Book a Discovery Call, Privacy/Terms/Cookie, 404 |
| §4 Homepage sections | `pages/public/Home.jsx` — hero, trust stats, services, why, solutions, industries, case studies, 7-step process, tech stack, testimonials (only when published), AI chat, FAQ, CTA, footer |
| §5 Lead form | `components/LeadForm.jsx` + `POST /public/leads` — all fields, client + Zod validation, honeypot + timing trap + rate limit, duplicate detection (email / domain / company), auto-reply email, admin notification, CRM lead |
| §6 AI chatbot | `server/src/services/chatbot.js` — answers only from FAQs/services/solutions/industries, quick options, 7-step lead qualification → CRM lead, escalation to human, confidence scores, transcripts stored. Set `ANTHROPIC_API_KEY` for LLM answers (still grounded; replies "UNSURE" → escalation) |
| §7 Live chat | `components/ChatWidget.jsx` + `routes/chat.js` + `admin/Chats.jsx` — online/offline status, agent replies (polling), offline inquiry form, transcripts, convert to lead, unanswered-chat alerts, agent assignment. Optional third-party chat script in Settings |
| §8–9 Admin Dashboard | `pages/admin/*` — Dashboard KPIs, Leads/CRM, Clients, Projects (milestones, progress, team, files, activity), Tasks (comments, internal notes, client visibility), Chats, Appointments (list + calendar), Proposals, Invoices (payments), Support Tickets, CMS (services, solutions, industries, case studies, blog, FAQs, testimonials, team), Media, Users & Roles, Notifications, Reports, Audit Logs, Settings |
| §10 Client Portal | `pages/portal/Portal.jsx` — overview, projects, tasks (client-visible only + comments/attachments), files (upload/download, folders, categories), messages, proposals (accept/decline), invoices (printable/PDF, payment link, history), meetings (request, reschedule/cancel 24h policy, .ics), support tickets, profile/company/notification prefs/password |
| §11 Access rules | Every `/portal` query is scoped to `req.clientId`; file downloads are permission-checked; suspended clients / deactivated users are blocked; PM/Dev see only their projects; audit logs |
| §12 CRM | Lead ID, timestamps, all fields, status pipeline New → Won/Lost, owner, notes & activity history, follow-up dates, search/filter/sort, CSV export (injection-safe), duplicate flags, convert to client (+ portal login) |
| §13 Backend | Versioned REST `/api/v1`, auth/RBAC, Zod validation, CMS APIs, chat endpoints, appointments, email service, uploads, audit logging, rate limiting, centralized errors |
| §14 Database | Mongoose models in `server/src/models/` (users, leads + activities, clients, projects + milestones, tasks + comments, services, industries, case_studies, blog_posts, blog_categories, faqs, testimonials, appointments, proposals, invoices + payments, chat_conversations + messages, files, folders, notifications, settings, audit_logs, events) |
| §15 Roles | `server/src/config/permissions.js` (mirrored in `client/src/context/AuthContext.jsx`) |
| §16 Notifications | In-app bell + email for all listed events (`services/notify.js`) |
| §17 SEO | Per-page title/meta/OG/Twitter, canonical, JSON-LD (Organization, Service, Article, FAQPage), `/sitemap.xml` + `/robots.txt` from CMS, lazy-loaded routes, mobile-first |
| §18 Security | bcrypt (12 rounds), JWT httpOnly cookie, RBAC, Helmet, rate limits, Mongo sanitize, file type/size restrictions, secrets in `.env`, audit logs, password reset with hashed expiring tokens, HTML escaping in emails |
| Theme (Light / Dark / System) | Default **Dark**. `context/ThemeContext.jsx` + `components/ThemeSwitcher.jsx`; colours are CSS variables in `index.css` (`:root.light` overrides). Switcher: website navbar (icon menu) + footer + mobile menu, admin/portal header, and Profile → Appearance. Saved per browser; "System" follows the OS live. |
| Real-time (Socket.IO) | `server/src/realtime.js` + `client/src/lib/realtime.js`. Instant delivery with no refresh for website live chat, admin Chats, client ↔ team messages, notifications and badges; typing indicators both ways; "Sent ✓ / Seen ✓✓" read receipts. The dev proxy forwards `/socket.io` (WebSocket). In production put the API behind a proxy that allows WebSocket upgrades (Nginx: `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`). |
| §19 Analytics | First-party events (pageviews, sources, form submits, chat usage) respecting cookie consent + GA4 injection after consent; Reports page with funnel |

### Background jobs (every minute, in `server/src/index.js`)
Marks overdue invoices · sends 24h meeting reminders · alerts on chats unanswered for 5+ minutes.

---

## 4. Before launch — checklist

- [ ] Change all demo passwords / delete demo users, client, leads (`Admin → Users`, or re-seed on an empty DB without the demo block).
- [ ] **Replace sample case studies** with real, approved projects. Testimonials are seeded **unpublished** — only publish real quotes with permission.
- [ ] Review homepage stats in `Admin → Settings` — keep them truthful.
- [ ] Have Privacy / Terms / Cookie texts reviewed by a legal professional (`pages/public/Company.jsx`).
- [ ] Configure SMTP (Postmark / SES / Mailgun / Brevo) and a strong `JWT_SECRET`.
- [ ] Add GA4 ID, Search Console verification and a real phone/address in Settings.
- [ ] Phase 2: payment gateway (Stripe/PayPal) → set `paymentLink` on invoices or add a webhook route; S3 storage; e-signature for proposals.
- [ ] Future: Zeviro.io integration via a separate authenticated API client (keep the agency CRM and lead-intelligence platform logically separate, per §26).

---

## 5. Project structure

```
server/
  src/index.js            app, security middleware, routes, sitemap, jobs
  src/config/             db, role permissions
  src/middleware/         auth (JWT/RBAC/scopes), validation, uploads, rate limits, errors, audit
  src/models/             Mongoose schemas
  src/routes/             auth, public, chat, leads, admin (clients/projects/tasks/files/...), reports, portal
  src/services/           chatbot, leads (dedupe), notify (email + in-app)
  src/seed.js             CMS content + demo data
client/
  src/components/         Navbar, Footer, ChatWidget, LeadForm, AppShell, Resource (config-driven CRUD), ui kit
  src/pages/public/       website pages
  src/pages/admin/        admin dashboard modules
  src/pages/portal/       client portal
```

MongoDB was chosen because the spec allows it for MERN teams (§14). All reporting aggregation is done in portable queries, so it also runs on MongoDB Atlas, DocumentDB-compatible or FerretDB.

---

## Logins (three separate portals)

| Who | URL (production) | URL (local) |
|---|---|---|
| Clients (login + sign up) | `https://zeviro.agency/login` · `/signup` | `http://localhost:5173/login` |
| Team members (admin, sales, PM, developer, chat agent, content) | `https://team.zeviro.agency/login` | `http://team.localhost:5173/login` |
| Super admin only | `https://admin.zeviro.agency/login` | `http://admin.localhost:5173/login` |

The server enforces this (`server/src/config/portals.js`): each login page only accepts its own kind of account. The Android app accepts clients and team members (never the super admin). Create team accounts in **Users & Roles** (super admin).

## Orders & payments

Every service can have Basic / Standard / Premium packages (Admin → Website CMS → Services). Clients order from the service page → an order + invoice is created → the client clicks **Pay now**. Until you connect a gateway, clients see the manual payment instructions from **Settings → Orders & payments**; the team records the payment with **Mark as paid** and the order starts automatically. To add Stripe / PayPal / SSLCommerz, implement `createCheckout()` and `handleWebhook()` in `server/src/services/payments.js`.

## Deploying to your own server

See `deploy/nginx-zeviro.conf` and `deploy/ecosystem.config.cjs`. Point the DNS A records for `@`, `www`, `team` and `admin` to the server, run `npm run deploy`, then `certbot --nginx -d zeviro.agency -d www.zeviro.agency -d team.zeviro.agency -d admin.zeviro.agency`.
