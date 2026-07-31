// Basic technology detection using signals from HTML/headers/meta.
// Local pattern matching — no Wappalyzer, no external calls.

const SIGNALS = [
  { name: 'WordPress', check: (d) => /wp-content|wp-includes/i.test(d.html) || /wordpress/i.test(d.generator) },
  { name: 'Shopify', check: (d) => /cdn\.shopify\.com|shopify\.com/i.test(d.html) },
  { name: 'Wix', check: (d) => /wix\.com|static\.wixstatic\.com/i.test(d.html) },
  { name: 'Squarespace', check: (d) => /squarespace/i.test(d.html) },
  { name: 'Webflow', check: (d) => /webflow/i.test(d.html) || /webflow/i.test(d.generator) },
  { name: 'Ghost', check: (d) => /ghost\.io|ghost\?v=/i.test(d.html) || /ghost/i.test(d.generator) },
  { name: 'Drupal', check: (d) => /drupal/i.test(d.html) || /drupal/i.test(d.generator) },
  { name: 'Joomla', check: (d) => /joomla/i.test(d.html) || /joomla/i.test(d.generator) },
  { name: 'React', check: (d) => /__NEXT_DATA__|_next\/static|data-reactroot|react-dom/i.test(d.html) },
  { name: 'Next.js', check: (d) => /__NEXT_DATA__|_next\/static/i.test(d.html) },
  { name: 'Nuxt.js', check: (d) => /__NUXT__|_nuxt\//i.test(d.html) },
  { name: 'Vue.js', check: (d) => /vue(?:\.min)?\.js|data-v-[a-f0-9]{6,}/i.test(d.html) },
  { name: 'Angular', check: (d) => /ng-app|ng-controller|@angular/i.test(d.html) },
  { name: 'Svelte', check: (d) => /svelte-|_app\/immutable/i.test(d.html) },
  { name: 'Gatsby', check: (d) => /___gatsby|gatsby-/i.test(d.html) },
  { name: 'jQuery', check: (d) => /jquery(?:-\d|\.min)?\.js/i.test(d.html) },
  { name: 'Bootstrap', check: (d) => /bootstrap(?:\.min)?\.(?:css|js)/i.test(d.html) },
  { name: 'Tailwind CSS', check: (d) => /tailwind/i.test(d.html) },
  { name: 'Google Analytics', check: (d) => /google-analytics\.com|googletagmanager\.com|gtag\(/i.test(d.html) },
  { name: 'Meta Pixel', check: (d) => /connect\.facebook\.net.*fbevents|fbq\(/i.test(d.html) },
  { name: 'Cloudflare', check: (d) => /cloudflare/i.test(d.server) || /__cf_bm|cf-ray/i.test(d.html) },
  { name: 'Nginx', check: (d) => /nginx/i.test(d.server) },
  { name: 'Apache', check: (d) => /apache/i.test(d.server) },
  { name: 'Express', check: (d) => /express/i.test(d.poweredBy) },
  { name: 'PHP', check: (d) => /php/i.test(d.poweredBy) },
  { name: 'ASP.NET', check: (d) => /asp\.net/i.test(d.poweredBy) },
  { name: 'reCAPTCHA', check: (d) => /google\.com\/recaptcha|grecaptcha/i.test(d.html) },
  { name: 'Stripe', check: (d) => /js\.stripe\.com/i.test(d.html) },
  { name: 'HubSpot', check: (d) => /hs-scripts\.com|hubspot/i.test(d.html) },
  { name: 'Intercom', check: (d) => /widget\.intercom\.io|intercom/i.test(d.html) },
];

function detectTechnologies({ html = '', http = {}, generator = '' } = {}) {
  const ctx = {
    html: html || '',
    generator: generator || '',
    server: http?.server || '',
    poweredBy: http?.poweredBy || '',
  };
  const found = new Set();
  SIGNALS.forEach((sig) => {
    try {
      if (sig.check(ctx)) found.add(sig.name);
    } catch { /* ignore */ }
  });
  return Array.from(found);
}

module.exports = detectTechnologies;
