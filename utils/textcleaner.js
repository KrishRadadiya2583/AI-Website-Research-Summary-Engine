
function cleanText(text) {

 return text
   .replace(/\s+/g, " ")
   .replace(/\n/g, " ")
   .trim();

}

module.exports = cleanText;