const path = require('path');

const scrapeWebsite = require('../services/scrapperservice');
const generateSummary = require('../services/summaryservice');
const cleanText = require('../utils/textcleaner');
const calculateReadingTime = require('../utils/readingtime');
const extractKeywords = require('../utils/keywordextractor');
const { extractKeywordsWithScores } = require('../utils/keywordextractor');
const { topPhrases } = require('../utils/ngrams');
const { readabilityScores } = require('../utils/textstats');
const analyzeSentiment = require('../utils/sentiment');
const detectLanguage = require('../utils/languagedetect');
const extractEntities = require('../utils/entityextractor');
const analyzeSEO = require('../utils/seoanalyzer');
const detectTechnologies = require('../utils/techdetect');
const analyzeSecurity = require('../utils/securityanalyzer');
const analyzeText = require('../utils/textanalytics');
const extractCompany = require('../utils/companyextractor');

const researchModel = require('../model/Research');
const { isConnected } = require('../config/db');

const index = (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
};

function buildResponse(doc) {
  // Convert Mongoose doc to plain object and strip huge fields not needed by client
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  delete obj.__v;
  // Prevent older cached documents from returning stale reading-time rules.
  obj.readingTime = calculateReadingTime.fromWordCount(obj.stats?.wordCount ?? obj.readingTime?.words);
  return obj;
}

const research = async (req, res) => {
  try {
    const url = req.researchUrl;
    const refresh = req.body.refresh === true || req.body.refresh === 'true';

    const dbUp = isConnected();
    if (!refresh && dbUp) {
      const existing = await researchModel.findOne({ url });
      if (existing) return res.json({ cached: true, ...buildResponse(existing) });
    }

    // 1) Scrape
    const raw = await scrapeWebsite(url);

    // 2) Clean primary body text
    const cleaned = cleanText(raw.bodyText);
    if (!cleaned || cleaned.length < 50) {
      return res.status(422).json({
        error: 'Insufficient content extracted from the page.',
        details: `Only ${cleaned.length} characters of text could be recovered.`,
      });
    }

    // 3) Summaries (local extractive + optional local abstractive)
    let summaryResult = { short: '', extractive: '', abstractive: '', method: 'none' };
    try {
      summaryResult = await generateSummary(cleaned, { sentences: 5 });
    } catch (err) {
      summaryResult.short = 'Summary generation failed.';
    }

    // 4) NLP + stats — all local
    const readingTime = calculateReadingTime(cleaned);
    const keywords = extractKeywords(cleaned, 15);
    const keywordsScored = extractKeywordsWithScores(cleaned, 15);
    const { bigrams, trigrams } = topPhrases(cleaned);
    const readability = readabilityScores(cleaned);
    const sentiment = analyzeSentiment(cleaned);
    const detectedLanguage = detectLanguage(cleaned);
    const entities = extractEntities(cleaned);

    // 5) SEO scoring
    const seo = analyzeSEO(raw);

    // 6) Tech signals — needs raw HTML to see script/link tags
    const technologies = detectTechnologies({
      html: raw.rawHtml || raw.bodyText,
      http: raw.http,
      generator: raw.generator,
    });

    // 7) Security header analysis
    const security = analyzeSecurity(raw);
    // Strip the full response header blob from what we persist
    if (raw.http?.responseHeaders) {
      const trimmedHeaders = {};
      Object.keys(raw.http.responseHeaders).slice(0, 40).forEach((k) => {
        trimmedHeaders[k] = raw.http.responseHeaders[k];
      });
      raw.http.responseHeaders = trimmedHeaders;
    }

    // 8) Deep text analytics
    const textAnalytics = analyzeText(cleaned);

    // 9) Company facts — CEO/CTO/founders, founded year, financials
    const company = extractCompany(raw);

    // Don't persist the raw HTML — it's only needed for detection
    delete raw.rawHtml;

    // Merge scraped emails/phones with pattern-extracted ones
    const emails = Array.from(new Set([...(raw.emails || []), ...(entities.emails || [])])).slice(0, 20);
    const phones = Array.from(new Set([...(raw.phones || []), ...(entities.phones || [])])).slice(0, 10);

    // Keypoints: headings prioritized by level, then first meaningful paragraphs
    const keypoints = [
      ...(raw.headings?.h1 || []),
      ...(raw.headings?.h2 || []),
      ...(raw.headings?.h3 || []),
    ].filter((h) => h && h.length > 4).slice(0, 12);

    // 7) Assemble & persist
    const doc = {
      url,
      finalUrl: raw.finalUrl,
      title: raw.title,
      description: raw.description,
      language: raw.language,
      detectedLanguage,
      canonical: raw.canonical,
      favicon: raw.favicon,
      favicons: raw.favicons,
      themeColor: raw.themeColor,
      author: raw.author,
      publisher: raw.publisher,
      robots: raw.robots,
      viewport: raw.viewport,
      charset: raw.charset,
      generator: raw.generator,
      publishedTime: raw.publishedTime,
      modifiedTime: raw.modifiedTime,
      openGraph: raw.openGraph,
      twitter: raw.twitter,
      jsonLd: raw.jsonLd,

      summary: summaryResult.short,
      summaryExtractive: summaryResult.extractive,
      summaryAbstractive: summaryResult.abstractive,
      summaryMethod: summaryResult.method,

      headings: raw.headings,
      headingOutline: raw.headingOutline,
      keypoints,
      paragraphs: raw.paragraphs,
      lists: raw.lists,
      tables: raw.tables,
      quotes: raw.quotes,

      images: raw.images,
      imageStats: raw.imageStats,
      videos: raw.videos,
      iframes: raw.iframes,

      links: raw.links,
      social: raw.social,

      emails,
      phones,
      entities,

      forms: raw.forms,

      resources: raw.resources,
      thirdPartyDomains: raw.thirdPartyDomains,
      thirdPartyDomainCount: raw.thirdPartyDomainCount,
      trackers: raw.trackers,
      a11y: raw.a11y,

      keywords,
      keywordsScored,
      bigrams,
      trigrams,
      sentiment,

      stats: raw.stats,
      readability,
      textAnalytics,
      readingTime,
      seo,
      security,
      technologies,
      company,
      http: raw.http,

      robotsTxt: raw.robotsTxt,
      sitemaps: raw.sitemaps,
      keywordsMeta: raw.keywordsMeta,
      metaAll: raw.metaAll,

      scrapedWith: raw.source,
    };

    let saved = doc;
    if (dbUp) {
      try {
        saved = await researchModel.findOneAndUpdate(
          { url },
          { $set: doc },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
      } catch {
        // Caching is optional; return the completed analysis if persistence fails.
      }
    }

    res.json({ cached: false, dbAvailable: dbUp, ...buildResponse(saved) });
  } catch (error) {
    console.error(`[research] ${error.message}`);
    const status = error.response?.status === 404 || error.message?.includes('Page not available') ? 404 : 502;
    res.status(status).json({
      error: 'Failed to analyze website.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = { index, research };
