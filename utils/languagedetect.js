// Very lightweight stopword-based language detection — local only.
const PROFILES = {
  en: ['the','and','of','to','in','a','is','that','for','it','with','as','are','on','be','this','by','from','or','an','have','not','you','we','your','our'],
  es: ['el','la','de','y','a','en','que','los','se','del','las','un','por','con','no','una','su','para','es','al','como','más','pero'],
  fr: ['le','la','les','de','et','à','un','une','des','en','que','pour','pas','qui','dans','sur','avec','ce','au','est','vous','nous','ne'],
  de: ['der','die','das','und','ist','in','den','von','zu','mit','sich','auf','für','als','auch','ein','eine','nicht','sind','war','werden'],
  it: ['il','la','di','e','che','a','in','un','per','sono','con','non','una','su','anche','come','del','della','più'],
  pt: ['o','a','de','que','e','do','da','em','um','para','com','não','uma','os','no','se','na','por','mais','as'],
  nl: ['de','het','een','en','van','ik','te','dat','die','in','op','zijn','is','met','niet','voor','maar','er','ook'],
  ru: ['и','в','не','на','что','с','по','это','как','из','но','вы','мы','он','она','они','был','быть'],
};

function detectLanguage(text) {
  if (!text) return { code: 'unknown', confidence: 0 };
  const words = text.toLowerCase().split(/[^a-zа-я]+/i).filter(Boolean).slice(0, 2000);
  if (words.length < 5) return { code: 'unknown', confidence: 0 };
  const set = new Set(words);
  const scores = {};
  let total = 0;
  Object.entries(PROFILES).forEach(([code, list]) => {
    const hit = list.reduce((n, w) => n + (set.has(w) ? 1 : 0), 0);
    scores[code] = hit;
    total += hit;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [code, hits] = sorted[0];
  if (hits === 0) return { code: 'unknown', confidence: 0 };
  return { code, confidence: Number((hits / (total || 1)).toFixed(2)) };
}

module.exports = detectLanguage;
