const axios = require('axios');
const cheerio = require('cheerio');
const { CheerioCrawler } = require('crawlee');

// ----------------------
// AXIOS SCRAPER
// ----------------------
async function scrapeWithAxios(url) {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
    validateStatus: () => true, // prevent throwing on non-200
  });

  if (!response.data || response.status >= 400) {
    throw new Error(`Axios failed with status ${response.status}`);
  }

  const html = response.data;
  const $ = cheerio.load(html);

  const getMeta = (name) =>
    $(`meta[name="${name}"]`).attr('content') || '';

  const getLink = (rel) =>
    $(`link[rel="${rel}"]`).attr('href') || '';

  const headers = [];
  $('h1, h2, h3').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 5 && headers.length < 10) {
      headers.push(text);
    }
  });

  return {
    title: $('title').text() || '',
    description: getMeta('description'),
    favicon: getLink('icon') || getLink('shortcut icon'),
    bodyText: html,
    headers,
    source: 'axios',
  };
}

// ----------------------
// CRAWLEE SCRAPER
// ----------------------
async function scrapeWithCrawlee(url) {
  let result = null;

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 1,
    requestHandler: async ({ $, body }) => {
      const getMeta = (name) =>
        $(`meta[name="${name}"]`).attr('content') || '';

      const getLink = (rel) =>
        $(`link[rel="${rel}"]`).attr('href') || '';

      const headers = [];
      $('h1, h2, h3').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 5 && headers.length < 10) {
          headers.push(text);
        }
      });

      result = {
        title: $('title').text() || '',
        description: getMeta('description'),
        favicon: getLink('icon') || getLink('shortcut icon'),
        bodyText: body || '',
        headers,
        source: 'crawlee',
      };
    },
  });

  await crawler.run([url]);

  if (!result) {
    throw new Error('Crawlee failed');
  }

  return result;
}

// ----------------------
// MAIN FUNCTION (FALLBACK)
// ----------------------
async function scrapeWebsite(url) {
  try {
    console.log('Trying Axios...');
    return await scrapeWithAxios(url);
  } catch (err) {
    console.warn('Axios failed:', err.message);

    try {
      console.log('Falling back to Crawlee...');
      return await scrapeWithCrawlee(url);
    } catch (err2) {
      console.error('Crawlee also failed:', err2.message);
      throw new Error('Both Axios and Crawlee failed');
    }
  }
}

module.exports = scrapeWebsite;