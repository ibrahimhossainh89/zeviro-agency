// Company content: solutions, industries, FAQs, team, site settings.
export const FIVERR_URL = 'https://www.fiverr.com/riyanh89';
export const UPWORK_URL = 'https://www.upwork.com/freelancers/~0143c29f60a40bbde6';

export const siteSettings = {
  siteName: 'Zeviro',
  tagline: 'Web development, B2B lead generation & data services agency',
  contactEmail: 'hello@zeviro.agency',
  address: 'Bangladesh · Working remotely with clients worldwide',
  stats: [
    { value: '$160k+', label: 'Earned from client projects' },
    { value: '1,200+', label: 'Projects completed on Fiverr' },
    { value: '4.8★', label: 'Average rating from 824 Fiverr reviews' },
    { value: '2015', label: 'Freelancing since' },
  ],
  techStack: ['React', 'Next.js', 'Node.js', 'Express', 'MongoDB', 'React Native', 'JavaScript', 'Tailwind CSS', 'Socket.IO', 'Figma', 'Excel & Google Sheets', 'LinkedIn Sales Navigator', 'Apollo', 'HubSpot', 'Shopify', 'WordPress'],
  chatbotGreeting: "Hi! 👋 I'm Zeviro's assistant. Ask me about our services, prices or how to order — or talk to our team.",
  marketplaces: {
    earnings: '$160k+',
    earningsLabel: 'Total earned from client projects on Fiverr & Upwork',
    fiverr: {
      url: FIVERR_URL,
      username: 'riyanh89',
      displayName: 'Md Ibrahim H.',
      level: 'Level 2',
      badges: ['Vetted Pro'],
      rating: 4.8,
      reviews: 824,
      ordersCompleted: '1,200+',
      memberSince: 'Aug 2019',
      responseTime: '1 hour',
      languages: ['English', 'Bengali'],
      // Star breakdown shown as a chart (from our main data entry gig on Fiverr — update from the Fiverr profile any time)
      breakdown: { five: 731, four: 30, three: 3, two: 3, one: 4 },
      breakdownLabel: 'Rating breakdown of our top Fiverr gig (771 reviews)',
    },
    upwork: {
      url: UPWORK_URL,
      displayName: 'MD IBRAHIM H.',
      title: 'Front End Web Developer with React and Data Entry Expert',
      hourlyRate: 4,
      rating: 5,
      reviews: 1,
      jobs: 2,
      location: 'Joypurhat, Bangladesh',
    },
  },
  payments: {
    provider: 'manual',
    invoiceDueDays: 3,
    showPrices: false,
    manualInstructions: `**Payment options**

- Bank transfer, Payoneer or Wise — reply to your order message and we will send the account details for your country.
- Prefer card or PayPal? Ask us for a secure payment link.

Use your **invoice number** as the payment reference. Your order starts as soon as the payment is confirmed.`,
  },
};

