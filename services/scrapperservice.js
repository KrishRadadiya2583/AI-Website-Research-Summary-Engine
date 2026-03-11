const puppeteer = require("puppeteer");

async function scrapeWebsite(url) {

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });

  const metadata = await page.evaluate(() => {

    const getMeta = (name) => {
      const element = document.querySelector(`meta[name="${name}"]`);
      return element ? element.getAttribute("content") : null;
    };

    const getLink = (rel) => {
      const element = document.querySelector(`link[rel="${rel}"]`);
      return element ? element.href : null;
    };

    return {
      title: document.title,
      description: getMeta("description").replace(/\n/g, " ").trim(),
      favicon: getLink("icon") || getLink("shortcut icon"),
      bodyText: document.body.innerText
    };

  });

  await browser.close();

  return metadata;
}

module.exports = scrapeWebsite;