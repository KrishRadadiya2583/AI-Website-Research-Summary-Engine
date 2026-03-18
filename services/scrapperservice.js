const puppeteer = require('puppeteer');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

// ----------------------
// PUPPETEER SCRAPER
// ----------------------
async function scrapeWithPuppeteer(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const content = await page.content();
    const dom = new JSDOM(content, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    const title = article?.title || await page.title() || '';
    const bodyText = article?.textContent || content;

    const description = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="description"]');
      return meta ? meta.getAttribute('content') : '';
    });

    const favicon = await page.evaluate(() => {
      const link = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
      return link ? link.href : '';
    });

    const headers = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      return headings.map(h => h.textContent.trim()).filter(text => text.length > 5).slice(0, 10);
    });

    return {
      title,
      description,
      favicon,
      bodyText,
      headers,
      source: 'puppeteer',
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// ----------------------
// MAIN FUNCTION
// ----------------------
async function scrapeWebsite(url) {
  try {
    console.log('Scraping with Puppeteer...');
    return await scrapeWithPuppeteer(url);
  } catch (err) {
    console.error('Puppeteer failed:', err.message);
    throw new Error('Scraping failed');
  }
}

module.exports = scrapeWebsite;