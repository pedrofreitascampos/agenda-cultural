'use strict';

/**
 * Structured JSON logger for the data pipeline.
 * Outputs one JSON line per log entry to stdout.
 * Supports LOG_LEVEL env var (debug/info/warn/error).
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function emit(level, event, fields) {
  if (LEVELS[level] < currentLevel) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

/** Log an external API call with timing. */
function api(source, endpoint, status, durationMs, extra) {
  emit('info', 'api.call', { source, endpoint, status, durationMs, ...extra });
}

/** Log a source fetch summary. */
function sourceDone(source, count, durationMs, error) {
  if (error) {
    emit('error', 'source.error', { source, error: String(error), durationMs });
  } else {
    emit('info', 'source.done', { source, count, durationMs });
  }
}

/** Log pipeline summary. */
function summary(fields) {
  emit('info', 'pipeline.summary', fields);
}

const Log = {
  debug: (event, fields) => emit('debug', event, fields || {}),
  info: (event, fields) => emit('info', event, fields || {}),
  warn: (event, fields) => emit('warn', event, fields || {}),
  error: (event, fields) => emit('error', event, fields || {}),
  api,
  sourceDone,
  summary,
};

module.exports = Log;
