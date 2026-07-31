const STOPWORDS = require('./stopwords');

function words(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function isStopOrJunk(w) {
  return STOPWORDS.has(w) || w.length < 3 || /^\d+$/.test(w);
}

function extractPhrases(text, n, limit = 10) {
  const toks = words(text);
  if (toks.length < n) return [];
  const counts = new Map();

  for (let i = 0; i <= toks.length - n; i++) {
    const gram = toks.slice(i, i + n);
    // Skip phrases that start or end with a stopword
    if (isStopOrJunk(gram[0]) || isStopOrJunk(gram[n - 1])) continue;
    const key = gram.join(' ');
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function topPhrases(text) {
  return {
    bigrams: extractPhrases(text, 2, 12),
    trigrams: extractPhrases(text, 3, 8),
  };
}

module.exports = { extractPhrases, topPhrases };
