const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

// ----------------------
// AXIOS + CHEERIO SCRAPER (Fallback)
// ----------------------
async function scrapeWithAxios(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $('script, style, noscript, iframe, svg').remove();
    $('nav, footer, header, aside').remove();
    $('.ads, .advertisement, .sidebar, .menu').remove();

    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    const description = $('meta[name="description"]').attr('content') || '';
    const favicon = $('link[rel="icon"]').attr('href') || $('link[rel="shortcut icon"]').attr('href') || '';

    let bodyText = $('article').text() || $('main').text() || $('#content').text() || $('body').text();
    bodyText = bodyText.replace(/\s+/g, ' ').trim();

    const headers = $('h1, h2, h3').map((i, el) => $(el).text().trim()).get().filter(text => text.length > 5).slice(0, 10);

    return {
      title,
      description,
      favicon: favicon ? (favicon.startsWith('http') ? favicon : new URL(favicon, url).href) : '',
      bodyText,
      headers,
      source: 'axios'
    };
  } catch (err) {
    throw new Error(`Axios scraping failed: ${err.message}`);
  }
}

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
// MAIN FUNCTION WITH FALLBACK
// ----------------------
async function scrapeWebsite(url) {
  try {
    console.log('Attempting to scrape with Puppeteer...');
    return await scrapeWithPuppeteer(url);
  } catch (puppeteerError) {
    console.warn('Puppeteer failed:', puppeteerError.message);
    try {
      console.log('Falling back to Axios + Cheerio...');
      return await scrapeWithAxios(url);
    } catch (axiosError) {
      console.error('Axios fallback also failed:', axiosError.message);
      throw new Error('Scraping failed for both methods. The page might not be accessible or is blocking requests.');
    }
  }
}

module.exports = scrapeWebsite;