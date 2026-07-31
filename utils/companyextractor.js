// Extracts company facts (people/roles, founding, financials, HQ) from the
// already-scraped page. Two signal sources:
//   1) JSON-LD Organization schema — authoritative when present
//   2) Regex/keyword patterns over bodyText — best-effort fallback

const ROLE_ALIASES = {
  ceo: ['ceo', 'chief executive officer', 'chief executive'],
  cto: ['cto', 'chief technology officer', 'chief technical officer'],
  cfo: ['cfo', 'chief financial officer'],
  coo: ['coo', 'chief operating officer', 'chief operations officer'],
  cmo: ['cmo', 'chief marketing officer'],
  cpo: ['cpo', 'chief product officer'],
  ciso: ['ciso', 'chief information security officer'],
  president: ['president'],
  chairman: ['chairman', 'chairperson', 'chairwoman'],
  founder: ['founder', 'co-founder', 'cofounder', 'co founder'],
};

// role → canonical label
const ROLE_LOOKUP = (() => {
  const map = {};
  for (const [canonical, aliases] of Object.entries(ROLE_ALIASES)) {
    aliases.forEach((a) => (map[a.toLowerCase()] = canonical));
  }
  return map;
})();

const ALL_ROLE_ALIASES = Object.values(ROLE_ALIASES).flat();
// Longest first so "chief executive officer" matches before "ceo" alone
const ROLE_ALT = ALL_ROLE_ALIASES
  .sort((a, b) => b.length - a.length)
  .map((r) => r.replace(/[-\s]/g, '[\\s-]?'))
  .join('|');

// A person name: 2-4 capitalized tokens (allows "Mc", O'Brien, hyphenated).
// NOTE: applied to ORIGINAL text with a case-sensitive regex — the `i` flag
// would make [A-Z] match lowercase too and swallow "has", "led", "and", etc.
const NAME_SRC = "[A-Z][a-zA-Z''\\-]+(?:\\s+[A-Z][a-zA-Z''\\-]+){1,3}";
const NAME_RE_ANCHORED_START = new RegExp(`^\\s*[:,\\-—–]?\\s*(${NAME_SRC})`);
const NAME_RE_ANCHORED_END = new RegExp(`(${NAME_SRC})[\\s,.—\\-–]+$`);

// Role scanning is case-insensitive, on a lowercased copy of the text.
const ROLE_FINDER = new RegExp(
  `(?:^|[\\s,.>(])(?:the\\s+|our\\s+)?(${ROLE_ALT})(?=[\\s,:.\\-—–)])`,
  'g'
);

// Trigger scanned case-insensitively on a lowercased copy; the name list is
// then matched against the ORIGINAL text (case-sensitive) at the same offset.
const FOUNDED_BY_TRIGGER = /\b(?:founded|co-?founded|started|launched)(?:\s+(?:in|back\s+in|during|on)\s+(?:the\s+year\s+)?\d{4})?\s+by\s+/g;
const NAMES_LIST_RE = new RegExp(`^(${NAME_SRC}(?:\\s+(?:and|&|,)\\s+${NAME_SRC})*)`);

const FOUNDED_RES = [
  /\b(?:founded|established|incorporated|launched|started|since)\s+(?:in\s+)?(?:the\s+year\s+)?(\d{4})\b/gi,
  /\b(?:est\.?|founded)\s*[:.]?\s*(\d{4})\b/gi,
  /\bfounded\s+by\s+.{1,120}?\bin\s+(\d{4})\b/gi,
];

