// Security header analyzer — grades response headers against best practices.
const CHECKS = [
  { key: 'strict-transport-security', name: 'HSTS', weight: 15,
    good: (v) => /max-age=\d+/i.test(v),
    note: 'Forces HTTPS' },
  { key: 'content-security-policy', name: 'Content-Security-Policy', weight: 15,
    good: (v) => v && v.length > 10,
    note: 'Restricts allowed resources' },
  { key: 'x-content-type-options', name: 'X-Content-Type-Options', weight: 8,
    good: (v) => /nosniff/i.test(v),
    note: 'Prevents MIME sniffing' },
  { key: 'x-frame-options', name: 'X-Frame-Options', weight: 8,
    good: (v) => /deny|sameorigin/i.test(v),
    note: 'Prevents clickjacking' },
  { key: 'referrer-policy', name: 'Referrer-Policy', weight: 8,
    good: (v) => !!v,
    note: 'Controls Referer header' },
  { key: 'permissions-policy', name: 'Permissions-Policy', weight: 6,
    good: (v) => !!v,
    note: 'Restricts browser features' },
  { key: 'x-xss-protection', name: 'X-XSS-Protection', weight: 3,
    good: (v) => !!v,
    optional: true,
    note: 'Legacy XSS filter' },
  { key: 'cross-origin-opener-policy', name: 'COOP', weight: 5,
    good: (v) => !!v,
    note: 'Cross-Origin-Opener-Policy' },
  { key: 'cross-origin-embedder-policy', name: 'COEP', weight: 5,
    good: (v) => !!v,
    note: 'Cross-Origin-Embedder-Policy' },
  { key: 'cross-origin-resource-policy', name: 'CORP', weight: 4,
    good: (v) => !!v,
    note: 'Cross-Origin-Resource-Policy' },
];

function normalizeHeaders(headers) {
  const out = {};
  Object.entries(headers || {}).forEach(([k, v]) => {
    out[k.toLowerCase()] = Array.isArray(v) ? v.join('; ') : String(v || '');
  });
  return out;
}

function analyzeSecurity({ http, finalUrl, url } = {}) {
  const headers = normalizeHeaders(http?.responseHeaders || {});
  const target = finalUrl || url || '';
  const isHttps = /^https:/i.test(target);

  const findings = [];
  let earned = 0;
  let possible = 0;

  // HTTPS mandatory bonus
  possible += 10;
  if (isHttps) { earned += 10; findings.push({ ok: true, label: 'HTTPS enabled', weight: 10 }); }
  else findings.push({ ok: false, label: 'Site is not HTTPS', weight: 10 });

  CHECKS.forEach((c) => {
    const value = headers[c.key];
    possible += c.weight;
    if (value && c.good(value)) {
      earned += c.weight;
      findings.push({ ok: true, label: c.name, note: c.note, value: value.slice(0, 120), weight: c.weight });
    } else {
      findings.push({ ok: false, label: c.name, note: c.note, weight: c.weight, missing: true });
    }
  });

  const score = Math.round((earned / possible) * 100);
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 65) grade = 'C';
  else if (score >= 45) grade = 'D';
  else grade = 'F';

  const presentHeaders = {};
  Object.keys(headers).forEach((k) => {
    if (/^(server|x-powered-by|via|x-served-by|x-cache|x-request-id)$/.test(k) ||
        CHECKS.some((c) => c.key === k)) {
      presentHeaders[k] = headers[k];
    }
  });

  return {
    score,
    grade,
    isHttps,
    findings,
    passed: findings.filter((f) => f.ok).length,
    failed: findings.filter((f) => !f.ok).length,
    headers: presentHeaders,
  };
}

module.exports = analyzeSecurity;
