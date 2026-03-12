function generateSummary(text, maxSentences = 4) {
  if (!text || typeof text !== "string") return "";

  
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(Boolean);

  if (sentences.length <= maxSentences) return sentences.join(". ") + ".";

  
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/);

  const freq = {};
  const stopWords = new Set([
    "the","is","in","at","which","on","and","a","an","to","of","for","with",
    "that","this","it","as","are","was","were","be","by","or","from"
  ]);

  for (const word of words) {
    if (!stopWords.has(word) && word.length > 2) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  const scored = sentences.map(sentence => {
    const sentenceWords = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/);

    let score = 0;
    for (const w of sentenceWords) {
      if (freq[w]) score += freq[w];
    }

    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);

  
  const summary = scored
    .slice(0, maxSentences)
    .map(s => s.sentence)
    .join(". ");

  return summary + ".";
}

module.exports = generateSummary;