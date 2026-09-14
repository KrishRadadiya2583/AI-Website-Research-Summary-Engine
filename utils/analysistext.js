const cleanText = require('./textcleaner');

function uniquePush(items, seen, value) {
  if (typeof value !== 'string') return;

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return;

  const key = normalized.toLowerCase();
  if (seen.has(key)) return;

  seen.add(key);
  items.push(normalized);
}

function buildAnalysisText(raw = {}) {
  const items = [];
  const seen = new Set();

  uniquePush(items, seen, raw.bodyText);
  uniquePush(items, seen, raw.title);
  uniquePush(items, seen, raw.description);

  Object.values(raw.headings || {}).forEach((group) => {
    (group || []).forEach((text) => uniquePush(items, seen, text));
  });

  (raw.paragraphs || []).forEach((text) => uniquePush(items, seen, text));
  (raw.quotes || []).forEach((text) => uniquePush(items, seen, text));

  (raw.lists || []).forEach((list) => {
    (list?.items || []).forEach((text) => uniquePush(items, seen, text));
  });

  (raw.tables || []).forEach((table) => {
    uniquePush(items, seen, table?.caption);
    (table?.headers || []).forEach((text) => uniquePush(items, seen, text));
  });

  const merged = items.join('\n\n');
  return cleanText(merged);
}

module.exports = buildAnalysisText;
