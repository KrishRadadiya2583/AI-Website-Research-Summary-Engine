// Deeper text analytics: word-length distribution, sentence extremes,
// vocabulary richness, question/exclamation counts, emoji counts, etc.
const { splitSentences } = require('./textstats');

function analyzeText(text) {
  if (!text) return null;

  const words = text.split(/\s+/).filter(Boolean);
  const sentences = splitSentences(text);
  const wordCount = words.length;

  // Unique tokens (lowercase, alpha)
  const lowered = words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '')).filter(Boolean);
  const uniqueWords = new Set(lowered);
  const vocabularyRichness = wordCount > 0
    ? Number((uniqueWords.size / wordCount).toFixed(3))
    : 0;

  // Average word length
  const totalChars = lowered.reduce((sum, w) => sum + w.length, 0);
  const avgWordLength = lowered.length ? Number((totalChars / lowered.length).toFixed(2)) : 0;

  // Word length distribution buckets
  const buckets = { '1-3': 0, '4-6': 0, '7-9': 0, '10-12': 0, '13+': 0 };
  lowered.forEach((w) => {
    if (w.length <= 3) buckets['1-3']++;
    else if (w.length <= 6) buckets['4-6']++;
    else if (w.length <= 9) buckets['7-9']++;
    else if (w.length <= 12) buckets['10-12']++;
    else buckets['13+']++;
  });

  // Sentence extremes
  let longest = { text: '', words: 0 };
  let shortest = { text: '', words: Infinity };
  const sentenceLengths = [];
  sentences.forEach((s) => {
    const wc = s.split(/\s+/).filter(Boolean).length;
    sentenceLengths.push(wc);
    if (wc > longest.words) longest = { text: s, words: wc };
    if (wc > 0 && wc < shortest.words) shortest = { text: s, words: wc };
  });
  if (shortest.words === Infinity) shortest = { text: '', words: 0 };

  // Punctuation stats
  const questionCount = (text.match(/\?/g) || []).length;
  const exclamationCount = (text.match(/!/g) || []).length;

  // Emoji count (broad range)
  const emojiCount = (text.match(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu) || []).length;

  // Uppercase word ratio (excluding single letters)
  const upperCount = words.filter((w) => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  const upperRatio = wordCount ? Number((upperCount / wordCount).toFixed(3)) : 0;

  return {
    uniqueWords: uniqueWords.size,
    vocabularyRichness,
    averageWordLength: avgWordLength,
    wordLengthDistribution: buckets,
    longestSentence: { text: longest.text.slice(0, 300), words: longest.words },
    shortestSentence: { text: shortest.text.slice(0, 300), words: shortest.words },
    medianSentenceLength: sentenceLengths.length
      ? sentenceLengths.sort((a, b) => a - b)[Math.floor(sentenceLengths.length / 2)]
      : 0,
    questionCount,
    exclamationCount,
    emojiCount,
    uppercaseWordRatio: upperRatio,
  };
}

module.exports = analyzeText;
