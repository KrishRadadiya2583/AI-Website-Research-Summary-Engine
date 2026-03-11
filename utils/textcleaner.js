const cheerio = require("cheerio");

function cleanText(html) {
    if (!html) return "";

    const $ = cheerio.load(html);

    // Remove unwanted elements
    $("script, style, noscript, iframe, svg,nav, footer, header, aside, ads").remove();

    // Extract text from body
    let text = $("body").text();

    // Normalize whitespace
    text = text
        .replace(/\s+/g, " ")
        .replace(/\n+/g, " ")
        .replace(/\t+/g, " ")
        .replace(/\r+/g, " ")
        .trim();

    return text;
}

module.exports = cleanText;