export const solutions = [
  {
    title: 'Business Website Launch',
    icon: 'Rocket',
    audience: 'New and small businesses, freelancers and consultants',
    excerpt: 'Go from no website to a professional, mobile-friendly site with a contact form, Google Business Profile and basic SEO — in about two weeks.',
    features: ['Website design & development', 'Domain, hosting & email setup help', 'Google Business Profile setup', 'Basic on-page SEO', 'Contact form that emails you'],
    body: `Getting online should not take months. This package combines our web design, web development and local marketing work into one clear launch plan.

## What happens
1. A short call to understand your business and customers
2. We design the key pages and share them for approval
3. We build the site, connect your domain and set up your Google Business Profile
4. You get a handover guide so you can update content yourself

## Good fit if you
- Are starting a new business or rebranding
- Have an outdated site that doesn't work on mobile
- Get most of your work from local search or referrals`,
    tags: ['website', 'launch', 'small business', 'new business'],
  },
  {
    title: 'Sales Pipeline Builder',
    icon: 'Target',
    audience: 'B2B companies, agencies and sales teams',
    excerpt: 'A steady flow of prospects: we research verified decision-maker contacts around your ideal customer profile and deliver them ready for outreach.',
    features: ['Ideal customer profile workshop', 'Verified B2B lead lists', 'CRM-ready formatting', 'Outreach copy & sequence advice', 'Weekly or monthly delivery'],
    body: `Most outreach fails because the list is wrong, not the message. We help you define exactly who to target and then keep your pipeline filled with verified contacts.

## How it works
- We agree on industries, locations, company sizes and job titles
- Our researchers build and verify the list manually
- You receive batches every week or month in Excel, CSV, Google Sheets or directly in your CRM
- Invalid emails reported within 7 days are replaced free

## Compliance first
We provide business contact data only and share guidance on using it lawfully (GDPR, CAN-SPAM, UK PECR, CASL). See our lead data compliance policy for details.`,
    tags: ['leads', 'pipeline', 'sales', 'outreach', 'b2b'],
  },
  {
    title: 'Data Operations Support',
    icon: 'FileSpreadsheet',
    audience: 'Operations, admin and e-commerce teams',
    excerpt: 'A reliable remote data team for recurring work — data entry, CRM updates, research, list cleaning and reporting — so your staff can focus on customers.',
    features: ['Dedicated data entry team', 'Daily / weekly task queue', 'CRM & spreadsheet updates', 'Quality checks on every batch', 'Confidential handling & NDA'],
    body: `Repetitive admin work piles up fast. We take it off your plate with a small, trained team that follows your process and delivers on a fixed schedule.

## Typical tasks
- Updating CRM records and cleaning duplicates
- Entering orders, invoices or forms into spreadsheets
- Web research and data collection
- Product catalogue updates

## How we keep quality high
Every batch is checked by a second person before delivery. You get a shared tracker so you always know what's done and what's next.`,
    tags: ['data', 'operations', 'virtual assistant', 'crm', 'ongoing'],
  },
  {
    title: 'E-commerce Store Setup',
    icon: 'ShoppingBag',
    audience: 'Online shops and product brands',
    excerpt: 'A fast online store plus the boring-but-essential work: product uploads, descriptions, images and payment setup on Shopify, WooCommerce or a custom React store.',
    features: ['Store setup or custom storefront', 'Bulk product uploads', 'Product data cleaning', 'Payment & shipping setup help', 'Basic SEO for product pages'],
    body: `Launching a store is part design, part data. We handle both — the storefront and the hundreds of product listings behind it.

## What's included
- Shopify / WooCommerce setup, or a custom React storefront
- Bulk product uploads from your spreadsheets or supplier files
- Consistent titles, descriptions, categories and variants
- Payment gateway and shipping setup assistance`,
    tags: ['ecommerce', 'shopify', 'woocommerce', 'store', 'products', 'upload'],
  },
  {
    title: 'Custom Portal & App',
    icon: 'MonitorSmartphone',
    audience: 'Service businesses and startups',
    excerpt: 'Replace spreadsheets and email threads with your own client portal, booking or order system — with an optional Android app for your customers or team.',
    features: ['Scoping & clickable prototype', 'Secure logins & roles', 'Real-time messages & notifications', 'Admin dashboard', 'Optional Android app'],
    body: `If you manage clients, orders or bookings through email and spreadsheets, a simple portal can save hours every week and look far more professional.

## Built on a proven stack
We use the same MERN + React Native stack that powers this website, its CRM, client portal and Android app — so you get a system that has already been proven in production.

## Delivered in milestones
You see a clickable prototype first, then working milestones on a staging link. Payment is split per milestone.`,
    tags: ['portal', 'app', 'dashboard', 'booking', 'saas', 'android'],
  },
].map((s, i) => ({ ...s, order: i }));

export const industries = [
  {
    title: 'E-commerce & Retail',
    icon: 'ShoppingCart',
    excerpt: 'Storefronts, product uploads, catalogue cleaning and competitor research for online shops.',
    challenges: ['Hundreds of products to upload or update', 'Inconsistent product data from suppliers', 'Slow or outdated storefront', 'No time for competitor and price research'],
    body: `Online retail runs on accurate product data and a fast store. We help shops with Shopify and WooCommerce product uploads, data cleaning, custom React storefronts and market research.`,
  },
  {
    title: 'SaaS & Technology',
    icon: 'Cpu',
    excerpt: 'Lead lists of decision-makers, marketing websites and dashboards for software companies.',
    challenges: ['Finding the right decision-makers to contact', 'Marketing site that does not convert', 'Need an MVP or internal dashboard quickly'],
    body: `Software companies come to us for targeted B2B prospect lists (by tech stack, company size and role), fast marketing websites and React dashboards.`,
  },
  {
    title: 'Real Estate',
    icon: 'Building2',
    excerpt: 'Property listing data entry, agent and broker lead lists, and websites for agencies.',
    challenges: ['Manual listing and CRM updates', 'Finding agents, brokers or investors to contact', 'Outdated agency website'],
    body: `We support real estate teams with listing data entry, CRM updates, researched lists of agents, brokers and property managers, and modern agency websites.`,
  },
  {
    title: 'Home Services & Trades',
    icon: 'Wrench',
    excerpt: 'Websites and local SEO for contractors — and researched lists of trade businesses for suppliers and agencies.',
    challenges: ['No website, or one that does not work on mobile', 'Not showing up on Google Maps', 'Suppliers need accurate lists of local contractors'],
    body: `Plumbers, electricians, roofers, HVAC and other trades win work locally. We build simple, fast websites, set up Google Business Profiles, and research contractor lists for companies that sell to the trades.`,
  },
  {
    title: 'Education & Training',
    icon: 'GraduationCap',
    excerpt: 'Research of colleges, schools and instructor contacts, plus websites for training providers.',
    challenges: ['Finding the right department or instructor contact', 'Large institution lists to research', 'Course pages that are hard to update'],
    body: `We research colleges, training centres and program contacts (for example by course or department) for education suppliers, and build course websites that are easy to keep up to date.`,
  },
  {
    title: 'Professional Services',
    icon: 'Briefcase',
    excerpt: 'Lead-generating websites, client portals and prospect lists for agencies, consultants and firms.',
    challenges: ['Referrals are not enough to grow', 'Client updates scattered across email', 'Website does not explain the offer clearly'],
    body: `Consultancies, agencies, accountants and law firms use our websites, client portals and B2B lead lists to win and serve clients more efficiently.`,
  },
].map((s, i) => ({ ...s, order: i }));