const HQ_RES = [
  /\bheadquarter(?:ed|s)?\s+(?:in|at)\s+([A-Z][A-Za-z .,'-]{2,60}?)(?=[.,;\n]|\s+and\s|\s+with\s)/g,
  /\bbased\s+(?:in|out\s+of)\s+([A-Z][A-Za-z .,'-]{2,60}?)(?=[.,;\n]|\s+and\s|\s+with\s)/g,
];

const EMPLOYEE_RES = [
  /\b(\d{1,3}(?:,\d{3})+|\d{2,6})\+?\s+(?:employees|team\s+members|staff|people)\b/gi,
  /\bteam\s+of\s+(\d{2,6})\+?\b/gi,
];

// Financial figure: $10M, $2.5 billion, USD 500m, ₹100 crore, etc.
const MONEY_RE =
  /(?:US\$|USD|EUR|€|GBP|£|INR|₹|\$)\s?(\d+(?:[.,]\d+)?)\s?(k|thousand|m|mn|million|b|bn|billion|t|trillion|lakh|crore)?/gi;

const FUNDING_RES = [
  /\braised\s+([^.]{0,80})/gi,
  /\b(?:series\s+[a-h]|seed|pre-?seed|angel|bridge|mezzanine|ipo)\b[^.]{0,120}/gi,
  /\b(?:funding|investment)\s+(?:round|of)[^.]{0,120}/gi,
];

const REVENUE_RES = [
  /\b(?:annual\s+)?revenue[^.]{0,120}/gi,
  /\barr\s+of[^.]{0,80}/gi,
  /\bmrr\s+of[^.]{0,80}/gi,
];

const VALUATION_RES = [
  /\bvalu(?:ed|ation)\s+at[^.]{0,80}/gi,
  /\bmarket\s+cap(?:italization)?[^.]{0,80}/gi,
  /\bpost-money[^.]{0,80}/gi,
];

const INVESTOR_RES = [
  /\bled\s+by\s+([^.]{3,120})/gi,
  /\binvestors?\s+include[^.]{0,200}/gi,
  /\bbacked\s+by\s+([^.]{3,200})/gi,
];

const STOP_NAME_TOKENS = new Set([
  'the', 'our', 'their', 'his', 'her', 'we', 'you', 'they',
  'inc', 'llc', 'ltd', 'corp', 'company', 'group',
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);

function looksLikeName(name) {
  if (!name) return false;
  const tokens = name.trim().split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return false;
  for (const t of tokens) {
    if (STOP_NAME_TOKENS.has(t.toLowerCase())) return false;
    if (!/^[A-Z]/.test(t)) return false;
  }
  return true;
}

function pushPerson(bucket, name, role, source) {
  if (!looksLikeName(name)) return;
  const canonical = ROLE_LOOKUP[role.toLowerCase().replace(/[-\s]/g, ' ')] || role.toLowerCase();
  const key = name.trim() + '|' + canonical;
  if (bucket.seen.has(key)) return;
  bucket.seen.add(key);
  bucket.people.push({ name: name.trim(), role: canonical, source });
}

function extractPeopleFromText(text, bucket) {
  if (!text) return;
  const lower = text.toLowerCase();
  let m;

  ROLE_FINDER.lastIndex = 0;
  while ((m = ROLE_FINDER.exec(lower)) !== null) {
    const roleWord = m[1];
    const roleEnd = m.index + m[0].length;
    const roleStart = roleEnd - roleWord.length;

    // "CEO John Smith" — name after the role word (in ORIGINAL text)
    const tail = text.slice(roleEnd, roleEnd + 120);
    const afterMatch = tail.match(NAME_RE_ANCHORED_START);
    if (afterMatch) pushPerson(bucket, afterMatch[1], roleWord, 'text');

    // "John Smith, CEO" / "John Smith is the CEO" — name before the role word
    const preSlice = text.slice(Math.max(0, roleStart - 200), roleStart)
      .replace(/(?:\s+(?:the|our|is|as|,|—|-|–))+\s*$/i, ' ');
    const beforeMatch = preSlice.match(NAME_RE_ANCHORED_END);
    if (beforeMatch) pushPerson(bucket, beforeMatch[1], roleWord, 'text');
  }

  // "founded by X and Y and Z" — everyone in the group is a founder
  FOUNDED_BY_TRIGGER.lastIndex = 0;
  while ((m = FOUNDED_BY_TRIGGER.exec(lower)) !== null) {
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 240);
    const listMatch = tail.match(NAMES_LIST_RE);
    if (listMatch) {
      listMatch[1].split(/\s+(?:and|&|,)\s+/).forEach((n) => pushPerson(bucket, n, 'founder', 'text'));
    }
  }
}

function collectFromJsonLd(jsonLd, bucket, orgFacts) {
  const nodes = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== 'object') return;
    nodes.push(node);
    if (node['@graph']) walk(node['@graph']);
  };
  jsonLd.forEach(walk);

  for (const node of nodes) {
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    const isOrg = types.some((t) =>
      typeof t === 'string' && /^(Organization|Corporation|LocalBusiness|NGO|EducationalOrganization|GovernmentOrganization|SportsOrganization|OnlineBusiness|Company)$/i.test(t)
    );
    if (!isOrg) continue;

    if (node.name && !orgFacts.name) orgFacts.name = String(node.name);
    if (node.legalName && !orgFacts.legalName) orgFacts.legalName = String(node.legalName);
    if (node.foundingDate) {
      const yearMatch = String(node.foundingDate).match(/(\d{4})/);
      if (yearMatch && !orgFacts.foundedYear) orgFacts.foundedYear = Number(yearMatch[1]);
    }
    if (node.numberOfEmployees) {
      const n = node.numberOfEmployees;
      const val = typeof n === 'object' ? (n.value || n.minValue) : n;
      if (val && !orgFacts.employees) orgFacts.employees = String(val);
    }
    if (node.address) {
      const addr = node.address;
      const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry]
        .map((p) => (typeof p === 'object' ? p.name : p))
        .filter(Boolean);
      if (parts.length && !orgFacts.headquarters) orgFacts.headquarters = parts.join(', ');
    }
    if (node.sameAs) {
      const arr = Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs];
      orgFacts.sameAs.push(...arr.filter((s) => typeof s === 'string'));
    }

    const addPersonFromNode = (personNode, fallbackRole) => {
      if (!personNode) return;
      const items = Array.isArray(personNode) ? personNode : [personNode];
      items.forEach((p) => {
        if (typeof p === 'string') {
          if (fallbackRole) pushPerson(bucket, p, fallbackRole, 'jsonld');
          return;
        }
        if (typeof p !== 'object') return;
        const name = p.name;
        const role = p.jobTitle || fallbackRole;
        if (name && role) pushPerson(bucket, String(name), String(role), 'jsonld');
      });
    };
    addPersonFromNode(node.founder, 'founder');
    addPersonFromNode(node.founders, 'founder');
    addPersonFromNode(node.employee);
    addPersonFromNode(node.employees);
    addPersonFromNode(node.ceo || node.CEO, 'ceo');
  }
}

