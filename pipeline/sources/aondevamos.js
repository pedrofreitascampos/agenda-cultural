'use strict';

/**
 * Aonde Vamos (aondevamos.pt) source module.
 * Feiras, festivals, traditional events across Portugal.
 *
 * API: https://aondevamos.pt/wp-json/aondevamos/v1/eventos
 * Returns JSON array with coordinates, dates, categories.
 * No auth required. Pagination via per_page/page params (untested — may return all).
 */

const { stripHtml } = require('../normalize');

const BASE_URL = 'https://aondevamos.pt/wp-json/aondevamos/v1/eventos';
const PER_PAGE = 100;
const MAX_PAGES = 10;

const CATEGORY_MAP = {
  'festas e festivais':     'festivals',
  'feiras e mercados':      'festivals',
  'teatro':                 'theatre',
  'concertos':              'music',
  'música':                 'music',
  'musica':                 'music',
  'cinema':                 'cinema',
  'exposições':             'exhibitions',
  'exposicoes':             'exhibitions',
  'workshops':              'workshops',
  'desporto':               'other',
  'gastronomia':            'other',
  'infantil':               'family',
  'crianças':               'family',
  'literatura':             'literature',
};

/**
 * Parse the event_date JSON string.
 * Format: [{"start":"2026-03-01 00:00:00","end":"2026-03-31 23:59:59","multiday":true,"allday":true}]
 */
function parseEventDate(dateStr) {
  if (!dateStr) return null;
  try {
    const dates = typeof dateStr === 'string' ? JSON.parse(dateStr) : dateStr;
    if (!Array.isArray(dates) || dates.length === 0) return null;
    return dates[0]; // Use first occurrence
  } catch {
    return null;
  }
}

/**
 * Parse the location JSON string.
 * Format: {"address":"Porto, Portugal","map_picker":false,"latitude":41.1579,"longitude":-8.6291}
 */
function parseLocation(locStr) {
  if (!locStr) return null;
  try {
    return typeof locStr === 'string' ? JSON.parse(locStr) : locStr;
  } catch {
    return null;
  }
}

/**
 * Fetch events from aondevamos.pt with pagination.
 */
async function fetchEvents(log) {
  const allEvents = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}`;
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
      log.api('aondevamos', url, 'error', Date.now() - start, { error: String(err) });
      break;
    }

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('aondevamos', url, res.status, durationMs);
      break;
    }

    let data;
    try {
      data = await res.json();
    } catch (err) {
      log.api('aondevamos', url, 'parse_error', durationMs, { error: String(err) });
      break;
    }

    if (!Array.isArray(data)) {
      log.api('aondevamos', url, res.status, durationMs, { count: 0 });
      break;
    }

    log.api('aondevamos', url, res.status, durationMs, { count: data.length });
    allEvents.push(...data);

    if (data.length < PER_PAGE) break; // last page
    page++;
  }

  return allEvents;
}

/**
 * Normalize a single aondevamos event.
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = stripHtml(raw.title || '', 200);
  if (!title) return null;

  // Parse dates
  const eventDate = parseEventDate(raw.event_date);
  if (!eventDate || !eventDate.start) return null;

  const dateStart = eventDate.start.slice(0, 10);
  const dateEnd = eventDate.end ? eventDate.end.slice(0, 10) : dateStart;

  // Times (skip if all-day)
  let timeStart = null;
  let timeEnd = null;
  if (!eventDate.allday) {
    const startTime = eventDate.start.slice(11, 16);
    if (startTime !== '00:00') timeStart = startTime;
    const endTime = eventDate.end ? eventDate.end.slice(11, 16) : null;
    if (endTime && endTime !== '23:59' && endTime !== '00:00') timeEnd = endTime;
  }

  // Location
  const loc = parseLocation(raw.location);
  let lat = null;
  let lng = null;
  let city = '';
  let address = '';
  if (loc) {
    lat = loc.latitude || null;
    lng = loc.longitude || null;
    address = loc.address || '';
    // Extract city from address (first part before comma)
    if (address) {
      city = address.split(',')[0].trim();
    }
  }

  // Override city from concelho if available
  if (raw.concelho && raw.concelho.length > 0) {
    city = raw.concelho[0];
  }

  // Category
  let category = 'festivals'; // Default for this source
  if (raw.tipos_evento && raw.tipos_evento.length > 0) {
    const tipo = raw.tipos_evento[0].toLowerCase().trim();
    category = CATEGORY_MAP[tipo] || 'festivals';
  }

  // Price
  let cost = '';
  if (raw.preco && raw.preco.length > 0) {
    cost = raw.preco[0];
  }

  // Multi-day / recurring
  const isMultiday = eventDate.multiday || false;
  const isRecurring = raw.frequencia && raw.frequencia.length > 0;
  const recurrenceNote = isRecurring ? raw.frequencia.join(', ') : '';

  // Image
  const imageUrl = raw.cover_url || raw.thumb_url || '';

  // Description
  const description = stripHtml(raw.content || '', 500);

  return {
    id: 'aondevamos-' + raw.id,
    source: 'aondevamos',
    sourceUrl: raw.permalink || '',
    title,
    description,
    category,
    imageUrl,
    cost,
    dateStart,
    dateEnd,
    timeStart,
    timeEnd,
    isRecurring: isRecurring || isMultiday,
    recurrenceNote,
    venue: '',
    address,
    lat,
    lng,
    city,
    tags: (raw.tipos_evento || []).concat(raw.distrito || []),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  id: 'aondevamos',
  name: 'Aonde Vamos',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
  parseEventDate,
  parseLocation,
};
