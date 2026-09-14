const test = require('node:test');
const assert = require('node:assert/strict');

const buildAnalysisText = require('../utils/analysistext');

test('builds fallback analysis text from structured page fields', () => {
  const text = buildAnalysisText({
    bodyText: 'Hi',
    title: 'Acme Security Platform',
    description: 'Cloud website monitoring for small teams.',
    headings: {
      h1: ['Acme Security Platform'],
      h2: ['Protect every deployment'],
    },
    paragraphs: ['Track uptime, SEO signals, and security headers from one dashboard.'],
    lists: [
      { items: ['Uptime checks', 'Header audits', 'Crawler summaries'] },
    ],
    quotes: ['Trusted by fast-moving product teams.'],
  });

  assert.match(text, /Cloud website monitoring for small teams\./);
  assert.match(text, /Track uptime, SEO signals, and security headers from one dashboard\./);
  assert.match(text, /Crawler summaries/);
  assert.ok(text.length >= 50);
});

test('deduplicates repeated fallback content', () => {
  const text = buildAnalysisText({
    bodyText: '',
    title: 'Acme',
    description: 'Acme',
    headings: { h1: ['Acme'] },
    paragraphs: ['Acme'],
  });

  assert.equal(text, 'Acme');
});
