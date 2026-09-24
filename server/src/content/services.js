// Real Zeviro services. Package prices marked (Fiverr) mirror the live Fiverr gigs of @riyanh89.
// Everything is editable later in Admin → Website CMS → Services.
const FIVERR = 'https://www.fiverr.com/riyanh89';

export const services = [
  {
    title: 'Web Development',
    slug: 'web-development',
    icon: 'Code2',
    image: '/images/services/web-development.jpg',
    excerpt: 'Fast, responsive business websites and web apps built with React, Next.js and Node.js (MERN) — from a 2-page landing site to a full custom platform.',
    body: `Your website is usually the first thing a client checks before they contact you. We build websites that load fast, look sharp on every screen and make it easy for visitors to become enquiries or customers.

## What we build
- Business and portfolio websites
- Landing pages for campaigns and product launches
- Custom web applications and dashboards (MERN: MongoDB, Express, React, Node.js)
- E-commerce storefronts with online payments
- Figma, XD or PSD designs converted into pixel-perfect, responsive code

## How we work
Every project starts with a short brief: your business, the pages or features you need, examples you like and your deadline. We confirm the scope in writing, build in visible stages, and share a live preview link so you can review before launch. After delivery we help you connect your domain and hosting and fix any bug in our code reported within 30 days — free.

## Why clients choose us
We have delivered 1,200+ projects on Fiverr since 2019 and write clean, well-structured code you fully own after payment. You deal directly with the developers doing the work, with fast replies (our average Fiverr response time is about one hour).`,
    features: ['Mobile-first, responsive layout', 'Clean React / Next.js or HTML-CSS code', 'Contact / opt-in forms', 'Basic on-page SEO & speed optimisation', 'Social media links & Google Maps', 'Domain & hosting setup help'],
    deliverables: ['Live website on your domain', 'Full source code (GitHub or ZIP)', 'Admin / CMS access where included', 'Short handover guide'],
    technologies: ['React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'Tailwind CSS', 'Bootstrap', 'HTML5', 'CSS3', 'Redux'],
    tags: ['website', 'web', 'react', 'nextjs', 'frontend', 'development', 'mern', 'landing', 'ecommerce'],
    hourlyRate: 15,
    marketplaceUrl: `${FIVERR}/do-front-end-web-development-with-react-responsive-website-design`,
    pricingNote: 'Every website is different, so we confirm a fixed price after reading your brief. Hosting and domain fees are paid by you directly to the provider.',
    packages: [
      { name: 'Basic', title: 'Starter website', price: 80, deliveryDays: 3, revisions: '2', description: 'A functional, responsive website of up to 2 pages — ideal for a landing page or a simple business presence.', features: ['Up to 2 pages', 'Responsive design', 'Content upload', 'Contact / opt-in form', 'Social media icons', 'Hosting setup help'] },
      { name: 'Standard', title: 'Business website', price: 400, deliveryDays: 10, revisions: '3', popular: true, description: 'A complete business website of up to 6 pages with a contact form, basic SEO and a fast, modern React front end.', features: ['Up to 6 pages', 'Responsive design', 'Content upload', 'Contact / opt-in form', 'Social media icons', 'Hosting setup help', 'Basic on-page SEO', 'Speed optimisation'] },
      { name: 'Premium', title: 'Custom web app / store', price: 900, deliveryDays: 21, revisions: '5', description: 'A custom MERN web application or online store with user accounts, admin dashboard and payment integration.', features: ['Up to 12 pages / screens', 'Responsive design', 'Content upload', 'Contact / opt-in form', 'Social media icons', 'Hosting setup help', 'Basic on-page SEO', 'Speed optimisation', 'E-commerce / payment integration', 'Admin dashboard & user login'] },
    ],
  },
  {
    title: 'Web & Mobile App Development',
    slug: 'web-and-mobile-app-development',
    icon: 'Smartphone',
    image: '/images/services/web-mobile-apps.jpg',
    excerpt: 'Custom web apps, client portals, dashboards and Android apps — planned with you, built on a modern MERN + React Native stack and delivered in clear milestones.',
    body: `When a website is not enough, we build the software your business runs on: client portals, booking and order systems, internal dashboards and Android apps that connect to the same backend.

## Typical projects
- Customer or client portals with logins, files, messages and invoices
- Admin dashboards, CRMs and reporting tools
- SaaS MVPs with user accounts and subscriptions
- Android apps built with React Native (Expo), published to Google Play
- REST APIs and integrations with the tools you already use

## A real example
This very website — with its CRM, live chat, real-time messaging, client portal, online ordering and a companion Android app — was designed and built by the Zeviro team on the same stack we use for clients.

## How we deliver
We start with a scoping call and a written plan: features, screens, milestones and a fixed price per milestone. You see progress in your client portal, test each milestone on a staging link and only pay for the next stage when you are happy with the current one.`,
    features: ['Discovery call & written scope', 'UI screens before coding starts', 'Secure login & role-based access', 'Real-time features (chat, notifications)', 'Android app via React Native / Expo', 'Deployment & store publishing help'],
    deliverables: ['Web app deployed to your server or cloud', 'Android app build (AAB/APK) ready for Google Play', 'Full source code & documentation', 'Milestone demos in your client portal'],
    technologies: ['React', 'React Native', 'Expo', 'Node.js', 'Express', 'MongoDB', 'Socket.IO', 'REST APIs', 'Tailwind CSS'],
    tags: ['app', 'mobile', 'android', 'saas', 'mvp', 'portal', 'dashboard', 'crm', 'software'],
    pricingNote: 'Apps are priced per project after a free scoping call. You receive a fixed quote split into milestones — no surprise bills.',
    packages: [
      { name: 'Basic', title: 'Scoping & prototype', price: 0, deliveryDays: 5, revisions: '2', description: 'We turn your idea into a clear feature list, user flows and clickable screens so you know exactly what will be built and what it costs.', features: ['Scoping call', 'Feature list & user flows', 'Clickable UI prototype', 'Fixed-price build proposal'] },
      { name: 'Standard', title: 'Web app / portal', price: 0, revisions: 'Per milestone', popular: true, description: 'A custom web application — portal, dashboard or SaaS MVP — built in milestones with a staging link for every stage.', features: ['Scoping call', 'Feature list & user flows', 'Clickable UI prototype', 'Fixed-price build proposal', 'Secure login & roles', 'Admin dashboard', 'Deployment'] },
      { name: 'Premium', title: 'Web app + Android app', price: 0, revisions: 'Per milestone', description: 'Your web platform plus an Android app sharing the same backend, prepared for publishing on Google Play.', features: ['Scoping call', 'Feature list & user flows', 'Clickable UI prototype', 'Fixed-price build proposal', 'Secure login & roles', 'Admin dashboard', 'Deployment', 'Android app (React Native)', 'Google Play publishing help'] },
    ],
  },
  {
    title: 'Web Design',
    slug: 'web-design',
    icon: 'Palette',
    image: '/images/services/web-design.jpg',
    excerpt: 'Clean, conversion-focused website and landing page designs in Figma — ready to hand to any developer or to be built by our team.',
    body: `Good design is not decoration — it makes your offer easy to understand and your next step obvious. We design websites and landing pages that look professional, match your brand and guide visitors to contact you or buy.

## What you get
- A homepage and inner pages designed for desktop and mobile
- Consistent colours, typography and buttons (a mini design system)
- Real content structure — not lorem ipsum — so the design works when it goes live
- Figma files you own, organised for developers

## Design + development
Because we also build websites, our designs are realistic to develop, fast to load and easy to maintain. If you want, we can build the design for you right after approval using our Web Development packages.`,
    features: ['Desktop & mobile layouts', 'Brand colours & typography', 'Figma source files', 'Developer-ready components', 'Revisions until approved (per package)'],
    deliverables: ['Figma design file', 'Exported assets (icons, images)', 'Style guide page', 'Optional development by our team'],
    technologies: ['Figma', 'Adobe XD', 'Tailwind CSS'],
    tags: ['design', 'ui', 'ux', 'figma', 'landing', 'mockup', 'website design'],
    pricingNote: 'Design prices depend on the number of pages and how much content is ready. Choose a package and describe your pages — we reply with a fixed quote.',
    packages: [
      { name: 'Basic', title: 'Landing page design', price: 0, deliveryDays: 3, revisions: '2', description: 'One long landing page designed for desktop and mobile.', features: ['1 page', 'Desktop & mobile', 'Figma source file'] },
      { name: 'Standard', title: 'Website design', price: 0, deliveryDays: 7, revisions: '3', popular: true, description: 'A homepage plus up to 5 inner pages with a consistent style guide.', features: ['Up to 6 pages', 'Desktop & mobile', 'Figma source file', 'Style guide'] },
      { name: 'Premium', title: 'Design + development', price: 0, deliveryDays: 21, revisions: '4', description: 'Full website design followed by development and launch by our team.', features: ['Up to 6 pages', 'Desktop & mobile', 'Figma source file', 'Style guide', 'Development & launch'] },
    ],
  },
  {
    title: 'Digital Marketing',
    slug: 'digital-marketing',
    icon: 'Megaphone',
    image: '/images/services/digital-marketing.jpg',
    excerpt: 'SEO, Google Business Profile and LinkedIn marketing that help the right customers find you — with honest reporting and no fake promises.',
    body: `Marketing works best when it is built on a solid website and a clear audience. We focus on the channels that bring steady, long-term enquiries for service businesses and B2B companies.

## What we do
- **Search engine optimisation (SEO):** technical fixes, on-page optimisation, keyword research and helpful content
- **Local SEO & Google Business Profile:** complete, optimised profiles that help you appear on Google Maps
- **LinkedIn marketing:** company page setup, profile optimisation and a content plan for founders and sales teams
- **Email outreach setup:** campaign structure, copy and deliverability basics — paired with our B2B lead generation

## Honest by default
We never buy fake reviews, followers or links, and we never promise "#1 on Google". You get a clear plan, a monthly report of what was done and what changed, and advice you can act on.`,
    features: ['SEO audit & keyword research', 'On-page & technical SEO', 'Google Business Profile optimisation', 'LinkedIn page & profile optimisation', 'Content plan', 'Monthly report'],
    deliverables: ['Audit report with priorities', 'Implemented fixes (with access)', 'Content calendar', 'Monthly progress report'],
    technologies: ['Google Search Console', 'Google Analytics 4', 'Google Business Profile', 'LinkedIn', 'Ahrefs / Semrush (as available)'],
    tags: ['marketing', 'seo', 'google', 'local', 'linkedin', 'social', 'maps', 'business profile', 'traffic'],
    pricingNote: 'Marketing is quoted after we review your website and goals. One-off audits and monthly plans are both available.',
    packages: [
      { name: 'Basic', title: 'SEO & profile audit', price: 0, deliveryDays: 4, revisions: '1', description: 'A clear audit of your website SEO and Google Business Profile with a prioritised action list.', features: ['Website SEO audit', 'Google Business Profile review', 'Keyword opportunities', 'Prioritised action plan'] },
      { name: 'Standard', title: 'Local SEO setup', price: 0, deliveryDays: 10, revisions: '2', popular: true, description: 'We implement the audit: on-page fixes, Google Business Profile optimisation and local citations.', features: ['Website SEO audit', 'Google Business Profile review', 'Keyword opportunities', 'Prioritised action plan', 'On-page fixes', 'Profile optimisation', 'Local citations'] },
      { name: 'Premium', title: 'Monthly growth plan', price: 0, revisions: 'Monthly', description: 'Ongoing SEO, content and LinkedIn marketing with a monthly report and review call.', features: ['Website SEO audit', 'Keyword opportunities', 'Prioritised action plan', 'On-page fixes', 'Profile optimisation', 'Monthly content', 'LinkedIn marketing', 'Monthly report & call'] },
    ],
  },
  {
    title: 'B2B Lead Generation',
    slug: 'b2b-lead-generation',
    icon: 'Target',
    image: '/images/services/b2b-lead-generation.jpg',
    excerpt: 'Targeted, manually researched B2B prospect lists with verified business emails — built around your ideal customer, industry and location.',
    body: `A good lead list is not about size — it is about reaching the right decision-makers with correct contact details. We research every list manually around your ideal customer profile (ICP) and verify the emails before delivery.

## How it works
1. **You define the target:** industry, location, company size, job titles and the number of leads.
2. **We research:** LinkedIn, company websites, business directories and other public business sources.
3. **We verify:** business emails are checked with verification tools to reduce bounces.
4. **You receive a clean file:** Excel, CSV or Google Sheets, de-duplicated and ready for your CRM.

## Typical fields
Company name, website, industry, company size, location, contact name, job title, business email, LinkedIn profile URL and phone (when publicly available).

## Responsible data
We only collect business contact information from public sources and never sell the same custom list twice. Read our [Lead Data & Anti-Spam Compliance Policy](/policies/lead-data-and-anti-spam-compliance-policy) to see how to use B2B data lawfully under GDPR, CAN-SPAM and similar laws.`,
    features: ['Manual research around your ICP', 'Verified business emails', 'LinkedIn profile URLs', 'De-duplicated list', 'Excel / CSV / Google Sheets'],
    deliverables: ['Lead file in your format', 'Verification summary', 'Free replacement of invalid emails reported within 7 days'],
    technologies: ['LinkedIn Sales Navigator', 'Apollo', 'Hunter / email verifiers', 'Google Sheets', 'Excel'],
    tags: ['leads', 'lead', 'generation', 'b2b', 'prospect', 'email list', 'linkedin', 'outreach', 'sales', 'contacts'],
    hourlyRate: 20,
    marketplaceUrl: `${FIVERR}/provide-b2b-lead-generation-prospect-research-and-business-list-building`,
    pricingNote: 'Price depends on your target market, volume and fields. Choose a package, describe your ideal customer and we will send a fixed price before you pay.',
    packages: [
      { name: 'Basic', title: 'Starter B2B leads', price: 30, deliveryDays: 2, revisions: '1', description: '100 targeted leads with verified business emails — perfect to test a new market or campaign.', features: ['100 leads', 'Verified business emails', 'Contact name & job title', 'Company & website', 'LinkedIn URL'] },
      { name: 'Standard', title: 'Growth list', price: 120, deliveryDays: 4, revisions: '2', popular: true, description: '500 targeted leads researched around your ICP, verified and de-duplicated.', features: ['500 leads', 'Verified business emails', 'Contact name & job title', 'Company & website', 'LinkedIn URL', 'Company size & location', 'De-duplication'] },
      { name: 'Premium', title: 'Campaign-ready database', price: 220, deliveryDays: 6, revisions: '3', description: '1,000 targeted leads with full company data and phone numbers where publicly available.', features: ['1,000 leads', 'Verified business emails', 'Contact name & job title', 'Company & website', 'LinkedIn URL', 'Company size & location', 'De-duplication', 'Phone numbers (when public)'] },
    ],
  },
  {
    title: 'Data Entry Services',
    slug: 'data-entry-services',
    icon: 'Keyboard',
    image: '/images/services/data-entry.jpg',
    excerpt: 'Accurate data entry, web research, copy-paste, PDF-to-Excel conversion, CRM updates and product uploads — delivered fast, often within 24 hours.',
    body: `Data entry is where we started — and still one of the things we do best. Our Fiverr data entry gig alone has 770+ reviews with a 4.8★ average, and our team handles everything from quick tasks to long-running projects.

## What we handle
- Data entry and typing into Excel, Google Sheets or your system
- Web research and data collection
- Copy-paste and data mining from websites and directories
- PDF to Excel / Word conversion and document typing
- CRM data entry and updates (HubSpot, Salesforce, Zoho and others)
- Data cleaning, formatting and duplicate removal
- Shopify and WordPress / WooCommerce product uploads

## Accuracy and confidentiality
Every file is checked before delivery. Your data stays confidential — we only use it for your project and can sign an NDA on request. For large or recurring work, we assign a dedicated team so the job gets done on time.`,
    features: ['Excel & Google Sheets', 'Web research', 'Copy-paste & typing', 'PDF to Excel / Word', 'CRM data entry', 'Data cleaning & de-duplication', 'Product uploads (Shopify, WooCommerce)'],
    deliverables: ['Completed file in your format', 'Quality-checked data', 'Confidential handling (NDA on request)'],
    technologies: ['Microsoft Excel', 'Google Sheets', 'HubSpot', 'Salesforce', 'Zoho CRM', 'Shopify', 'WordPress / WooCommerce'],
    tags: ['data', 'entry', 'excel', 'typing', 'copy paste', 'web research', 'pdf', 'crm', 'cleaning', 'spreadsheet', 'shopify', 'product upload'],
    hourlyRate: 20,
    marketplaceUrl: `${FIVERR}/do-provide-all-type-data-entry-within-24hrs`,
    pricingNote: 'Price depends on the volume, source and format. Describe the job and we will send a fixed price (per project, per record or per hour) before you pay.',
    packages: [
      { name: 'Basic', title: 'Quick data task', price: 20, deliveryDays: 1, revisions: '1', description: 'Data entry, copy-paste, typing work, PDF to Word/Excel or basic web research.', features: ['Data entry & typing', 'Copy-paste', 'PDF to Word / Excel', 'Basic web research', '24-hour delivery'] },
      { name: 'Standard', title: 'Excel & spreadsheet project', price: 100, deliveryDays: 2, revisions: '2', popular: true, description: 'Up to 500 records with accurate data entry, Excel formatting and spreadsheet organisation.', features: ['Up to 500 records', 'Data entry & typing', 'Excel formatting', 'Data cleaning & de-duplication', 'Spreadsheet organisation'] },
      { name: 'Premium', title: 'Large or ongoing project', price: 0, revisions: 'As agreed', description: 'Thousands of records, recurring CRM updates or product uploads handled by a dedicated team.', features: ['Custom volume', 'Dedicated team', 'Data entry & typing', 'Excel formatting', 'Data cleaning & de-duplication', 'CRM / product uploads', 'Weekly progress updates'] },
    ],
  },
];
