const puppeteer = require("puppeteer");

async function scrapeWebsite(url) {
  let browser;
  try {
    
    browser = await puppeteer.launch({ 
       headless: "new",
       args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const metadata = await page.evaluate(() => {
      const getMeta = (name) => {
        const element = document.querySelector(`meta[name="${name}"]`);
        return element ? element.getAttribute("content") : null;
      };

      const getLink = (rel) => {
        const element = document.querySelector(`link[rel="${rel}"]`);
        return element ? element.href : null;
      };

      const descriptionMeta = getMeta("description");
      const headers = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => h.innerText.trim())
        .filter(t => t.length > 5)
        .slice(0, 10);

      return {
        title: document.title || "",
        description: descriptionMeta ? descriptionMeta.replace(/\n/g, " ").trim() : "",
        favicon: getLink("icon") || getLink("shortcut icon") || "",
        bodyText: document.body.innerHTML,
        headers: headers
      };
    });

    return metadata;
  } catch (error) {
    console.error("Error scraping website:", error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = scrapeWebsite;