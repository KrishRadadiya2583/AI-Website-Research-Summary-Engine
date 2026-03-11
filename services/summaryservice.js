function generateSummary(text){

 const sentences = text.split(".");

 const summary = sentences.slice(0,10).join(".");

 return summary;

}

module.exports = generateSummary;