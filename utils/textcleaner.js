const cheerio = require("cheerio");

function cleanText(input) {
  if (!input) return "";


  if (!input.includes("<")) {
    return removeIcons(
      input
        .replace(/\s+/g, " ")
        .replace(/\n+/g, "\n")
        .trim()
    );
  }

  const $ = cheerio.load(input);

  $("script, style, noscript, iframe, svg").remove();
  $("nav, footer, header, aside").remove();
  $(".ads, .advertisement, .sidebar, .menu").remove();

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


function removeIcons(text) {
  return text
    .replace(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, "") 
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, "") 
    .replace(/[\u{2600}-\u{26FF}]/gu, "")   
    .replace(/[\u{2700}-\u{27BF}]/gu, "")  
    .replace(/[★☆✓✔✕✖✚✪➤➜➔➤➥]/g, "")   
    .trim();
}

module.exports = cleanText;