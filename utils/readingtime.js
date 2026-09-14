// 200 WPM is a common adult silent-reading baseline. Results retain seconds
// so short and partial-minute estimates remain useful.
const WPM = 200;

function fromWordCount(value) {
  const words = Math.max(0, Number(value) || 0);
  if (!words) {
    return { minutes: 0, seconds: 0, estimatedSeconds: 0, words: 0, wordsPerMinute: WPM, label: '0 min read' };
  }
  const estimatedSeconds = Math.max(1, Math.round((words / WPM) * 60));
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = estimatedSeconds % 60;
  const label = minutes === 0
    ? `${seconds} sec read`
    : seconds === 0
      ? `${minutes} min read`
      : `${minutes} min ${seconds} sec read`;
  return { minutes, seconds, estimatedSeconds, words, wordsPerMinute: WPM, label };
}

function calculateReadingTime(text) {
  if (!text) return fromWordCount(0);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return fromWordCount(words);
}

module.exports = calculateReadingTime;
module.exports.fromWordCount = fromWordCount;
