const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SOCIAL_HOSTS = [
  'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'pinterest.com', 'reddit.com', 'github.com',
  'medium.com', 'discord.gg', 'discord.com', 't.me', 'wa.me', 'threads.net',
];

const TRACKING_HOSTS = /google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|mixpanel|segment\.io|amplitude|posthog|matomo|clarity\.ms|adroll|criteo|taboola|outbrain/i;

function absoluteUrl(maybeUrl, base) {
  if (!maybeUrl) return '';
  try { return new URL(maybeUrl, base).href; } catch { return ''; }
}
function safeHost(u) {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function detectSocial(href) {
  const host = safeHost(href);
  if (!host) return null;
  const match = SOCIAL_HOSTS.find((h) => host === h || host.endsWith('.' + h));
  return match ? match.split('.')[0] : null;
}

// Extract inline hex/rgb colors from a stylesheet-ish string
function extractColors(text, limit = 12) {
  if (!text) return [];
  const found = new Set();
  (text.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi) || []).forEach((c) => found.add(c.toLowerCase()));
  (text.match(/rgba?\([^)]+\)/gi) || []).slice(0, 30).forEach((c) => found.add(c.replace(/\s+/g, '')));
  return Array.from(found).slice(0, limit);
}

// ----------------------
// Rich extraction from a Cheerio instance
// ----------------------
function extractFromCheerio($, url, extras = {}) {
  const baseHref = $('base').attr('href') || url;

  // Grab the raw HTML BEFORE stripping — some signals live in <script>/<style>
  const rawHtml = $.html();

  // Strip noise for text extraction
  const $work = $.root().clone();
  $work.find('script, style, noscript, template, svg, iframe').remove();
  $work.find('nav, footer, header, aside').remove();
  $work.find('.ads, .advertisement, .sidebar, .menu, .cookie, .cookies, [aria-hidden="true"]').remove();

  // ---------- Meta ----------
  const meta = {};
  const metaAll = [];
  $('meta').each((_, el) => {
    const name = ($(el).attr('name') || $(el).attr('property') || $(el).attr('itemprop') || '').toLowerCase();
    const content = $(el).attr('content');
    if (name && content) {
      if (!meta[name]) meta[name] = content;
      metaAll.push({ name, content });
    }
  });

  const title =
    $('title').first().text().trim() ||
    meta['og:title'] ||
    meta['twitter:title'] ||
    $('h1').first().text().trim() ||
    '';

  const description =
    meta['description'] || meta['og:description'] || meta['twitter:description'] || '';

  const language = $('html').attr('lang') || meta['language'] || meta['content-language'] || '';
  const canonical = absoluteUrl($('link[rel="canonical"]').attr('href'), baseHref);
  const themeColor = meta['theme-color'] || '';
  const author = meta['author'] || meta['article:author'] || '';
  const publisher = meta['publisher'] || meta['og:site_name'] || '';
  const robots = meta['robots'] || '';
  const viewport = meta['viewport'] || '';
  const charset = $('meta[charset]').attr('charset') || '';
  const generator = meta['generator'] || '';
  const publishedTime = meta['article:published_time'] || meta['date'] || meta['pubdate'] || '';
  const modifiedTime = meta['article:modified_time'] || meta['last-modified'] || '';
  const keywordsMeta = meta['keywords'] || '';

  // ---------- Open Graph / Twitter ----------
  const openGraph = {};
  const twitter = {};
  Object.entries(meta).forEach(([k, v]) => {
    if (k.startsWith('og:')) openGraph[k.slice(3)] = v;
    else if (k.startsWith('twitter:')) twitter[k.slice(8)] = v;
  });

  // ---------- Favicons ----------
  const favicons = [];
  $('link[rel*="icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) => {
    const href = absoluteUrl($(el).attr('href'), baseHref);
    if (!href) return;
    favicons.push({
      href,
      sizes: $(el).attr('sizes') || '',
      type: $(el).attr('type') || '',
      rel: $(el).attr('rel') || '',
    });
  });
  const favicon = favicons[0]?.href || absoluteUrl('/favicon.ico', baseHref);

  // ---------- JSON-LD ----------
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) jsonLd.push(...parsed);
      else jsonLd.push(parsed);
    } catch { /* ignore */ }
  });

  // ---------- Headings ----------
  const headings = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
  $work.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) headings[tag].push(text);
  });
  const headingOutline = [];
  $work.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const level = parseInt(el.tagName.slice(1), 10);
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text) headingOutline.push({ level, text });
  });

  // ---------- Body text ----------
  let bodyText =
    $work.find('article').text() ||
    $work.find('main').text() ||
    $work.find('#content').text() ||
    $work.find('.content, .post, .entry').text() ||
    $work.find('body').text();
  bodyText = bodyText.replace(/\s+/g, ' ').trim();

  // ---------- Paragraphs ----------
  const paragraphs = [];
  $work.find('p').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 20) paragraphs.push(text);
  });

  // ---------- Lists ----------
  const lists = [];
  $work.find('ul, ol').each((_, el) => {
    const items = $(el).children('li')
      .map((__, li) => $(li).text().replace(/\s+/g, ' ').trim())
      .get().filter(Boolean);
    if (items.length) lists.push({ type: el.tagName.toLowerCase(), items: items.slice(0, 30) });
  });

  // ---------- Tables ----------
  const tables = [];
  $work.find('table').each((_, el) => {
    tables.push({
      caption: $(el).find('caption').first().text().trim(),
      headers: $(el).find('th').map((__, th) => $(th).text().trim()).get(),
      rowCount: $(el).find('tr').length,
    });
  });

  // ---------- Quotes ----------
  const quotes = $work.find('blockquote, q')
    .map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get()
    .filter((t) => t.length > 15).slice(0, 15);

  // ---------- Images ----------
  const images = [];
  $work.find('img').each((_, el) => {
    const src = absoluteUrl($(el).attr('src') || $(el).attr('data-src'), baseHref);
    if (!src) return;
    images.push({
      src,
      alt: $(el).attr('alt') || '',
      title: $(el).attr('title') || '',
      width: $(el).attr('width') || '',
      height: $(el).attr('height') || '',
      lazy: ($(el).attr('loading') || '').toLowerCase() === 'lazy',
    });
  });
  const imagesWithAlt = images.filter((i) => i.alt.trim()).length;
  const imagesLazy = images.filter((i) => i.lazy).length;

  // ---------- Videos / iframes ----------
  const videos = [];
  const iframes = [];
  $('video').each((_, el) => {
    const src = absoluteUrl($(el).attr('src') || $(el).find('source').attr('src'), baseHref);
    if (src) videos.push({ type: 'html5', src });
  });
  $('iframe').each((_, el) => {
    const src = absoluteUrl($(el).attr('src'), baseHref);
    if (!src) return;
    const host = safeHost(src);
    iframes.push({ src, host, title: $(el).attr('title') || '' });
    if (/youtube\.com|youtu\.be|vimeo\.com|wistia|dailymotion/.test(host)) {
      videos.push({ type: 'embed', src, host });
    }
  });

  // ---------- Links ----------
  const rawLinks = [];
  const linksSeen = new Set();
  $('a[href]').each((_, el) => {
    const raw = $(el).attr('href');
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) return;
    const abs = absoluteUrl(raw, baseHref);
    if (!abs || linksSeen.has(abs)) return;
    linksSeen.add(abs);
    rawLinks.push({
      href: abs,
      text: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 120),
      rel: $(el).attr('rel') || '',
      target: $(el).attr('target') || '',
    });
  });
  const pageHost = safeHost(url);
  const linksInternal = [];
  const linksExternal = [];
  const social = [];
  rawLinks.forEach((l) => {
    if (l.href.startsWith('mailto:') || l.href.startsWith('tel:')) return;
    const host = safeHost(l.href);
    const socialName = detectSocial(l.href);
    if (socialName) social.push({ platform: socialName, href: l.href });
    if (host && host === pageHost) linksInternal.push(l);
    else linksExternal.push(l);
  });
  const linksNoText = rawLinks.filter((l) => !l.text).length;
  const linksNofollow = rawLinks.filter((l) => /nofollow/i.test(l.rel)).length;
  const linksNewTab = rawLinks.filter((l) => l.target === '_blank').length;

  // ---------- Contact ----------
  const emailSet = new Set();
  (rawHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
    .forEach((m) => emailSet.add(m.toLowerCase()));
  $('a[href^="mailto:"]').each((_, el) => {
    const v = ($(el).attr('href') || '').replace(/^mailto:/, '').split('?')[0];
    if (v) emailSet.add(v.toLowerCase());
  });
  const phoneSet = new Set();
  $('a[href^="tel:"]').each((_, el) => {
    const v = ($(el).attr('href') || '').replace(/^tel:/, '');
    if (v) phoneSet.add(v.trim());
  });

  // ---------- Forms ----------
  const forms = [];
  $('form').each((_, el) => {
    const inputs = $(el).find('input, textarea, select');
    const hasCaptcha = /captcha|recaptcha|hcaptcha|turnstile/i.test($(el).html() || '');
    forms.push({
      action: absoluteUrl($(el).attr('action'), baseHref) || '',
      method: ($(el).attr('method') || 'get').toLowerCase(),
      inputs: inputs.length,
      hasCaptcha,
    });
  });

  // ---------- Scripts / Styles / Fonts / Preloads ----------
  const scriptsExternal = [];
  const scriptsInlineChars = [];
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      const abs = absoluteUrl(src, baseHref);
      scriptsExternal.push({ src: abs, async: $(el).attr('async') != null, defer: $(el).attr('defer') != null, type: $(el).attr('type') || '' });
    } else {
      const inline = $(el).contents().text();
      if (inline) scriptsInlineChars.push(inline.length);
    }
  });
  const stylesheets = [];
  $('link[rel="stylesheet"], link[rel="preload"][as="style"]').each((_, el) => {
    const href = absoluteUrl($(el).attr('href'), baseHref);
    if (href) stylesheets.push({ href, media: $(el).attr('media') || '' });
  });
  const preloads = [];
  $('link[rel="preload"], link[rel="prefetch"], link[rel="preconnect"], link[rel="dns-prefetch"]').each((_, el) => {
    preloads.push({
      rel: $(el).attr('rel'),
      href: absoluteUrl($(el).attr('href'), baseHref),
      as: $(el).attr('as') || '',
    });
  });

  // Fonts — from @font-face and Google Fonts CSS URLs
  const fontFamilies = new Set();
  $('style').each((_, el) => {
    const css = $(el).contents().text();
    if (!css) return;
    (css.match(/font-family\s*:\s*([^;}"]+)/gi) || []).forEach((m) => {
      m.replace(/font-family\s*:\s*/i, '').split(',').forEach((f) => {
        const cleaned = f.replace(/['"!important]/g, '').trim();
        if (cleaned && cleaned.length < 40) fontFamilies.add(cleaned);
      });
    });
  });
  $('link[href*="fonts.googleapis.com"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const familyMatch = href.match(/family=([^&]+)/);
    if (familyMatch) {
      familyMatch[1].split('|').forEach((f) => {
        const name = decodeURIComponent(f.split(':')[0]).replace(/\+/g, ' ').trim();
        if (name) fontFamilies.add(name);
      });
    }
  });

  // Color palette — from inline styles + theme-color
  const inlineStyles = $('[style]').map((_, el) => $(el).attr('style')).get().join(';');
  const styleTagContent = $('style').map((_, el) => $(el).contents().text()).get().join('\n');
  const paletteSet = new Set(extractColors(inlineStyles + '\n' + styleTagContent, 20));
  if (themeColor) paletteSet.add(themeColor.toLowerCase());
  const palette = Array.from(paletteSet).slice(0, 12);

  // ---------- Third-party domains ----------
  const thirdPartyMap = new Map();
  const noteDomain = (u, kind) => {
    const host = safeHost(u);
    if (!host || host === pageHost) return;
    const entry = thirdPartyMap.get(host) || { host, count: 0, kinds: new Set() };
    entry.count++;
    entry.kinds.add(kind);
    thirdPartyMap.set(host, entry);
  };
  scriptsExternal.forEach((s) => noteDomain(s.src, 'script'));
  stylesheets.forEach((s) => noteDomain(s.href, 'style'));
  images.forEach((i) => noteDomain(i.src, 'image'));
  iframes.forEach((i) => noteDomain(i.src, 'iframe'));
  linksExternal.forEach((l) => noteDomain(l.href, 'link'));
  const thirdPartyDomains = Array.from(thirdPartyMap.values())
    .sort((a, b) => b.count - a.count)
    .map((e) => ({ host: e.host, count: e.count, kinds: Array.from(e.kinds) }));

  // ---------- Trackers ----------
  const trackers = new Set();
  scriptsExternal.forEach((s) => {
    if (TRACKING_HOSTS.test(s.src)) trackers.add(safeHost(s.src) || s.src.slice(0, 60));
  });
  if (/gtag\(|dataLayer|fbq\(|_hsq|analytics\.track/i.test(rawHtml)) {
    if (/gtag\(|dataLayer/i.test(rawHtml)) trackers.add('Google gtag/dataLayer');
    if (/fbq\(/i.test(rawHtml)) trackers.add('Meta Pixel (fbq)');
    if (/_hsq/i.test(rawHtml)) trackers.add('HubSpot');
  }

  // ---------- Accessibility signals ----------
  const a11y = {
    imagesWithoutAlt: images.length - imagesWithAlt,
    linksWithoutText: linksNoText,
    inputsWithoutLabel: 0,
    ariaAttributes: 0,
    landmarkRoles: [],
    hasSkipLink: false,
    langAttrPresent: !!language,
    documentTitle: !!title,
  };
  $('input, textarea, select').each((_, el) => {
    const id = $(el).attr('id');
    const hasAriaLabel = !!$(el).attr('aria-label') || !!$(el).attr('aria-labelledby');
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const hasParentLabel = $(el).parents('label').length > 0;
    if (!hasLabel && !hasAriaLabel && !hasParentLabel && ($(el).attr('type') || '') !== 'hidden') {
      a11y.inputsWithoutLabel++;
    }
  });
  a11y.ariaAttributes = (rawHtml.match(/\baria-[a-z]+=/gi) || []).length;
  const landmarks = new Set();
  ['banner', 'navigation', 'main', 'complementary', 'contentinfo', 'search', 'form'].forEach((r) => {
    if ($(`[role="${r}"]`).length) landmarks.add(r);
  });
  ['header', 'nav', 'main', 'aside', 'footer'].forEach((tag) => {
    if ($(tag).length) landmarks.add(tag);
  });
  a11y.landmarkRoles = Array.from(landmarks);
  a11y.hasSkipLink = $('a[href^="#"]').filter((_, el) => /skip|jump/i.test($(el).text())).length > 0;

  // ---------- Content sizing ----------
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = bodyText.length;
  const sentenceCount = (bodyText.match(/[.!?]+\s|[.!?]+$/g) || []).length;

  return {
    rawHtml: rawHtml.slice(0, 500_000),
    url,
    finalUrl: extras.finalUrl || url,
    http: extras.http || null,
    title,
    description,
    language,
    canonical,
    themeColor,
    author,
    publisher,
    robots,
    viewport,
    charset,
    generator,
    publishedTime,
    modifiedTime,
    keywordsMeta,
    favicon,
    favicons,
    openGraph,
    twitter,
    jsonLd,
    metaAll: metaAll.slice(0, 100),
    headings,
    headingOutline,
    paragraphs: paragraphs.slice(0, 40),
    lists: lists.slice(0, 15),
    tables: tables.slice(0, 10),
    quotes,
    images: images.slice(0, 40),
    imageStats: {
      total: images.length,
      withAlt: imagesWithAlt,
      lazy: imagesLazy,
    },
    videos: videos.slice(0, 15),
    iframes: iframes.slice(0, 15),
    links: {
      total: rawLinks.length,
      internal: linksInternal.slice(0, 40),
      external: linksExternal.slice(0, 40),
      internalCount: linksInternal.length,
      externalCount: linksExternal.length,
      noText: linksNoText,
      nofollow: linksNofollow,
      newTab: linksNewTab,
    },
    social,
    emails: Array.from(emailSet).slice(0, 20),
    phones: Array.from(phoneSet).slice(0, 10),
    forms,
    resources: {
      scriptsExternal: scriptsExternal.slice(0, 40),
      scriptsExternalCount: scriptsExternal.length,
      scriptsInlineCount: scriptsInlineChars.length,
      scriptsInlineBytes: scriptsInlineChars.reduce((a, b) => a + b, 0),
      stylesheets: stylesheets.slice(0, 30),
      stylesheetCount: stylesheets.length,
      preloads: preloads.slice(0, 20),
      preloadCount: preloads.length,
      fontFamilies: Array.from(fontFamilies).slice(0, 20),
      palette,
    },
    thirdPartyDomains: thirdPartyDomains.slice(0, 30),
    trackers: Array.from(trackers).slice(0, 20),
    a11y,
    stats: {
      wordCount,
      charCount,
      paragraphCount: paragraphs.length,
      sentenceCount,
    },
    bodyText,
    source: extras.source || 'cheerio',
  };
}

// ----------------------
// AXIOS + CHEERIO SCRAPER
// ----------------------
async function scrapeWithAxios(url) {
  const start = Date.now();
  const response = await axios.get(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    },
    timeout: 15000,
    maxRedirects: 5,
    decompress: true,
    validateStatus: (s) => s < 500,
  });
  const elapsed = Date.now() - start;
  const h = response.headers || {};
  const $ = cheerio.load(response.data);
  const http = {
    status: response.status,
    statusText: response.statusText,
    contentType: h['content-type'] || '',
    server: h.server || '',
    poweredBy: h['x-powered-by'] || '',
    contentLength: Number(h['content-length']) || Buffer.byteLength(response.data || '', 'utf8'),
    loadTimeMs: elapsed,
    contentEncoding: h['content-encoding'] || '',
    cacheControl: h['cache-control'] || '',
    etag: h.etag || '',
    lastModified: h['last-modified'] || '',
    setCookieCount: Array.isArray(h['set-cookie']) ? h['set-cookie'].length : (h['set-cookie'] ? 1 : 0),
    responseHeaders: h,
    protocol: 'http/1.1',
  };
  return extractFromCheerio($, url, {
    finalUrl: response.request?.res?.responseUrl || url,
    http,
    source: 'axios',
  });
}

// ----------------------
// PUPPETEER SCRAPER
// ----------------------
async function scrapeWithPuppeteer(url) {
  let browser;
  const start = Date.now();
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.setViewport({ width: 1366, height: 768 });
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const elapsed = Date.now() - start;
    const html = await page.content();
    const finalUrl = page.url();
    const $ = cheerio.load(html);

    let readabilityText = '';
    let readabilityTitle = '';
    try {
      const dom = new JSDOM(html, { url: finalUrl });
      const article = new Readability(dom.window.document).parse();
      if (article) {
        readabilityText = (article.textContent || '').replace(/\s+/g, ' ').trim();
        readabilityTitle = article.title || '';
      }
    } catch { /* optional */ }

    const h = response ? response.headers() : {};
    const http = response ? {
      status: response.status(),
      statusText: response.statusText(),
      contentType: h['content-type'] || '',
      server: h.server || '',
      poweredBy: h['x-powered-by'] || '',
      contentLength: Number(h['content-length']) || Buffer.byteLength(html, 'utf8'),
      loadTimeMs: elapsed,
      contentEncoding: h['content-encoding'] || '',
      cacheControl: h['cache-control'] || '',
      etag: h.etag || '',
      lastModified: h['last-modified'] || '',
      setCookieCount: h['set-cookie'] ? String(h['set-cookie']).split('\n').length : 0,
      responseHeaders: h,
      protocol: 'http/1.1',
    } : null;

    const data = extractFromCheerio($, url, { finalUrl, http, source: 'puppeteer' });
    if (readabilityText && readabilityText.length > data.bodyText.length * 0.5) {
      data.bodyText = readabilityText;
      data.stats.wordCount = readabilityText.split(/\s+/).filter(Boolean).length;
      data.stats.charCount = readabilityText.length;
    }
    if (readabilityTitle && !data.title) data.title = readabilityTitle;
    return data;
  } finally {
    if (browser) { try { await browser.close(); } catch { /* ignore */ } }
  }
}

// ----------------------
// robots.txt / sitemap.xml probe
// ----------------------
async function probeRobotsAndSitemap(url) {
  const result = { robotsTxt: null, sitemaps: [] };
  try {
    const origin = new URL(url).origin;
    const robotsUrl = origin + '/robots.txt';
    try {
      const resp = await axios.get(robotsUrl, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 5000,
        maxRedirects: 3,
        validateStatus: (s) => s < 500,
      });
      if (resp.status === 200 && typeof resp.data === 'string') {
        const sitemapMatches = (resp.data.match(/^\s*Sitemap:\s*(\S+)/gim) || [])
          .map((line) => line.replace(/^\s*Sitemap:\s*/i, '').trim());
        const userAgents = Array.from(new Set(
          (resp.data.match(/^\s*User-agent:\s*(\S+)/gim) || [])
            .map((l) => l.replace(/^\s*User-agent:\s*/i, '').trim())
        )).slice(0, 12);
        const disallowCount = (resp.data.match(/^\s*Disallow:/gim) || []).length;
        const allowCount = (resp.data.match(/^\s*Allow:/gim) || []).length;
        result.robotsTxt = {
          url: robotsUrl,
          exists: true,
          bytes: resp.data.length,
          userAgents,
          disallowCount,
          allowCount,
          sitemaps: sitemapMatches,
          preview: resp.data.slice(0, 600),
        };
        result.sitemaps.push(...sitemapMatches);
      } else {
        result.robotsTxt = { url: robotsUrl, exists: false, status: resp.status };
      }
    } catch (err) {
      result.robotsTxt = { url: robotsUrl, exists: false, error: err.message };
    }

    // If no sitemap declared in robots.txt, try /sitemap.xml
    if (result.sitemaps.length === 0) {
      const sitemapUrl = origin + '/sitemap.xml';
      try {
        const resp = await axios.head(sitemapUrl, {
          headers: { 'User-Agent': USER_AGENT },
          timeout: 5000,
          maxRedirects: 3,
          validateStatus: (s) => s < 500,
        });
        if (resp.status < 400) result.sitemaps.push(sitemapUrl);
      } catch { /* silent */ }
    }
    result.sitemaps = Array.from(new Set(result.sitemaps)).slice(0, 10);
  } catch { /* ignore malformed URL */ }
  return result;
}

// ----------------------
// MAIN — with fallback
// ----------------------
async function scrapeWebsite(url) {
  const probePromise = probeRobotsAndSitemap(url);
  let data;
  try {
    data = await scrapeWithAxios(url);
    if (data.stats.wordCount < 80) {
      try {
        const rich = await scrapeWithPuppeteer(url);
        if (rich.stats.wordCount > data.stats.wordCount) data = rich;
      } catch { /* keep axios data */ }
    }
  } catch (axiosErr) {
    try {
      data = await scrapeWithPuppeteer(url);
    } catch (puppeteerErr) {
      throw new Error(
        `Scraping failed. axios: ${axiosErr.message}; puppeteer: ${puppeteerErr.message}`
      );
    }
  }
  const probe = await probePromise;
  data.robotsTxt = probe.robotsTxt;
  data.sitemaps = probe.sitemaps;
  return data;
}

module.exports = scrapeWebsite;
module.exports.scrapeWithAxios = scrapeWithAxios;
module.exports.scrapeWithPuppeteer = scrapeWithPuppeteer;
