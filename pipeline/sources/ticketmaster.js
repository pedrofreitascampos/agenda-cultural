'use strict';

/**
 * Ticketmaster Discovery API v2 source module.
 * Fetches concerts and shows in Portugal (countryCode=PT).
 *
 * This is the only Agora source that requires an API key.
 * Key comes from process.env.TICKETMASTER_API_KEY.
 * If the env var is absent, fetch() logs a skip and returns [] — the source
 * stays safe with enabled:true and simply stays inert until the key is set.
 *
 * Advantages over scraped sources:
 *   - Geo-coordinates on every venue → events skip geocoding
 *   - Canonical ticket URLs
 *   - Structured category/genre taxonomy
 */

const { stripHtml } = require('../normalize');

const API_BASE  = 'https://app.ticketmaster.com/discovery/v2/events.json';
const MAX_PAGES = 5;
const PAGE_SIZE = 199; // Discovery API max

// Segment-level mapping (genre-dependent cases handled in mapCategory)
const CATEGORY_MAP = {
  'Music':         'music',
  'Film':          'cinema',
  'Sports':        'other',
  'Family':        'family',
  'Miscellaneous': 'other',
  // 'Arts & Theatre' is genre-dependent; mapCategory handles it explicitly
};

/**
 * Map a Ticketmaster segment + genre to a canonical Agora category.
 */
function mapCategory(segment, genre) {
  if (!segment) return 'other';
  const seg = String(segment).trim();

  if (seg === 'Arts & Theatre') {
    const g = genre ? String(genre).trim() : '';
    if (g === 'Dance') return 'dance';
    if (g === 'Classical' || g === 'Opera') return 'music';
    return 'theatre';
  }

  return Object.prototype.hasOwnProperty.call(CATEGORY_MAP, seg)
    ? CATEGORY_MAP[seg]
    : 'other';
}

/**
 * Pull events array out of a parsed Discovery API response.
 * Safe for tests — accepts any value, returns [] on missing/malformed data.
 */
function extractEvents(data) {
  return (data && data._embedded && Array.isArray(data._embedded.events))
    ? data._embedded.events
    : [];
}

/**
 * Normalize a raw Ticketmaster event to the common Agora schema.
 * Returns null if title or a valid dateStart is missing.
 */
function normalize(raw) {
  if (!raw) return null;

  const title = stripHtml(raw.name || '', 200).trim();
  if (!title) return null;

  // ── Dates ──────────────────────────────────────────────────────
  const localDate = raw.dates && raw.dates.start ? raw.dates.start.localDate : null;
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return null;
  const dateStart = localDate;
  const dateEnd   = (raw.dates && raw.dates.end && raw.dates.end.localDate)
    ? raw.dates.end.localDate
    : dateStart;

  // ── Times ──────────────────────────────────────────────────────
  const localTime  = raw.dates && raw.dates.start ? (raw.dates.start.localTime || null) : null;
  const timeStart  = localTime ? localTime.slice(0, 5) : null;
  const timeEnd    = null; // Discovery list payload doesn't include end time

  // ── Venue ──────────────────────────────────────────────────────
  const venues     = (raw._embedded && Array.isArray(raw._embedded.venues))
    ? raw._embedded.venues
    : [];
  const v          = venues[0] || {};
  const venue      = v.name || '';
  const city       = (v.city && v.city.name) ? v.city.name : '';
  const address    = (v.address && v.address.line1) ? v.address.line1 : '';
  const lat        = (v.location && v.location.latitude)
    ? (parseFloat(v.location.latitude) || null)
    : null;
  const lng        = (v.location && v.location.longitude)
    ? (parseFloat(v.location.longitude) || null)
    : null;

  // ── Image — pick the widest ────────────────────────────────────
  let imageUrl = '';
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    const best = raw.images.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a));
    imageUrl = best.url || '';
  }

  // ── Cost ───────────────────────────────────────────────────────
  let cost = '';
  if (Array.isArray(raw.priceRanges) && raw.priceRanges.length > 0) {
    const pr  = raw.priceRanges[0];
    const cur = pr.currency || '';
    if (pr.min != null && pr.max != null && pr.min !== pr.max) {
      cost = `${pr.min}–${pr.max} ${cur}`.trim();
    } else if (pr.min != null) {
      cost = `${pr.min} ${cur}`.trim();
    } else if (pr.max != null) {
      cost = `${pr.max} ${cur}`.trim();
    }
  }

  // ── Category ───────────────────────────────────────────────────
  const cls     = Array.isArray(raw.classifications) ? raw.classifications[0] : null;
  const segment = cls && cls.segment ? cls.segment.name : null;
  const genre   = cls && cls.genre   ? cls.genre.name   : null;
  const category = mapCategory(segment, genre);

  return {
    id:             'ticketmaster-' + raw.id,
    source:         'ticketmaster',
    sourceUrl:      raw.url || '',
    title,
    description:    '', // Discovery list payload has no clean description
    category,
    imageUrl,
    cost,
    dateStart,
    dateEnd,
    timeStart,
    timeEnd,
    isRecurring:    false,
    recurrenceNote: '',
    venue,
    address,
    lat,
    lng,
    city,
    tags:           [],
    fetchedAt:      new Date().toISOString(),
  };
}

/**
 * Fetch events from Ticketmaster Discovery API — paginated, up to MAX_PAGES.
 * Returns [] immediately (with a log.info skip) if TICKETMASTER_API_KEY is unset.
 */
async function fetchEvents(log) {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    log.info('ticketmaster.skip', { reason: 'TICKETMASTER_API_KEY not set' });
    return [];
  }

  const nowISO = new Date().toISOString().slice(0, 19) + 'Z';
  const allEvents = [];
  const seen = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = API_BASE
      + '?apikey=' + encodeURIComponent(apiKey)
      + '&countryCode=PT'
      + '&size=' + PAGE_SIZE
      + '&sort=date,asc'
      + '&startDateTime=' + encodeURIComponent(nowISO)
      + '&page=' + page;

    const start = Date.now();

    let res;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      const durationMs = Date.now() - start;
      log.api('ticketmaster', url, 'error', durationMs, { error: String(err) });
      if (page === 0) return allEvents; // network failure on first page → return empty
      break;
    }

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('ticketmaster', url, res.status, durationMs);
      if (page === 0) return allEvents; // bad key / 401 / 429 on first page → return empty
      break;
    }

    let data;
    try {
      data = await res.json();
    } catch (err) {
      log.api('ticketmaster', url, res.status, durationMs, { error: 'invalid JSON: ' + String(err) });
      if (page === 0) return allEvents;
      break;
    }

    log.api('ticketmaster', url, res.status, durationMs);

    const pageEvents = extractEvents(data);
    let newCount = 0;
    for (const e of pageEvents) {
      if (!e.id || seen.has(e.id)) continue;
      seen.add(e.id);
      allEvents.push(e);
      newCount++;
    }

    // Respect pagination metadata
    const pageInfo = data.page || {};
    const totalPages = pageInfo.totalPages != null ? pageInfo.totalPages : 1;

    log.info('ticketmaster.page', { page, events: pageEvents.length, new: newCount, totalPages });

    if (newCount === 0 || page + 1 >= totalPages) break;
  }

  log.info('ticketmaster.parsed', { events: allEvents.length });
  return allEvents;
}

module.exports = {
  id:              'ticketmaster',
  name:            'Ticketmaster',
  enabled:         true,
  CATEGORY_MAP,
  fetch:           fetchEvents,
  normalize,
  // Exported for tests:
  _extractEvents:  extractEvents,
  _mapCategory:    mapCategory,
};
