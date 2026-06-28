/**
 * @file logger.js
 * @description Production-ready structured logging utility.
 * JSON format in production, human-readable in development.
 * Replaces all console.log/warn/error calls across the server.
 */

const env = require('../config/env');

const NODE_ENV = env.NODE_ENV;
const IS_DEV = env.IS_DEV;

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const LOG_LEVEL = LEVELS[env.LOG_LEVEL];

const COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m'
};

/**
 * Formats and outputs a log entry.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} module - Source module name (e.g., 'Pipeline', 'Auth', 'Firebase')
 * @param {string} message
 * @param {object} [meta] - Optional metadata object
 */
function log(level, module, message, meta = null) {
  if (LEVELS[level] < LOG_LEVEL) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    module,
    message,
    ...(meta && { meta })
  };

  if (IS_DEV) {
    const color = COLORS[level] || COLORS.reset;
    const prefix = `${color}[${entry.level}]${COLORS.reset}`;
    const mod = `\x1b[35m[${module}]${COLORS.reset}`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${entry.timestamp} ${prefix} ${mod} ${message}${metaStr}\n`);
  } else {
    // JSON structured output for production log aggregators
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + '\n');
  }
}

const SENSITIVE_LOGS_ENABLED = env.IS_DEV && env.DEBUG_MODE;

module.exports = {
  debug: (module, message, meta) => log('debug', module, message, meta),
  info: (module, message, meta) => log('info', module, message, meta),
  warn: (module, message, meta) => log('warn', module, message, meta),
  error: (module, message, meta) => log('error', module, message, meta),
  SENSITIVE_LOGS_ENABLED
};
