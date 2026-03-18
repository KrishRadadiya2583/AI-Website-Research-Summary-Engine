const { pipeline } = require("@xenova/transformers");

let summarizer;

async function generateSummary(text) {
  if (!text || text.length < 100) {
    return "Content is too short to generate a meaningful summary.";
  }

  if (!summarizer) {
    summarizer = await pipeline("summarization", "Xenova/distilbart-cnn-12-6");
  }

  const maxLength = Math.min(130, Math.floor(text.length / 10));
  const minLength = Math.min(30, Math.floor(maxLength / 2));

  const result = await summarizer(text, {
    max_length: maxLength,
    min_length: minLength
  });

  return result[0].summary_text;
}

module.exports = generateSummary;