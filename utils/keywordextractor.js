function extractKeywords(text) {
  if (!text) return [];

  const commonWords = new Set(["the", "and", "a", "of", "to", "is", "in", "it", "you", "that", "this", "for", "on", "are", "with", "as", "at", "be", "by", "if", "or", "an", "was", "we", "can", "us", "our", "all", "has", "it's", "from", "will", "have", "had", "not", "but", "they", "their", "there", "when", "where", "what", "how", "why", "who", "which", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "also", "then", "now", "here", "out", "about", "up", "down", "into", "through", "before", "after", "over", "under", "again", "further", "once", "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "don", "now", "ll", "re", "ve", "d", "m", "s", "t"]);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3 && !commonWords.has(word));

  const wordCounts = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(entry => entry[0]);
}

module.exports = extractKeywords;