function extractFoundedYear(text, orgFacts) {
  if (orgFacts.foundedYear || !text) return;
  const currentYear = 2100; // sanity cap; the tool has no clock and this is used only as an upper bound
  for (const re of FOUNDED_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const y = Number(m[1]);
      if (y >= 1600 && y <= currentYear) {
        orgFacts.foundedYear = y;
        return;
      }
    }
  }
}

function extractHeadquarters(text, orgFacts) {
  if (orgFacts.headquarters || !text) return;
  for (const re of HQ_RES) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m && m[1]) {
      orgFacts.headquarters = m[1].trim().replace(/[.,;]+$/, '');
      return;
    }
  }
}

function extractEmployeesFromText(text, orgFacts) {
  if (orgFacts.employees || !text) return;
  for (const re of EMPLOYEE_RES) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m && m[1]) {
      orgFacts.employees = m[1];
      return;
    }
  }
}

function collectMatches(text, patterns, limit = 5) {
  const out = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null && out.size < limit) {
      const snippet = m[0].replace(/\s+/g, ' ').trim();
      if (snippet.length > 8 && snippet.length < 240) out.add(snippet);
    }
  }
  return Array.from(out);
}

function extractFinancials(text) {
  if (!text) return { funding: [], revenue: [], valuation: [], investors: [], amounts: [] };
  const funding = collectMatches(text, FUNDING_RES, 5);
  const revenue = collectMatches(text, REVENUE_RES, 3);
  const valuation = collectMatches(text, VALUATION_RES, 3);
  const investors = collectMatches(text, INVESTOR_RES, 3);
  const amounts = [];
  const seen = new Set();
  let m;
  MONEY_RE.lastIndex = 0;
  while ((m = MONEY_RE.exec(text)) !== null && amounts.length < 10) {
    const val = m[0].replace(/\s+/g, ' ').trim();
    if (!seen.has(val)) { seen.add(val); amounts.push(val); }
  }
  return { funding, revenue, valuation, investors, amounts };
}

function pickPrimary(people, role) {
  const match = people.find((p) => p.role === role);
  return match ? match.name : '';
}

function extractCompany(raw) {
  const text = raw?.bodyText || '';
  const jsonLd = Array.isArray(raw?.jsonLd) ? raw.jsonLd : [];

  const bucket = { people: [], seen: new Set() };
  const orgFacts = {
    name: '',
    legalName: '',
    foundedYear: null,
    headquarters: '',
    employees: '',
    sameAs: [],
  };

  collectFromJsonLd(jsonLd, bucket, orgFacts);
  extractPeopleFromText(text, bucket);
  extractFoundedYear(text, orgFacts);
  extractHeadquarters(text, orgFacts);
  extractEmployeesFromText(text, orgFacts);

  if (!orgFacts.name) {
    orgFacts.name = raw?.openGraph?.site_name || raw?.publisher || raw?.title || '';
  }

  const founders = bucket.people.filter((p) => p.role === 'founder').map((p) => p.name);
  const financials = extractFinancials(text);

  return {
    name: orgFacts.name,
    legalName: orgFacts.legalName,
    foundedYear: orgFacts.foundedYear,
    headquarters: orgFacts.headquarters,
    employees: orgFacts.employees,
    ceo: pickPrimary(bucket.people, 'ceo'),
    cto: pickPrimary(bucket.people, 'cto'),
    cfo: pickPrimary(bucket.people, 'cfo'),
    coo: pickPrimary(bucket.people, 'coo'),
    founders: Array.from(new Set(founders)).slice(0, 8),
    people: bucket.people.slice(0, 30),
    financials,
    profiles: Array.from(new Set(orgFacts.sameAs)).slice(0, 12),
  };
}

module.exports = extractCompany;
