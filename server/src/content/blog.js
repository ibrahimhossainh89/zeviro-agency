// Original articles written for the Zeviro website.
const d = (s) => new Date(s);

export const blogCategories = ['Data Entry', 'Lead Generation', 'Web Development', 'Digital Marketing'];

export const blog = [
  {
    title: 'How to write a data entry brief that gets accurate results the first time',
    type: 'Guide',
    category: 'Data Entry',
    readMinutes: 6,
    publishedAt: d('2026-09-10'),
    image: '/images/blog/data-entry-brief.jpg',
    excerpt: 'Most data entry mistakes start with an unclear brief. Use this checklist to describe your task so the first delivery is the right one.',
    tags: ['data entry', 'brief', 'excel', 'outsourcing'],
    body: `After more than a thousand data entry and web research orders, we have noticed a pattern: when a delivery needs a revision, the cause is almost never typing speed or skill. It is the brief. A clear brief saves you a revision round, and often a day or two of back-and-forth.

Here is the checklist we recommend to every client.

## 1. Describe the source
Tell us exactly where the data comes from: a list of URLs, a directory website, scanned PDFs, images, an old spreadsheet or your CRM. If it is a website, say whether we should follow links to detail pages or only use what is on the list page. If it is a PDF, mention whether it is a scan (image) or selectable text — scans take longer.

## 2. List the fields (columns) you need
Write the column names in the order you want them, and give one example row. For example:

- Company name
- Website
- City, State
- Contact name
- Job title
- Email
- Phone

An example row removes most ambiguity — for instance, whether "City, State" should be one column or two, or whether phone numbers need a country code.

## 3. Explain what to do when data is missing
Should we leave the cell empty, write "N/A", or skip the whole row? Should we look for the missing value on another website? This single decision affects the whole file, so it is worth deciding up front.

## 4. Define the volume and the finish line
"Around 500 rows" and "every company in this directory" are very different jobs. If you want a fixed number, say so. If you want everything that matches a filter, tell us the filter.

## 5. Choose the output format
Excel, Google Sheets or CSV? One sheet or one tab per category? Any formatting such as proper case, trimmed spaces or date format (MM/DD/YYYY vs DD/MM/YYYY)? If the file will be imported into a CRM, send us the import template — we will match it exactly.

## 6. Share access safely
If we need to work inside your CRM or a Google Sheet, create a limited user or share only the file we need. Never send your main admin password. We are happy to sign an NDA before you share anything sensitive.

## 7. Agree on a deadline — and a checkpoint
For bigger jobs, ask for a sample of the first 20–50 rows. You confirm the format, and the rest of the file follows the same pattern. This is the fastest way to avoid surprises.

## A simple brief template
> Source: [link or file]. Fields: [list, in order]. Example row: [one filled example]. Missing data: [leave blank / N/A / skip]. Volume: [number or filter]. Output: [Excel / Sheets / CSV + formatting]. Deadline: [date]. First sample: [yes/no].

Copy it, fill it in, and paste it into your order. That's all it takes to get an accurate file on the first delivery.

Ready to start? See our [Data Entry Services](/services/data-entry-services) packages.`,
  },
  {
    title: 'Building a B2B lead list that actually converts: a practical checklist',
    type: 'Guide',
    category: 'Lead Generation',
    readMinutes: 7,
    publishedAt: d('2026-08-27'),
    image: '/images/blog/b2b-lead-list.jpg',
    excerpt: 'List size is a vanity metric. Here is how to define your ideal customer, choose the right fields and keep your outreach compliant.',
    tags: ['lead generation', 'b2b', 'prospecting', 'gdpr', 'cold email'],
    body: `A list of 10,000 contacts looks impressive in a spreadsheet. But if most of them are the wrong role, in the wrong market, or have outdated emails, it will hurt your sender reputation and waste your sales team's time. A smaller, accurate list almost always wins.

## Start with your ideal customer profile (ICP)
Before anyone researches a single contact, write down:

- **Industry** — as specific as possible ("commercial HVAC contractors", not "construction")
- **Location** — countries, states or cities you can actually serve
- **Company size** — employees or revenue range
- **Signals** — for example: hiring for a role, using a certain software, recently opened a new location
- **Decision-makers** — the job titles that buy or influence the purchase

Look at your five best customers. What do they have in common? That is your first ICP draft.

## Pick fields for how you will use the list
If you will send email sequences, you need a verified business email and first name. If your team calls, you need direct phone numbers where available. If you use LinkedIn outreach, the profile URL matters more than the phone. Every extra field adds research time, so only ask for what you will use.

## Verify before you send
Business emails change when people switch jobs. Always verify emails right before a campaign and remove anything marked invalid. At Zeviro we verify every email before delivery and replace any hard bounce reported within seven days.

## Keep it legal and respectful
B2B outreach is legal in most markets when it is done properly, but the rules differ:

- **EU / UK (GDPR, UK GDPR and PECR):** you generally need a legitimate interest for processing business contact data, must tell people where you got their data, and must honour opt-outs immediately. Some countries and the UK's PECR rules treat sole traders more like consumers.
- **USA (CAN-SPAM):** use honest subject lines and sender details, include your physical address and a working unsubscribe link, and process opt-outs within 10 business days.
- **Canada (CASL):** stricter — you usually need consent, although limited exceptions exist for publicly published business addresses when your message is relevant to the person's role.
- **Australia (Spam Act 2003):** you need consent; it can be inferred when an address is conspicuously published and the message relates to the person's role.

This is general information, not legal advice. When in doubt, speak to a lawyer in your target market. Read our [Lead Data & Anti-Spam Compliance Policy](/policies/lead-data-and-anti-spam-compliance-policy) for how we source data.

## Write for one person, not a list
Personalise the first line with something real — their company, a recent post, a location. Keep the email short, make one clear ask, and follow up two or three times at most.

## Measure what matters
Track reply rate and meetings booked, not just opens. If replies are low, the problem is usually the list (wrong people) or the offer (not relevant) — rarely the subject line.

Want a list built around your ICP? See our [B2B Lead Generation](/services/b2b-lead-generation) packages.`,
  },
  {
    title: 'React or WordPress for your business website? How to choose',
    type: 'Insight',
    category: 'Web Development',
    readMinutes: 6,
    publishedAt: d('2026-08-12'),
    image: '/images/blog/react-vs-wordpress.jpg',
    excerpt: 'Both are great tools — for different jobs. A plain-English comparison to help you pick the right one for your next website.',
    tags: ['react', 'wordpress', 'website', 'web development'],
    body: `"Should my website be built in React or WordPress?" is one of the most common questions we get. The honest answer: it depends on what the website needs to do and who will maintain it.

## When WordPress is a great fit
- You want to publish blog posts and edit pages yourself every week
- You need a standard feature that already exists as a plugin (booking, forms, simple shop)
- Your budget is tight and the design can be based on a good theme

The trade-off: plugins need regular updates, heavy themes can be slow, and custom features can become fragile when many plugins interact.

## When React (or Next.js) is the better choice
- You need custom functionality: client logins, dashboards, calculators, order flows or integrations with other systems
- Speed and a smooth, app-like experience matter to your conversions
- The website will grow into a product or platform over time
- You want full control of the code, without dependency on dozens of plugins

The trade-off: content editing needs either a headless CMS or an admin panel we build for you, and changes to layout usually need a developer.

## A quick decision guide
- Mostly content, frequent blog posts, standard features → **WordPress**
- Custom features, logins, dashboards, real-time updates → **React / Next.js (MERN)**
- A simple 1–5 page presence you rarely change → **either** — pick based on who will edit it

## What we usually recommend
For brochure-style sites where the owner edits content often, WordPress is perfectly good. For anything that behaves like software — ordering, portals, CRMs, booking systems — we build with React and Node.js, because it stays fast and maintainable as it grows. This website, for example, is a React + Node.js platform with a built-in CMS, so our team can edit every page without touching code.

## Questions to ask any developer
1. Who will own the code and hosting accounts? (It should be you.)
2. How will I edit content after launch?
3. What happens if something breaks after delivery?
4. How fast will the site load on a mobile connection?

Not sure which way to go? [Book a free discovery call](/book-a-call) and we will recommend the simplest option that does the job.`,
  },
  {
    title: 'Local SEO basics: how to get found on Google Maps',
    type: 'Guide',
    category: 'Digital Marketing',
    readMinutes: 5,
    publishedAt: d('2026-07-29'),
    image: '/images/blog/local-seo.jpg',
    excerpt: 'For local service businesses, Google Business Profile is often the biggest source of calls. Here are the basics that make the biggest difference.',
    tags: ['local seo', 'google business profile', 'google maps', 'marketing'],
    body: `If customers find you by searching "plumber near me" or "accountant in [city]", your Google Business Profile can bring more calls than your website. The good news: the basics are free and mostly within your control.

## 1. Claim and verify your profile
Search for your business on Google Maps. If a profile exists, claim it; if not, create one at business.google.com. Verification (by postcard, phone, email or video) is required before most changes go live.

## 2. Choose the right primary category
The primary category has a strong influence on which searches you appear for. Pick the most specific one that describes your main service — for example "Electrician" rather than "Contractor". Add a few relevant secondary categories.

## 3. Complete every section
- Business name exactly as it appears on your signage (no extra keywords)
- Address or service area, opening hours and holiday hours
- Phone number and website link
- Services with short descriptions and, where possible, prices
- At least 10 good photos: exterior, team, work in progress, finished jobs

## 4. Keep your details consistent everywhere
Your name, address and phone number (NAP) should match on your website, Google, Facebook, Yelp and industry directories. Inconsistent details confuse both customers and search engines.

## 5. Ask every happy customer for a review
Reviews influence both ranking and trust. Send a short message with your direct review link after each job. Reply to every review — thank the good ones, and respond calmly and helpfully to the bad ones. Never buy or fake reviews: it breaks Google's rules and can get your profile suspended.

## 6. Post updates and answer questions
Google Business Profile lets you publish updates, offers and events. A short post every week or two shows the business is active. Check the Q&A section and answer common questions yourself.

## 7. Connect it to a fast, mobile-friendly website
Your website should load quickly on a phone, show your phone number at the top and have a page for each main service and area you cover. This helps both your Maps ranking and your conversion rate.

## Track results
Google Business Profile shows calls, direction requests and website clicks. Check them monthly — they tell you far more than rankings alone.

Want us to handle it? Our [Digital Marketing](/services/digital-marketing) service includes a full Google Business Profile optimisation.`,
  },
].map((b) => ({ ...b, author: 'Zeviro Team' }));
