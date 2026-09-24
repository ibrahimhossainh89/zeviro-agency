import { useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import Resource from '../../components/Resource';
import { Badge, Tabs, Icon, ICONS } from '../../components/ui';
import { fmtDate, SERVICES, INDUSTRIES } from '../../lib/utils';

const ICON_OPTIONS = Object.keys(ICONS);
const base = [
  { name: 'title', label: 'Title', required: true },
  { name: 'slug', label: 'URL slug', hint: 'Leave blank to generate from title' },
  { name: 'order', label: 'Sort order', type: 'number', default: 0 },
  { name: 'published', label: 'Published', type: 'checkbox', checkboxLabel: 'Visible on website', default: true },
];
const seo = [
  { name: 'seo.metaTitle', label: 'SEO title' },
  { name: 'seo.metaDescription', label: 'SEO meta description' },
];

const TYPES = {
  services: {
    label: 'Services', public: '/services',
    fields: [...base, { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS }, { name: 'image', label: 'Cover image', type: 'image' }, { name: 'excerpt', label: 'Short description', type: 'textarea', rows: 2 }, { name: 'body', label: 'Page content (markdown: ## heading, - list)', type: 'textarea', rows: 10 }, { name: 'features', label: "What's included", type: 'lines' }, { name: 'deliverables', label: 'What the client receives', type: 'lines' }, { name: 'technologies', label: 'Tools & technologies', type: 'tags' }, { name: 'orderable', label: 'Online ordering', type: 'checkbox', checkboxLabel: 'Clients can order this service online', default: true }, { name: 'packages', label: 'Packages (Basic / Standard / Premium)', type: 'packages' }, { name: 'hourlyRate', label: 'Hourly rate (USD, optional)', type: 'number' }, { name: 'marketplaceUrl', label: 'Matching Fiverr gig URL (optional)' }, { name: 'pricingNote', label: 'Pricing note', type: 'textarea', rows: 2 }, { name: 'tags', label: 'Chatbot keywords', type: 'tags', hint: 'Helps the AI chatbot match questions' }, ...seo],
  },
  solutions: {
    label: 'Solutions', public: '/solutions',
    fields: [...base, { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS }, { name: 'audience', label: 'Best for' }, { name: 'excerpt', label: 'Short description', type: 'textarea', rows: 2 }, { name: 'body', label: 'Page content', type: 'textarea', rows: 8 }, { name: 'features', label: 'Highlights', type: 'lines' }, { name: 'tags', label: 'Chatbot keywords', type: 'tags' }, ...seo],
  },
  industries: {
    label: 'Industries', public: '/industries',
    fields: [...base, { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS }, { name: 'excerpt', label: 'Short description', type: 'textarea', rows: 2 }, { name: 'body', label: 'Page content', type: 'textarea', rows: 8 }, { name: 'challenges', label: 'Challenges we solve', type: 'lines' }, { name: 'tags', label: 'Chatbot keywords', type: 'tags' }, ...seo],
  },
  'case-studies': {
    label: 'Portfolio', public: '/portfolio',
    fields: [...base, { name: 'featured', label: 'Featured', type: 'checkbox', checkboxLabel: 'Show on homepage' }, { name: 'clientName', label: 'Client (with permission)' }, { name: 'service', label: 'Service', type: 'select', options: SERVICES }, { name: 'industry', label: 'Industry', type: 'select', options: INDUSTRIES }, { name: 'platform', label: 'Delivered via', type: 'select', options: ['Fiverr', 'Upwork', 'Direct'] }, { name: 'year', label: 'Year' }, { name: 'image', label: 'Cover image', type: 'image' }, { name: 'gallery', label: 'More images (one URL per line)', type: 'lines' }, { name: 'externalUrl', label: 'Live link / marketplace link' }, { name: 'excerpt', label: 'Summary', type: 'textarea', rows: 2 }, { name: 'challenge', label: 'Challenge', type: 'textarea' }, { name: 'solution', label: 'Solution', type: 'textarea' }, { name: 'results', label: 'Results (only truthful, verifiable outcomes)', type: 'lines' }, { name: 'technologies', label: 'Technologies', type: 'tags' }, ...seo],
  },
  blog: {
    label: 'Blog / Guides / Insights', public: '/resources',
    fields: [...base, { name: 'type', label: 'Type', type: 'select', options: ['Blog', 'Guide', 'Insight'], default: 'Blog', required: true }, { name: 'category', label: 'Category' }, { name: 'author', label: 'Author', default: 'Zeviro Team' }, { name: 'publishedAt', label: 'Publish date', type: 'date' }, { name: 'readMinutes', label: 'Read time (min)', type: 'number' }, { name: 'image', label: 'Cover image', type: 'image' }, { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2 }, { name: 'body', label: 'Article (markdown)', type: 'textarea', rows: 14 }, { name: 'tags', label: 'Tags', type: 'tags' }, ...seo],
  },
  faqs: {
    label: 'FAQs / Chatbot knowledge', public: '/faq',
    fields: [{ name: 'title', label: 'Question', required: true, full: true }, { name: 'body', label: 'Answer (also used by the AI chatbot)', type: 'textarea', rows: 5, required: true }, { name: 'keywords', label: 'Chatbot keywords', type: 'tags', hint: 'Words visitors might use, e.g. price, cost, budget' }, { name: 'category', label: 'Category', default: 'General' }, { name: 'order', label: 'Sort order', type: 'number', default: 0 }, { name: 'useInChatbot', label: 'Chatbot', type: 'checkbox', checkboxLabel: 'Use in AI chatbot', default: true }, { name: 'published', label: 'Published', type: 'checkbox', checkboxLabel: 'Show on FAQ page', default: true }],
  },
  testimonials: {
    label: 'Testimonials', public: '/',
    fields: [{ name: 'title', label: 'Reviewer (name or username)', required: true }, { name: 'platform', label: 'Platform', type: 'select', options: ['Fiverr', 'Upwork', 'Direct', 'Google'] }, { name: 'country', label: 'Country' }, { name: 'service', label: 'Service' }, { name: 'role', label: 'Role' }, { name: 'company', label: 'Company' }, { name: 'rating', label: 'Rating (1–5)', type: 'number', default: 5 }, { name: 'body', label: 'Review text (exactly as written)', type: 'textarea', required: true }, { name: 'sourceUrl', label: 'Link to the review' }, { name: 'image', label: 'Photo', type: 'image' }, { name: 'verified', label: 'Verified', type: 'checkbox', checkboxLabel: 'Real review from a real client' }, { name: 'published', label: 'Published', type: 'checkbox', checkboxLabel: 'Show on website' }, { name: 'order', label: 'Sort order', type: 'number', default: 0 }],
  },
  gigs: {
    label: 'Fiverr / Upwork gigs', public: '/hire-us',
    fields: [{ name: 'title', label: 'Gig title', required: true, full: true }, { name: 'platform', label: 'Platform', type: 'select', options: ['Fiverr', 'Upwork'], default: 'Fiverr' }, { name: 'service', label: 'Service', type: 'select', options: SERVICES }, { name: 'url', label: 'Gig URL', required: true, full: true }, { name: 'image', label: 'Gig image', type: 'image', hint: 'Download your gig image from Fiverr and upload it here' }, { name: 'startingPrice', label: 'Starting price (USD)', type: 'number' }, { name: 'rating', label: 'Rating', type: 'number' }, { name: 'reviewsCount', label: 'Number of reviews', type: 'number' }, { name: 'excerpt', label: 'Short description', type: 'textarea', rows: 2 }, { name: 'order', label: 'Sort order', type: 'number', default: 0 }, { name: 'published', label: 'Published', type: 'checkbox', checkboxLabel: 'Show on website', default: true }],
  },
  policies: {
    label: 'Policies', public: '/policies',
    fields: [...base, { name: 'icon', label: 'Icon', type: 'select', options: ICON_OPTIONS }, { name: 'effectiveDate', label: 'Effective date', type: 'date' }, { name: 'excerpt', label: 'Summary', type: 'textarea', rows: 2 }, { name: 'body', label: 'Policy text (markdown: ## heading, - list)', type: 'textarea', rows: 18 }, ...seo],
  },
  team: {
    label: 'Team', public: '/team',
    fields: [{ name: 'title', label: 'Name', required: true }, { name: 'role', label: 'Role' }, { name: 'slug', label: 'Slug (internal ID)', hint: 'Updates automatically when you change the name — or type your own' }, { name: 'image', label: 'Photo', type: 'image' }, { name: 'linkedin', label: 'LinkedIn URL' }, { name: 'excerpt', label: 'Short bio', type: 'textarea', rows: 3 }, { name: 'order', label: 'Sort order', type: 'number', default: 0 }, { name: 'published', label: 'Published', type: 'checkbox', checkboxLabel: 'Show on Team page', default: true }],
  },
};

export default function Cms() {
  const { type = 'services' } = useParams();
  const nav = useNavigate();
  const t = TYPES[type] || TYPES.services;
  return (
    <div>
      <div className="mb-6 overflow-x-auto"><Tabs tabs={Object.entries(TYPES).map(([k, v]) => ({ value: k, label: v.label }))} value={type} onChange={(v) => nav(`/admin/cms/${v}`)} /></div>
      <Resource
        key={type}
        endpoint={`/cms/${type}`}
        title={t.label}
        subtitle="Changes go live on the website immediately."
        fields={t.fields}
        createLabel="New"
        headerActions={<a href={t.public} target="_blank" rel="noopener noreferrer" className="btn-ghost"><ExternalLink className="h-4 w-4" /> View on site</a>}
        columns={[
          { label: 'Title', render: (r) => <span className="flex items-center gap-2 font-medium text-white">{r.icon && <Icon name={r.icon} className="h-4 w-4 text-brand-300" />}{r.title}</span> },
          { label: 'Slug', render: (r) => <span className="font-mono text-xs text-slate-500">{r.slug}</span> },
          { label: 'Order', key: 'order' },
          { label: 'Status', render: (r) => <Badge tone={r.published ? 'green' : 'gray'}>{r.published ? 'Published' : 'Hidden'}</Badge> },
          { label: 'Updated', render: (r) => <span className="text-xs text-slate-500">{fmtDate(r.updatedAt)}</span> },
        ]}
      />
    </div>
  );
}
