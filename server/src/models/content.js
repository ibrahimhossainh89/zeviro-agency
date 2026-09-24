import mongoose from 'mongoose';
import { slugify } from '../utils/http.js';

const { Schema } = mongoose;

// Shared shape for CMS-managed content collections.
function contentSchema(extra = {}, { autoSlug = false } = {}) {
  const s = new Schema(
    {
      title: { type: String, required: true, trim: true },
      slug: { type: String, unique: true, index: true },
      excerpt: String,
      body: String, // markdown / plain text with line breaks
      icon: String, // lucide icon name
      image: String,
      features: [String],
      tags: [String],
      order: { type: Number, default: 0 },
      published: { type: Boolean, default: true },
      seo: { metaTitle: String, metaDescription: String },
      ...extra,
    },
    { timestamps: true }
  );
  s.pre('save', async function slug(next) {
    // autoSlug: items without their own page (team, reviews…) keep the slug in sync with the name
    if (autoSlug && this.isModified('title') && !this.isModified('slug')) this.slug = slugify(this.title);
    if (!this.slug && this.title) this.slug = slugify(this.title);
    else if (this.slug) this.slug = slugify(this.slug);
    // guarantee uniqueness: foo, foo-2, foo-3 ...
    const base = this.slug;
    let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.constructor.exists({ slug: this.slug, _id: { $ne: this._id } })) this.slug = `${base}-${++n}`;
    next();
  });
  return s;
}

// A service can be ordered online through its packages (Basic / Standard / Premium).
const packageSchema = new Schema(
  {
    name: { type: String, required: true }, // Basic | Standard | Premium
    title: String, // e.g. "Starter B2B Leads"
    price: { type: Number, default: 0 }, // 0 = custom quote
    deliveryDays: Number,
    revisions: String, // "2", "Unlimited"
    description: String,
    features: [String],
    popular: { type: Boolean, default: false },
  },
  { _id: false }
);
export const Service = mongoose.model(
  'Service',
  contentSchema({
    technologies: [String],
    process: [String],
    packages: [packageSchema],
    orderable: { type: Boolean, default: true },
    hourlyRate: Number,
    pricingNote: String,
    deliverables: [String],
    marketplaceUrl: String, // matching Fiverr gig, if any
  })
);
export const Solution = mongoose.model('Solution', contentSchema({ audience: String }));
export const Industry = mongoose.model('Industry', contentSchema({ challenges: [String] }));
export const CaseStudy = mongoose.model(
  'CaseStudy',
  contentSchema({
    clientName: String,
    service: String,
    industry: String,
    challenge: String,
    solution: String,
    results: [String],
    technologies: [String],
    featured: { type: Boolean, default: false },
    gallery: [String],
    platform: String, // Fiverr | Upwork | Direct
    externalUrl: String, // live site or marketplace link
    year: String,
  })
);
export const BlogCategory = mongoose.model('BlogCategory', contentSchema());
export const BlogPost = mongoose.model(
  'BlogPost',
  contentSchema({
    category: String,
    type: { type: String, enum: ['Blog', 'Guide', 'Insight'], default: 'Blog' },
    author: String,
    readMinutes: Number,
    publishedAt: { type: Date, default: Date.now },
  })
);
export const Faq = mongoose.model(
  'Faq',
  contentSchema({
    // `title` = question, `body` = answer
    category: { type: String, default: 'General' },
    keywords: [String], // helps the chatbot match questions
    useInChatbot: { type: Boolean, default: true },
  })
);
export const Testimonial = mongoose.model(
  'Testimonial',
  contentSchema({
    // `title` = person name, `body` = quote
    role: String,
    company: String,
    rating: { type: Number, min: 1, max: 5, default: 5 },
    verified: { type: Boolean, default: false },
    platform: String, // Fiverr | Upwork | Direct
    country: String,
    sourceUrl: String,
    service: String,
  }, { autoSlug: true })
);
// Marketplace gigs (Fiverr / Upwork catalog) shown on the website
export const Gig = mongoose.model(
  'Gig',
  contentSchema({
    // `title` = gig title, `image` = gig cover
    platform: { type: String, default: 'Fiverr' },
    url: String,
    rating: Number,
    reviewsCount: Number,
    startingPrice: Number,
    service: String,
  }, { autoSlug: true })
);
// Company policies (terms, privacy, refunds ...) — editable in Admin → CMS
export const Policy = mongoose.model(
  'Policy',
  contentSchema({
    // `title` = policy name, `body` = markdown
    effectiveDate: Date,
    summary: String,
  })
);
export const TeamMember = mongoose.model(
  'TeamMember',
  contentSchema({
    // `title` = name
    role: String,
    linkedin: String,
  }, { autoSlug: true })
);

export const CONTENT_MODELS = {
  services: Service,
  solutions: Solution,
  industries: Industry,
  'case-studies': CaseStudy,
  blog: BlogPost,
  'blog-categories': BlogCategory,
  faqs: Faq,
  testimonials: Testimonial,
  team: TeamMember,
  gigs: Gig,
  policies: Policy,
};
