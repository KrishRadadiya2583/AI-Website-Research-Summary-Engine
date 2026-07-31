// Pure-JS extractive summarizer using term-frequency sentence scoring
// with a position bonus. No external models or APIs.
const STOPWORDS = require('./stopwords');
const { splitSentences } = require('./textstats');

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function summarize(text, sentenceCount = 4) {
  if (!text) return '';
  const sentences = splitSentences(text).filter((s) => s.split(/\s+/).length >= 5);
  if (sentences.length <= sentenceCount) return sentences.join(' ');

  // Term frequency across whole document
  const freq = new Map();
  tokenize(text).forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

  // Score each sentence
  const scored = sentences.map((sentence, idx) => {
    const words = tokenize(sentence);
    if (words.length === 0) return { sentence, idx, score: 0 };
    let score = 0;
    words.forEach((w) => { score += freq.get(w) || 0; });
    score = score / Math.sqrt(words.length); // length-normalized

    // Position bonus: early sentences carry the lead
    const positionBonus = 1 - idx / sentences.length;
    score *= 1 + 0.25 * positionBonus;

    // Penalize very short or very long sentences slightly
    const len = words.length;
    if (len < 6) score *= 0.7;
    if (len > 40) score *= 0.85;

    return { sentence, idx, score };
  });

  // Pick top-N, preserve original order
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, sentenceCount)
    .sort((a, b) => a.idx - b.idx)
    .map((s) => s.sentence);

  return top.join(' ');
}

module.exports = summarize;
