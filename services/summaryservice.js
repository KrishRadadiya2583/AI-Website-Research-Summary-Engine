const extractiveSummary = require('../utils/extractivesummary');

// Optional local transformer summarizer (@xenova/transformers runs the model
// locally — no external API call). Loaded lazily so the app boots without it.
let summarizerPromise = null;
let transformerAvailable = true;

async function loadSummarizer() {
  if (!transformerAvailable) return null;
  if (!summarizerPromise) {
    summarizerPromise = (async () => {
      try {
        const { pipeline } = require('@xenova/transformers');
        return await pipeline('summarization', 'Xenova/distilbart-cnn-12-6');
      } catch (err) {
        transformerAvailable = false;
        return null;
      }
    })();
  }
  return summarizerPromise;
}

async function generateSummary(text, opts = {}) {
  if (!text || text.length < 100) {
    return {
      short: 'Content is too short to generate a meaningful summary.',
      extractive: '',
      method: 'none',
    };
  }

  // Always compute the extractive summary — fast, deterministic, no models.
  const extractive = extractiveSummary(text, opts.sentences || 5);

  // Try the local abstractive model too, but never block the response on it.
  let abstractive = '';
  let method = 'extractive';
  if (opts.useAbstractive !== false) {
    try {
      const summarizer = await loadSummarizer();
      if (summarizer) {
        // The distilbart model has a ~1024-token input limit; trim aggressively.
        const input = text.slice(0, 3500);
        const maxLength = Math.min(160, Math.max(60, Math.floor(input.length / 12)));
        const minLength = Math.min(60, Math.floor(maxLength / 2));
        const result = await summarizer(input, { max_length: maxLength, min_length: minLength });
        if (result && result[0]?.summary_text) {
          abstractive = result[0].summary_text.trim();
          method = 'abstractive+extractive';
        }
      }
    } catch { /* extractive summary remains available */ }
  }

  return {
    short: abstractive || extractive,
    extractive,
    abstractive,
    method,
  };
}

module.exports = generateSummary;
