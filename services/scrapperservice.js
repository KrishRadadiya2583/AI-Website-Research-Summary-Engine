const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const getMeta = (name) => {
      const el = $(`meta[name="${name}"]`);
      return el.attr('content') || '';
    };

    const getLink = (rel) => {
      const el = $(`link[rel="${rel}"]`);
      return el.attr('href') || '';
    };

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
    };

  } catch (error) {
    console.error('Scraping failed:', error.message);
    throw error;
  }
}

module.exports = scrapeWebsite;