export const team = [
  { title: 'Md Ibrahim Hossain', role: 'Founder & Lead Developer', excerpt: 'Freelancing since 2015 and a Fiverr Level 2 / Vetted Pro seller with 1,200+ completed projects. Leads MERN development, data services and B2B lead generation.', order: 0 },
  { title: 'Redoan', role: 'Project Manager', excerpt: 'Keeps projects on schedule, turns client briefs into clear tasks and makes sure every delivery is checked before it goes out.', order: 1 },
  { title: 'Shahin', role: 'Backend Developer', excerpt: 'Builds the APIs, databases and integrations behind our web apps and client portals.', order: 2 },
];

export const faqs = [
  ['Which services does Zeviro provide?', 'We provide Web Development, Web & Mobile App Development, Web Design, Digital Marketing, B2B Lead Generation and Data Entry Services. Each service has ready-made packages you can order online, and we also quote custom projects.', ['services', 'service list', 'what services']],
  ['How do I order a service?', 'Open any service page, choose a package (Basic, Standard or Premium) and click Continue. Create a free client account, describe your requirements and place the order. You will see the order, invoice and every update in your client portal.', ['order', 'buy', 'purchase', 'how', 'start', 'package']],
  ['How much do your services cost?', 'Every project is priced individually. Choose a service package, click "Request price" and describe what you need — we reply with a fixed price and delivery date, usually within a few hours. You only pay once you accept the price.', ['cost', 'costs', 'price', 'prices', 'pricing', 'budget', 'much', 'rate', 'charge', 'expensive', 'cheap']],
  ['How do I pay?', 'After you place an order you get an invoice in your portal. You can pay by bank transfer, Payoneer or Wise, or ask for a secure card / PayPal link. Work starts as soon as the payment is confirmed.', ['pay', 'payment', 'payments', 'methods', 'method', 'accept', 'paypal', 'card', 'bank', 'payoneer', 'wise', 'invoice', 'stripe']],
  ['How long does delivery take?', 'Delivery time is shown on every package — from 1 day for quick data tasks to 2–3 weeks for custom websites. The clock starts when we have your payment and complete requirements.', ['long', 'time', 'delivery', 'deadline', 'fast', 'days']],
  ['What if I need changes after delivery?', 'Every package includes revisions. After delivery you can accept the order or request a revision from your portal. Changes within the original scope are covered; new requirements are quoted separately.', ['revision', 'changes', 'modify', 'edit', 'after delivery']],
  ['Can I get a refund?', 'Yes. If we have not started, you get a full refund. If work is in progress, we refund the part that has not been done. See our Refund & Cancellation Policy for details.', ['refund', 'refunds', 'cancel', 'money back', 'cancellation', 'guarantee']],
  ['Is my data kept confidential?', 'Yes. Your files and data are only used for your project, access is limited to the people working on it, and we are happy to sign an NDA before you share sensitive information.', ['confidential', 'nda', 'privacy', 'secure', 'safe', 'safety', 'security', 'protected', 'data security']],
  ['How accurate are your lead lists?', 'Leads are researched manually and business emails are verified before delivery. If any email hard-bounces and you report it within 7 days of delivery, we replace it free of charge.', ['accurate', 'accuracy', 'bounce', 'verified', 'valid', 'quality']],
  ['Can I hire you on Fiverr or Upwork instead?', 'Of course. Many clients prefer to order through our Fiverr profile (@riyanh89) or Upwork. Links to our profiles and gigs are on the "Fiverr & Upwork" page. Orders placed there follow the platform\'s own terms.', ['fiverr', 'upwork', 'marketplace', 'profile', 'gig']],
  ['Which time zone do you work in?', 'We are based in Bangladesh (GMT+6) and work with clients in the USA, Europe, Canada, Australia and New Zealand. We reply to messages quickly — our average Fiverr response time is about one hour — and schedule calls at times that suit you.', ['timezone', 'time zone', 'hours', 'usa', 'uk', 'australia', 'available']],
  ['Will I own the website or data you deliver?', 'Yes. Once the order is paid in full, you own the code, designs and data we created for you. We only keep a copy if you ask us to, or for our own records as required by law.', ['own', 'ownership', 'code', 'rights', 'copyright']],
  ['Do you offer support after a website is delivered?', 'Yes. We fix bugs in our own code reported within 30 days of delivery at no cost, and we offer ongoing maintenance and small updates at our hourly rate.', ['support', 'maintenance', 'bug', 'after', 'launch', 'warranty']],
  ['Do you have a team or are you a solo freelancer?', 'Zeviro is a small agency: our founder works with a project manager, developers and trained data researchers, so large and urgent projects can be split across the team without losing quality.', ['team', 'agency', 'freelancer', 'people', 'who']],
].map(([title, body, keywords], i) => ({ title, body, keywords, order: i, category: 'General' }));
