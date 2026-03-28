#!/usr/bin/env node

'use strict';

/**
 * Pipeline orchestrator — fetches events from all enabled sources,
 * normalizes, merges, deduplicates, prunes, geocodes, and writes events.json.
 *
 * Usage: node pipeline/fetch.js [--no-geocode] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const Log = require('./log');
const { mergeEvents, pruneEvents, deduplicateEvents } = require('./normalize');
const { geocodeEvents } = require('./geocode');

// ─── Config ──────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_PATH = path.join(DATA_DIR, 'events.json');
const SOURCES_PATH = path.join(DATA_DIR, 'sources.json');
const PRUNE_DAYS = 30; // Remove events that ended more than 30 days ago

// All source modules
const SOURCES = [
  require('./sources/agendalx'),
  require('./sources/culturaptgov'),
];

// ─── Helpers ─────────────────────────────────────────────────

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const skipGeocode = args.includes('--no-geocode');
  const dryRun = args.includes('--dry-run');

  const pipelineStart = Date.now();
  Log.info('pipeline.start', { sources: SOURCES.filter(s => s.enabled).map(s => s.id) });

  // Load existing data
  const existing = readJSON(EVENTS_PATH, []);
  const sourceMeta = readJSON(SOURCES_PATH, {});

  // Fetch from all enabled sources
  const incoming = [];

  for (const source of SOURCES) {
    if (!source.enabled) continue;

    const sourceStart = Date.now();
    let rawEvents = [];

    try {
      rawEvents = await source.fetch(Log);
    } catch (err) {
      const durationMs = Date.now() - sourceStart;
      Log.sourceDone(source.id, 0, durationMs, err);
      sourceMeta[source.id] = {
        lastFetchAt: new Date().toISOString(),
        lastEventCount: 0,
        lastError: String(err),
        consecutiveFailures: (sourceMeta[source.id]?.consecutiveFailures || 0) + 1,
      };
      continue;
    }

    // Normalize each event
    let normalized = 0;
    for (const raw of rawEvents) {
      const event = source.normalize(raw);
      if (event) {
        incoming.push(event);
        normalized++;
      }
    }

    const durationMs = Date.now() - sourceStart;
    Log.sourceDone(source.id, normalized, durationMs);

    sourceMeta[source.id] = {
      lastFetchAt: new Date().toISOString(),
      lastEventCount: normalized,
      lastError: null,
      consecutiveFailures: 0,
    };
  }

  // Merge: upsert incoming into existing
  let events = mergeEvents(existing, incoming);

  // Prune: remove old events
  const beforePrune = events.length;
  events = pruneEvents(events, PRUNE_DAYS);
  const pruned = beforePrune - events.length;

  // Deduplicate across sources
  const beforeDedup = events.length;
  events = deduplicateEvents(events);
  const deduped = beforeDedup - events.length;

  // Sort by dateStart
  events.sort((a, b) => (a.dateStart || '').localeCompare(b.dateStart || ''));

  // Geocode events missing coordinates
  let geocoded = 0;
  if (!skipGeocode && incoming.length > 0) {
    // Only geocode events that are missing coords
    const needGeocode = events.filter(e => e.lat == null && e.venue);
    if (needGeocode.length > 0) {
      Log.info('geocode.start', { count: needGeocode.length });
      geocoded = await geocodeEvents(needGeocode, Log);
    }
  }

  // Write output
  if (!dryRun) {
    writeJSON(EVENTS_PATH, events);
    writeJSON(SOURCES_PATH, sourceMeta);
  }

  const durationMs = Date.now() - pipelineStart;
  Log.summary({
    totalEvents: events.length,
    incoming: incoming.length,
    pruned,
    deduped,
    geocoded,
    durationMs,
    dryRun,
  });
}

main().catch(err => {
  Log.error('pipeline.crash', { error: String(err), stack: err.stack });
  process.exit(1);
});
