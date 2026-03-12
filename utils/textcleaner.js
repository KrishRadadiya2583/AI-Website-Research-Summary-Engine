const cheerio = require("cheerio");

function cleanText(input) {
  if (!input) return "";

  // If plain text
  if (!input.includes("<")) {
    return removeIcons(
      input
        .replace(/\s+/g, " ")
        .replace(/\n+/g, "\n")
        .trim()
    );
  }

  const $ = cheerio.load(input);

  // Remove useless elements
  $("script, style, noscript, iframe, svg").remove();
  $("nav, footer, header, aside").remove();
  $(".ads, .advertisement, .sidebar, .menu").remove();

  // Detect main content
  let content =
    $("article").text() ||
    $("main").text() ||
    $("#content").text() ||
    $("body").text();

  content = content
    .replace(/\s+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();

  return removeIcons(content);
}

// Remove emojis / icons / symbols
function removeIcons(text) {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "") // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // transport & map
    .replace(/[\u{2600}-\u{26FF}]/gu, "")   // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, "")   // dingbats
    .replace(/[★☆✓✔✕✖✚✪➤➜➔➤➥]/g, "")     // common web icons
    .trim();
}

module.exports = cleanText;