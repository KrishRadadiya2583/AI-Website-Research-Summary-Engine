const { pipeline } = require("@xenova/transformers");

let summarizer;

async function generateSummary(text) {
  if (!summarizer) {
    summarizer = await pipeline("summarization", "Xenova/distilbart-cnn-12-6");
  }

  const result = await summarizer(text, {
    max_length: 130,
    min_length: 30
  });

  return result[0].summary_text;
}

module.exports = generateSummary;