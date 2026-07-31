// Pattern-based entity extraction — local, no external NER model.
const PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g,
  url: /https?:\/\/[^\s<>"']+/g,
  money: /(?:\$|₹|€|£|USD|EUR|INR|GBP)\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:million|billion|thousand|k|m|b))?/gi,
  percentage: /\d+(?:\.\d+)?\s?%/g,
  date: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/g,
  hashtag: /#[A-Za-z0-9_]{2,50}/g,
  mention: /(^|\s)@[A-Za-z0-9_]{2,30}/g,
};

function unique(arr, limit) {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean))).slice(0, limit);
}

function extractEntities(text) {
  if (!text) {
    return { emails: [], phones: [], urls: [], money: [], percentages: [], dates: [], hashtags: [], mentions: [] };
  }
  const phones = (text.match(PATTERNS.phone) || []).filter((p) => p.replace(/\D/g, '').length >= 7);
  return {
    emails: unique(text.match(PATTERNS.email) || [], 20),
    phones: unique(phones, 10),
    urls: unique(text.match(PATTERNS.url) || [], 30),
    money: unique(text.match(PATTERNS.money) || [], 15),
    percentages: unique(text.match(PATTERNS.percentage) || [], 15),
    dates: unique(text.match(PATTERNS.date) || [], 15),
    hashtags: unique(text.match(PATTERNS.hashtag) || [], 15),
    mentions: unique((text.match(PATTERNS.mention) || []).map((m) => m.trim()), 15),
  };
}

module.exports = extractEntities;
