'use strict';

/**
 * Geocoding module for resolving venue names to coordinates.
 *
 * Strategy:
 * 1. Check venue-cache.json (static + previously resolved)
 * 2. Fall back to Nominatim (OSM) — free, 1 req/sec rate limit
 * 3. Cache successful lookups back to venue-cache.json
 */

const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', 'data', 'venue-cache.json');
const OVERRIDES_PATH = path.join(__dirname, '..', 'data', 'venue-overrides.json');
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

let cache = null;
let overrides = null;

function loadOverrides() {
  if (overrides) return overrides;
  try {
    overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8'));
  } catch {
    overrides = {};
  }
  return overrides;
}

function loadCache() {
  if (cache) return cache;
  try {
    const data = fs.readFileSync(CACHE_PATH, 'utf-8');
    cache = JSON.parse(data);
  } catch {
    cache = {};
  }
  return cache;
}

function saveCache() {
  if (!cache) return;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf-8');
}

/**
 * Build a cache key from venue name + city.
 */
function cacheKey(venue, city) {
  return `${(venue || '').toLowerCase().trim()}|${(city || '').toLowerCase().trim()}`;
}

/**
 * Look up coordinates for a venue.
 * Returns { lat, lng } or null.
 */
/**
 * Clean venue name for better geocoding results.
 * Strips parentheticals, "um teatro em cada bairro", hours, etc.
 */
function cleanVenueName(venue) {
  return venue
    .replace(/\s*\(.*?\)\s*/g, ' ')              // remove parentheticals
    .replace(/\s*-\s*um teatro em cada bairro/i, '')
    .replace(/\s*\d{1,2}h\d{0,2}\s*/gi, ' ')     // remove times like "21h00"
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try a Nominatim query. Returns { lat, lng } or null.
 */
async function nominatimLookup(query, log) {
  const params = new URLSearchParams({
    q: query,
    countrycodes: 'pt',
    format: 'json',
    limit: '1',
  });
  const url = `${NOMINATIM_URL}?${params.toString()}`;
  const start = Date.now();

  await sleep(1100);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Agora-CulturalEventsMap/1.0 (https://github.com/; agora-events@pm.me)',
      'Accept': 'application/json',
    },
  });

  const durationMs = Date.now() - start;

  if (!res.ok) {
    log.api('nominatim', url, res.status, durationMs);
    return null;
  }

  const data = await res.json();
  log.api('nominatim', url, res.status, durationMs, { results: data.length });

  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

async function geocode(venue, city, log) {
  if (!venue) return null;

  const o = loadOverrides();
  const c = loadCache();
  const key = cacheKey(venue, city);

  // 1. Manual overrides take priority
  if (o[key]) return o[key];

  // 2. Cache hit
  if (c[key] !== undefined) {
    if (c[key] === null) return null; // previously failed
    return c[key]; // { lat, lng }
  }

  // 3. Nominatim lookup with multiple strategies
  try {
    const cleaned = cleanVenueName(venue);

    // Try 1: cleaned venue + city
    let result = await nominatimLookup(
      city ? `${cleaned}, ${city}, Portugal` : `${cleaned}, Portugal`, log
    );

    // Try 2: venue name only (some venues are indexed without city)
    if (!result && cleaned !== venue) {
      result = await nominatimLookup(cleaned + ', Portugal', log);
    }

    if (result) {
      c[key] = result;
      return result;
    }

    c[key] = null;
    return null;
  } catch (err) {
    log.api('nominatim', NOMINATIM_URL, 'error', 0, { error: String(err) });
    c[key] = null;
    return null;
  }
}

/**
 * Geocode all events that have a venue but no coordinates.
 * Mutates events in-place. Returns count of newly geocoded events.
 */
async function geocodeEvents(events, log) {
  let geocoded = 0;

  for (const event of events) {
    if (event.lat != null && event.lng != null) continue;
    if (!event.venue) continue;

    const result = await geocode(event.venue, event.city, log);
    if (result) {
      event.lat = result.lat;
      event.lng = result.lng;
      geocoded++;
    }
  }

  saveCache();
  log.info('geocode.done', { geocoded, total: events.length });
  return geocoded;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { geocode, geocodeEvents, loadCache, saveCache, cacheKey };
