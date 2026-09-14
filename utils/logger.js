const LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const activeLevel = LEVELS[configuredLevel] ?? LEVELS.info;

function shouldLog(level) {
  return LEVELS[level] <= activeLevel;
}

function formatMeta(meta = {}) {
  const parts = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (typeof value === 'object') {
        return `${key}=${JSON.stringify(value)}`;
      }
      return `${key}=${String(value).replace(/\s+/g, ' ').trim()}`;
    });

  return parts.length ? ` ${parts.join(' ')}` : '';
}

function write(level, message, meta) {
  if (!shouldLog(level)) return;

  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}${formatMeta(meta)}`;
  const target = level === 'error' ? console.error : console.log;
  target(line);
}

module.exports = {
  debug(message, meta) {
    write('debug', message, meta);
  },
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    write('error', message, meta);
  },
};
