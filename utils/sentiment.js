// Small AFINN-style lexicon for local sentiment scoring — no external API.
const LEXICON = {
  // positive
  amazing: 3, awesome: 3, excellent: 3, fantastic: 3, wonderful: 3, love: 3, loved: 3, loves: 3,
  great: 2, good: 2, best: 3, better: 2, positive: 2, happy: 2, glad: 2, pleased: 2,
  helpful: 2, useful: 2, easy: 1, fast: 1, powerful: 2, robust: 2, reliable: 2, secure: 2,
  free: 1, save: 1, saved: 1, savings: 1, benefit: 2, benefits: 2, gain: 2, boost: 2,
  innovative: 2, modern: 1, advanced: 2, smart: 1, efficient: 2, effective: 2, quality: 2,
  professional: 1, trusted: 2, recommended: 2, popular: 1, success: 3, successful: 3,
  win: 2, winner: 2, winning: 2, achieve: 2, achievement: 2, growth: 2, improve: 2, improved: 2,
  // negative
  bad: -2, worst: -3, terrible: -3, awful: -3, horrible: -3, hate: -3, hated: -3, poor: -2,
  fail: -2, failed: -2, failure: -2, broken: -2, bug: -1, issue: -1, problem: -1, problems: -1,
  slow: -1, difficult: -1, hard: -1, complicated: -1, confusing: -2, unclear: -1,
  wrong: -2, error: -2, errors: -2, crash: -2, crashed: -2, expensive: -1, costly: -1,
  disappointed: -3, disappointing: -3, sad: -2, angry: -2, frustrated: -2, frustrating: -2,
  loss: -2, lose: -2, lost: -2, decline: -2, decrease: -1, weak: -2, threat: -2, danger: -2,
  risk: -1, risky: -1, warning: -1, avoid: -2, refuse: -2, deny: -1, denied: -1,
};

function analyzeSentiment(text) {
  if (!text) return { score: 0, comparative: 0, label: 'neutral', positive: [], negative: [] };
  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  let score = 0;
  const positive = [];
  const negative = [];
  words.forEach((w) => {
    if (LEXICON[w] !== undefined) {
      const v = LEXICON[w];
      score += v;
      if (v > 0) positive.push(w);
      else negative.push(w);
    }
  });
  const comparative = words.length ? score / words.length : 0;
  let label = 'neutral';
  if (comparative > 0.02) label = 'positive';
  else if (comparative < -0.02) label = 'negative';
  return {
    score,
    comparative: Number(comparative.toFixed(4)),
    label,
    positive: Array.from(new Set(positive)).slice(0, 10),
    negative: Array.from(new Set(negative)).slice(0, 10),
  };
}

module.exports = analyzeSentiment;
