'use strict';

/**
 * Eventbrite source module.
 * Extracts events from Eventbrite's server-rendered search pages for Portugal.
 * No API key required — parses JSON-LD structured data from HTML.
 *
 * Strategy: fetch the search results page, extract window.__SERVER_DATA__,
 * parse the embedded JSON-LD Event schema objects.
 */

const { stripHtml } = require('../normalize');

// Search URLs for major Portuguese cities
const SEARCH_URLS = [
  'https://www.eventbrite.com/d/portugal--lisboa/events/',
  'https://www.eventbrite.com/d/portugal--porto/events/',
];

const CATEGORY_MAP = {
  'music':                'music',
  'performing & visual arts': 'theatre',
  'film, media & entertainment': 'cinema',
  'fashion & beauty':     'other',
  'food & drink':         'other',
  'community & culture':  'other',
  'science & technology': 'workshops',
  'sports & fitness':     'other',
  'travel & outdoor':     'other',
  'charity & causes':     'other',
  'business':             'other',
  'health & wellness':    'other',
  'family & education':   'family',
  'hobbies & special interest': 'workshops',
};

/**
 * Recursively extract all Event objects from a JSON-LD structure.
 * Eventbrite wraps events in ListItem → item → Event.
 */
function collectEvents(obj, results) {
  if (!obj || typeof obj !== 'object') return;

  if (obj['@type'] === 'Event' && obj.name) {
    results.push(obj);
    return;
  }

  // Check ListItem.item for nested Event
  if (obj['@type'] === 'ListItem' && obj.item) {
    collectEvents(obj.item, results);
    return;
  }

  // Recurse into arrays and object values
  if (Array.isArray(obj)) {
    for (const item of obj) collectEvents(item, results);
  } else {
    for (const val of Object.values(obj)) {
      if (typeof val === 'object') collectEvents(val, results);
    }
  }
}

/**
 * Extract JSON-LD event data from Eventbrite HTML.
 */
function extractEventsFromHtml(html) {
  const events = [];

  // Find all JSON-LD blocks
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      collectEvents(data, events);
    } catch { /* skip invalid JSON */ }
  }

  // Also try window.__SERVER_DATA__
  const serverDataMatch = html.match(/window\.__SERVER_DATA__\s*=\s*({[\s\S]*?});\s*<\/script>/);
  if (serverDataMatch) {
    try {
      const serverData = JSON.parse(serverDataMatch[1]);
      collectEvents(serverData, events);
    } catch { /* skip */ }
  }

  return events;
}

/**
 * Fetch events from Eventbrite search pages.
 */
async function fetchEvents(log) {
  const allEvents = [];

  for (const url of SEARCH_URLS) {
    const start = Date.now();

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        },
      });

      const durationMs = Date.now() - start;

      if (!res.ok) {
        log.api('eventbrite', url, res.status, durationMs);
        continue;
      }

      const html = await res.text();
      log.api('eventbrite', url, res.status, durationMs, { bodyLength: html.length });

      const events = extractEventsFromHtml(html);
      log.info('eventbrite.parsed', { url, events: events.length });
      allEvents.push(...events);
    } catch (err) {
      log.api('eventbrite', url, 'error', Date.now() - start, { error: String(err) });
    }
  }

  // Deduplicate by URL (same event may appear in multiple city searches)
  const seen = new Set();
  return allEvents.filter(e => {
    const key = e.url || e.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Normalize a single Eventbrite JSON-LD event.
 */
function normalize(raw) {
  if (!raw || !raw.name) return null;

  const title = (typeof raw.name === 'string' ? raw.name : '').trim();
  if (!title) return null;

  // Dates
  const dateStart = raw.startDate ? raw.startDate.slice(0, 10) : null;
  const dateEnd = raw.endDate ? raw.endDate.slice(0, 10) : null;
  if (!dateStart) return null;

  // Times (from ISO datetime)
  let timeStart = null;
  let timeEnd = null;
  if (raw.startDate && raw.startDate.includes('T')) {
    timeStart = raw.startDate.slice(11, 16);
  }
  if (raw.endDate && raw.endDate.includes('T')) {
    timeEnd = raw.endDate.slice(11, 16);
  }

  // Location
  let venue = '';
  let city = '';
  let lat = null;
  let lng = null;
  let address = '';

  if (raw.location) {
    if (raw.location.name) venue = raw.location.name;
    if (raw.location.address) {
      const addr = raw.location.address;
      city = addr.addressLocality || '';
      address = [addr.streetAddress, addr.postalCode, addr.addressLocality]
        .filter(Boolean).join(', ');
    }
    if (raw.location.geo) {
      lat = parseFloat(raw.location.geo.latitude) || null;
      lng = parseFloat(raw.location.geo.longitude) || null;
    }
  }

  // Category (from eventType or other fields — Eventbrite JSON-LD doesn't always include)
  const category = 'other';

  // Image
  const imageUrl = (typeof raw.image === 'string') ? raw.image : '';

  // Description
  const description = stripHtml(raw.description || '', 500);

  // Source URL
  const sourceUrl = raw.url || '';

  // Build unique ID
  const urlSlug = sourceUrl
    .replace(/.*eventbrite\.com\/e\//, '')
    .replace(/[?#].*/, '')
    .replace(/\/$/, '')
    .slice(0, 80) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
  const id = 'eventbrite-' + urlSlug;

  // Online events — skip those without a physical location
  const isOnline = raw.eventAttendanceMode === 'https://schema.org/OnlineEventAttendanceMode';
  if (isOnline && !venue) return null;

  return {
    id,
    source: 'eventbrite',
    sourceUrl,
    title: stripHtml(title, 200),
    description,
    category,
    imageUrl,
    cost: '',
    dateStart,
    dateEnd: dateEnd || dateStart,
    timeStart,
    timeEnd,
    isRecurring: false,
    recurrenceNote: '',
    venue,
    address,
    lat,
    lng,
    city,
    tags: [],
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  id: 'eventbrite',
  name: 'Eventbrite',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
  extractEventsFromHtml,
};
