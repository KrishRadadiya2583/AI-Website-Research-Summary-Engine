const axios = require("axios");
const cheerio = require("cheerio");

const  { PlaywrightCrawler } =  require('crawlee');



async function scrapeWithAxios(url) {
  const { data } = await axios.get(url, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  const $ = cheerio.load(data);

  const getMeta = (name) =>
    $(`meta[name="${name}"]`).attr("content") || "";

  const getLink = (rel) =>
    $(`link[rel="${rel}"]`).attr("href") || "";

  const headers = $("h1, h2, h3")
    .map((i, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 5)
    .slice(0, 10);

  return {
    title: $("title").text() || "",
    description: getMeta("description"),
    favicon: getLink("icon") || getLink("shortcut icon"),
    bodyText: $("body").html(),
    headers,
  };
}


 async function scrapeWithCrawlee(url) {
  return new Promise((resolve, reject) => {
    let result = null;

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,

      async requestHandler({ page, request }) {
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 60000 });

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

          result = data;
        } catch (err) {
          reject(err);
        }
      },

      failedRequestHandler({ request }) {
        reject(new Error(`Request failed: ${request.url}`));
      },
    });

    crawler.run([url])
      .then(() => resolve(result))
      .catch(reject);
  });
}

async function scrapeWebsite(url) {
  try {
    // ✅ First try fast method
    const data = await scrapeWithAxios(url);

    // If content is too small → fallback to Puppeteer
    if (!data.bodyText || data.bodyText.length < 1000) {
      console.log("⚠️ Falling back to Puppeteer...");
      return await scrapeWithCrawlee(url);
    }

    return data;
  } catch (error) {
    console.log("⚠️ Axios failed, using Puppeteer...");
    return await scrapeWithCrawlee(url);
  }
}

module.exports = scrapeWebsite;