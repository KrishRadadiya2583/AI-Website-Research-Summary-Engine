const STOPWORDS = require('./stopwords');

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function extractKeywords(text, limit = 15) {
  if (!text) return [];
  const words = tokenize(text);
  if (words.length === 0) return [];

  const counts = new Map();
  words.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));

  // Slight boost for words that appear in the first 20% of the doc
  const cutoff = Math.max(1, Math.floor(words.length * 0.2));
  const earlyBoost = new Set(words.slice(0, cutoff));

  const scored = Array.from(counts.entries()).map(([word, freq]) => {
    let score = freq;
    if (earlyBoost.has(word)) score *= 1.2;
    if (word.length > 6) score *= 1.1;
    return { word, freq, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.word);
}

function extractKeywordsWithScores(text, limit = 15) {
  if (!text) return [];
  const words = tokenize(text);
  const counts = new Map();
  words.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

module.exports = extractKeywords;
module.exports.extractKeywordsWithScores = extractKeywordsWithScores;
module.exports.tokenize = tokenize;
