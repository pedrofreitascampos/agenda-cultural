'use strict';

/**
 * CCB (Centro Cultural de Belém) source module.
 * Uses The Events Calendar REST API — clean, paginated, no auth required.
 *
 * API: https://www.ccb.pt/wp-json/tribe/events/v1/events
 * Pagination: per_page (max 50), page. Headers: X-TEC-Total, X-TEC-TotalPages.
 */

const { stripHtml } = require('../normalize');

const BASE_URL = 'https://www.ccb.pt/wp-json/tribe/events/v1/events';
const PER_PAGE = 50;
const MAX_PAGES = 20;

const CATEGORY_MAP = {
  'espetáculos':       'theatre',
  'espetaculos':       'theatre',
  'concertos':         'music',
  'música':            'music',
  'musica':            'music',
  'cinema':            'cinema',
  'exposições':        'exhibitions',
  'exposicoes':        'exhibitions',
  'conferências':      'workshops',
  'conferencias':      'workshops',
  'oficinas':          'workshops',
  'workshops':         'workshops',
  'fábrica das artes': 'family',
  'fabrica das artes': 'family',
  'festivais':         'festivals',
};

/**
 * Fetch all events from CCB with pagination.
 */
async function fetchEvents(log) {
  const allEvents = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}&start_date=now`;
    const start = Date.now();

    let res;
    try {
      res = await fetch(url, {
        headers: {
          'User-Agent': 'Agora-CulturalEventsMap/1.0 (https://github.com/; agora-events@pm.me)',
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      log.api('ccb', url, 'error', Date.now() - start, { error: String(err) });
      break;
    }

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('ccb', url, res.status, durationMs);
      break;
    }

    let data;
    try {
      data = await res.json();
    } catch (err) {
      log.api('ccb', url, 'parse_error', durationMs, { error: String(err) });
      break;
    }

    const events = data.events || [];
    const totalPages = parseInt(res.headers.get('X-TEC-TotalPages') || '1', 10);
    log.api('ccb', url, res.status, durationMs, { count: events.length, totalPages });

    if (events.length === 0) break;
    allEvents.push(...events);

    if (page >= totalPages) break;
    page++;
  }

  return allEvents;
}

/**
 * Normalize a single CCB Tribe Events Calendar event.
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = stripHtml(raw.title || '', 200);
  if (!title) return null;

  // Dates from start_date / end_date (format: "2026-04-01 08:00:00")
  const dateStart = raw.start_date ? raw.start_date.slice(0, 10) : null;
  const dateEnd = raw.end_date ? raw.end_date.slice(0, 10) : null;
  if (!dateStart) return null;

  // Times
  let timeStart = null;
  let timeEnd = null;
  if (raw.start_date && !raw.all_day) {
    timeStart = raw.start_date.slice(11, 16);
    if (timeStart === '00:00') timeStart = null;
  }
  if (raw.end_date && !raw.all_day) {
    timeEnd = raw.end_date.slice(11, 16);
    if (timeEnd === '00:00') timeEnd = null;
  }

  // Venue
  let venue = 'Centro Cultural de Belém';
  let city = 'Lisboa';
  let address = '';
  if (raw.venue) {
    venue = raw.venue.venue || venue;
    city = raw.venue.city || city;
    address = raw.venue.address || '';
  }

  // CCB coordinates (fixed — API doesn't provide them)
  const lat = 38.6936;
  const lng = -9.2093;

  // Category from categories array
  let category = 'other';
  if (raw.categories && raw.categories.length > 0) {
    for (const cat of raw.categories) {
      const catName = (cat.name || cat || '').toLowerCase().trim();
      if (CATEGORY_MAP[catName]) {
        category = CATEGORY_MAP[catName];
        break;
      }
    }
  }

  // Description
  const description = stripHtml(raw.description || '', 500);

  // Image
  const imageUrl = raw.image ? (raw.image.url || '') : '';

  // Cost
  const cost = raw.cost || '';

  // Source URL
  const sourceUrl = raw.url || '';

  return {
    id: 'ccb-' + raw.id,
    source: 'ccb',
    sourceUrl,
    title,
    description,
    category,
    imageUrl,
    cost,
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
    tags: (raw.categories || []).map(c => c.name || c).filter(Boolean),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  id: 'ccb',
  name: 'Centro Cultural de Belém',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
};
