const mongoose = require('mongoose');
const Mixed = mongoose.Schema.Types.Mixed;

const HeadingsSchema = new mongoose.Schema({
  h1: [String], h2: [String], h3: [String],
  h4: [String], h5: [String], h6: [String],
}, { _id: false });

const HttpSchema = new mongoose.Schema({
  status: Number, statusText: String, contentType: String,
  server: String, poweredBy: String, contentLength: Number,
  loadTimeMs: Number, contentEncoding: String, cacheControl: String,
  etag: String, lastModified: String, setCookieCount: Number,
  responseHeaders: Mixed, protocol: String,
}, { _id: false });

const researchSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true, index: true },
  finalUrl: String,

  title: String,
  description: String,
  language: String,
  detectedLanguage: { code: String, confidence: Number },
  canonical: String,
  favicon: String,
  favicons: [Mixed],
  themeColor: String,
  author: String,
  publisher: String,
  robots: String,
  viewport: String,
  charset: String,
  generator: String,
  publishedTime: String,
  modifiedTime: String,
  keywordsMeta: String,

  openGraph: Mixed,
  twitter: Mixed,
  jsonLd: [Mixed],
  metaAll: [Mixed],

  summary: String,
  summaryExtractive: String,
  summaryAbstractive: String,
  summaryMethod: String,

  headings: HeadingsSchema,
  headingOutline: [{ level: Number, text: String }],
  keypoints: [String],
  paragraphs: [String],
  lists: [Mixed],
  tables: [Mixed],
  quotes: [String],

  images: [Mixed],
  imageStats: { total: Number, withAlt: Number, lazy: Number },
  videos: [Mixed],
  iframes: [Mixed],

  links: Mixed,
  social: [Mixed],
  emails: [String],
  phones: [String],
  entities: Mixed,

  forms: [Mixed],

  resources: Mixed,
  thirdPartyDomains: [Mixed],
  thirdPartyDomainCount: Number,
  trackers: [String],
  a11y: Mixed,

  keywords: [String],
  keywordsScored: [Mixed],
  bigrams: [Mixed],
  trigrams: [Mixed],
  sentiment: Mixed,

  stats: Mixed,
  readability: Mixed,
  textAnalytics: Mixed,
  readingTime: Mixed,
  seo: Mixed,
  security: Mixed,
  technologies: [String],
  company: Mixed,
  http: HttpSchema,

  robotsTxt: Mixed,
  sitemaps: [String],

  scrapedWith: String,
}, { timestamps: true });

module.exports = mongoose.model('Research', researchSchema);
