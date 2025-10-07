/**
 * Простой logger для приложения
 */

const info = (message, meta = {}) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('[INFO]', message, meta);
  }
};

const error = (message, meta = {}) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', message, meta);
  }
};

const warn = (message, meta = {}) => {
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[WARN]', message, meta);
  }
};

const debug = (message, meta = {}) => {
  if (process.env.NODE_ENV !== 'test' && process.env.DEBUG) {
    console.debug('[DEBUG]', message, meta);
  }
};

module.exports = {
  info,
  error,
  warn,
  debug,
};
