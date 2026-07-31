// Simple, opinionated on-page SEO scoring — local heuristics only.

function analyzeSEO(data) {
  const issues = [];
  const passes = [];
  let score = 100;

  const penalize = (n, msg) => { score -= n; issues.push(msg); };
  const pass = (msg) => passes.push(msg);

  // Title
  const titleLen = (data.title || '').length;
  if (!titleLen) penalize(15, 'Missing <title> tag');
  else if (titleLen < 20) penalize(5, `Title is short (${titleLen} chars, aim 40–60)`);
  else if (titleLen > 65) penalize(5, `Title is long (${titleLen} chars, aim 40–60)`);
  else pass(`Title length good (${titleLen} chars)`);

  // Description
  const descLen = (data.description || '').length;
  if (!descLen) penalize(10, 'Missing meta description');
  else if (descLen < 70) penalize(5, `Meta description is short (${descLen} chars, aim 120–160)`);
  else if (descLen > 170) penalize(3, `Meta description is long (${descLen} chars, aim 120–160)`);
  else pass(`Meta description length good (${descLen} chars)`);

  // H1
  const h1Count = data.headings?.h1?.length || 0;
  if (h1Count === 0) penalize(8, 'No <h1> heading found');
  else if (h1Count > 1) penalize(4, `Multiple <h1> tags found (${h1Count})`);
  else pass('Exactly one <h1>');

  // Canonical
  if (!data.canonical) penalize(4, 'Missing canonical link');
  else pass('Canonical link present');

  // Language
  if (!data.language) penalize(3, 'Missing lang attribute on <html>');
  else pass(`Language set (${data.language})`);

  // Viewport
  if (!data.viewport) penalize(4, 'Missing viewport meta (mobile-friendly)');
  else pass('Viewport meta present');

  // Open Graph
  const ogKeys = Object.keys(data.openGraph || {});
  if (ogKeys.length === 0) penalize(5, 'No Open Graph tags for social sharing');
  else pass(`Open Graph tags present (${ogKeys.length})`);

  // Twitter card
  const twKeys = Object.keys(data.twitter || {});
  if (twKeys.length === 0) penalize(3, 'No Twitter card tags');
  else pass(`Twitter card tags present (${twKeys.length})`);

  // Image alt coverage
  const imgTotal = data.imageStats?.total || 0;
  const imgAlt = data.imageStats?.withAlt || 0;
  if (imgTotal > 0) {
    const coverage = imgAlt / imgTotal;
    if (coverage < 0.5) penalize(6, `Only ${imgAlt}/${imgTotal} images have alt text`);
    else pass(`Image alt coverage ${(coverage * 100).toFixed(0)}%`);
  }

  // Word count
  const wc = data.stats?.wordCount || 0;
  if (wc < 200) penalize(6, `Thin content (${wc} words)`);
  else pass(`Content depth OK (${wc} words)`);

  // Structured data
  if (!data.jsonLd || data.jsonLd.length === 0) penalize(3, 'No JSON-LD structured data');
  else pass(`Structured data present (${data.jsonLd.length} block${data.jsonLd.length === 1 ? '' : 's'})`);

  // HTTP
  if (data.http && data.http.status && data.http.status >= 400) {
    penalize(15, `HTTP ${data.http.status} returned`);
  }
  if (data.http && data.http.loadTimeMs > 3000) {
    penalize(4, `Slow response (${data.http.loadTimeMs} ms)`);
  }

  // HTTPS
  try {
    const proto = new URL(data.finalUrl || data.url).protocol;
    if (proto !== 'https:') penalize(6, 'Site is not served over HTTPS');
    else pass('HTTPS enabled');
  } catch { /* ignore */ }

  score = Math.max(0, Math.min(100, score));
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score, grade, issues, passes };
}

module.exports = analyzeSEO;
