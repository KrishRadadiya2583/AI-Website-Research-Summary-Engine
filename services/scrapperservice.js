const axios = require("axios");
const cheerio = require("cheerio");

const { chromium } = require("playwright");

async function scrapeWithPlaywright(url) {
  const browser = await chromium.launch({
     headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage'
  ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const data = await page.evaluate(() => {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[name="${name}"]`);
      return el ? el.content : "";
    };

    const getLink = (rel) => {
      const el = document.querySelector(`link[rel="${rel}"]`);
      return el ? el.href : "";
    };

    const headers = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((h) => h.innerText.trim())
      .filter((t) => t.length > 5)
      .slice(0, 10);

    return {
      title: document.title || "",
      description: getMeta("description"),
      favicon: getLink("icon") || getLink("shortcut icon"),
      bodyText: document.body.innerHTML,
      headers,
    };
  });

  await browser.close();
  return data;
}

async function scrapeWebsite(url) {
  try {
      return await scrapeWithPlaywright(url);
    }
 catch (error) {
    return await scrapeWithPlaywright(url);
  }
}

module.exports = scrapeWebsite;