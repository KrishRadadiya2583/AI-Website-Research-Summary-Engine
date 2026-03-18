const axios = require("axios");
const cheerio = require("cheerio");

const { chromium } = require("playwright");

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


async function scrapeWithPlaywright(url) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
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
    const data = await scrapeWithAxios(url);

    if (!data.bodyText || data.bodyText.length < 1000) {
      console.log("⚠️ Falling back to Playwright...");
      return await scrapeWithPlaywright(url);
    }

    return data;
  } catch (error) {
    console.log("⚠️ Axios failed, using Playwright...");
    return await scrapeWithPlaywright(url);
  }
}

module.exports = scrapeWebsite;