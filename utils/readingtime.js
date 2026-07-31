const WPM = 220;

function calculateReadingTime(text) {
  if (!text) return { minutes: 0, seconds: 0, words: 0, label: '0 min read' };
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const totalSeconds = Math.round((words / WPM) * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  let label;
  if (minutes === 0) label = `${seconds} sec read`;
  else if (seconds === 0) label = `${minutes} min read`;
  else label = `${minutes} min ${seconds} sec read`;
  return { minutes, seconds, words, label };
}

module.exports = calculateReadingTime;
