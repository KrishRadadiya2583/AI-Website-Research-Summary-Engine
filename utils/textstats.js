function splitSentences(text) {
  if (!text) return [];
  return text
    .replace(/([.!?])\s+(?=[A-Z0-9"'])/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countSyllables(word) {
  if (!word) return 0;
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return w.length ? 1 : 0;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

function readabilityScores(text) {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(Boolean);
  const chars = words.join('').length;

  const sentenceCount = Math.max(1, sentences.length);
  const wordCount = Math.max(1, words.length);
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const asl = wordCount / sentenceCount; // average sentence length
  const asw = syllableCount / wordCount; // average syllables per word

  // Flesch Reading Ease: higher = easier (0-100)
  const flesch = 206.835 - 1.015 * asl - 84.6 * asw;
  // Flesch-Kincaid Grade Level
  const fkGrade = 0.39 * asl + 11.8 * asw - 15.59;
  // Automated Readability Index (uses chars per word)
  const ari = 4.71 * (chars / wordCount) + 0.5 * asl - 21.43;

  let level;
  if (flesch >= 90) level = 'Very Easy (5th grade)';
  else if (flesch >= 80) level = 'Easy (6th grade)';
  else if (flesch >= 70) level = 'Fairly Easy (7th grade)';
  else if (flesch >= 60) level = 'Standard (8th-9th grade)';
  else if (flesch >= 50) level = 'Fairly Difficult (10th-12th grade)';
  else if (flesch >= 30) level = 'Difficult (College)';
  else level = 'Very Difficult (Graduate)';

  return {
    sentenceCount: sentences.length,
    wordCount: words.length,
    syllableCount,
    averageSentenceLength: Number(asl.toFixed(2)),
    averageSyllablesPerWord: Number(asw.toFixed(2)),
    fleschReadingEase: Number(flesch.toFixed(1)),
    fleschKincaidGrade: Number(fkGrade.toFixed(1)),
    ari: Number(ari.toFixed(1)),
    readingLevel: level,
  };
}

module.exports = { splitSentences, countSyllables, readabilityScores };
