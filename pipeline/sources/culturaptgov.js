'use strict';

/**
 * Portal da Cultura (culturaportugal.gov.pt) source module.
 * Government API — free, no auth, national scope, includes coordinates.
 *
 * API: https://culturaportugal.gov.pt/umbraco/api/eventsapi/GetEvents
 * No pagination, returns full array.
 */

const { stripHtml } = require('../normalize');

const API_URL = 'https://culturaportugal.gov.pt/umbraco/api/eventsapi/GetEvents';

// Map Portal da Cultura Type/Theme → normalized categories
const CATEGORY_MAP = {
  'concertos':          'music',
  'música':             'music',
  'musica':             'music',
  'teatro':             'theatre',
  'dança':              'dance',
  'danca':              'dance',
  'cinema':             'cinema',
  'exposições':         'exhibitions',
  'exposicoes':         'exhibitions',
  'artes visuais':      'exhibitions',
  'artes performativas': 'theatre',
  'oficinas':           'workshops',
  'formação':           'workshops',
  'festivais':          'festivals',
  'festival':           'festivals',
  'literatura':         'literature',
  'livros':             'literature',
  'infantil':           'family',
  'crianças':           'family',
  'famílias':           'family',
  'património':         'exhibitions',
  'conferências':       'workshops',
  'multidisciplinar':   'other',
};

/**
 * Parse the Position field "38,7071,-9,13549" → { lat, lng }.
 * Commas are used for both decimal separators and lat/lng delimiter.
 * Pattern: the minus sign before longitude is the real delimiter.
 */
function parsePosition(pos) {
  if (!pos || typeof pos !== 'string') return null;

  // Strategy: split on comma, rejoin as "lat.decimal,-lng.decimal"
  // Position format: "lat_int,lat_dec,-lng_int,lng_dec" or "lat_int,lat_dec,lng_int,lng_dec"
  const parts = pos.split(',');

  if (parts.length === 4) {
    const lat = parseFloat(parts[0] + '.' + parts[1]);
    const lng = parseFloat(parts[2] + '.' + parts[3]);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat, lng };
    }
  }

  if (parts.length === 3) {
    // Could be "38,7071,-9" (no lng decimal) — unlikely but handle it
    const lat = parseFloat(parts[0] + '.' + parts[1]);
    const lng = parseFloat(parts[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Fetch all events from Portal da Cultura.
 */
async function fetchEvents(log) {
  const start = Date.now();

  let res;
  try {
    res = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Agora-CulturalEventsMap/1.0 (https://github.com/; agora-events@pm.me)',
        'Accept': 'application/json',
      },
    });
  } catch (err) {
    log.api('culturaptgov', API_URL, 'error', Date.now() - start, { error: String(err) });
    throw err;
  }

  const durationMs = Date.now() - start;

  if (!res.ok) {
    log.api('culturaptgov', API_URL, res.status, durationMs);
    throw new Error('HTTP ' + res.status);
  }

  let data;
  try {
    data = await res.json();
  } catch (err) {
    log.api('culturaptgov', API_URL, 'parse_error', durationMs, { error: String(err) });
    throw err;
  }

  log.api('culturaptgov', API_URL, res.status, durationMs, { count: data.length });

  if (!Array.isArray(data)) return [];
  return data;
}

/**
 * Normalize a single Portal da Cultura event.
 */
function normalize(raw) {
  if (!raw || !raw.Name) return null;

  const title = raw.Name.trim();
  if (!title) return null;

  // Dates: ISO datetime → YYYY-MM-DD
  const dateStart = raw.StartDate ? raw.StartDate.slice(0, 10) : null;
  const dateEnd = raw.EndDate ? raw.EndDate.slice(0, 10) : null;
  if (!dateStart) return null;

  // Category: try Type first, then Theme
  const typeKey = (raw.Type || '').toLowerCase().trim();
  const themeKey = (raw.Theme || '').toLowerCase().trim();
  const category = CATEGORY_MAP[typeKey] || CATEGORY_MAP[themeKey] || 'other';

  // Venue: strip HTML from Where field
  const venue = stripHtml(raw.Where || '', 200);

  // Coordinates
  const pos = parsePosition(raw.Position);

  // Description
  const description = stripHtml(raw.Text || '', 500);

  // Price
  const cost = stripHtml(raw.Price || '', 100);

  // Image: only use if it's not just the domain root
  const imageUrl = (raw.ImageUrl && raw.ImageUrl.length > 30) ? raw.ImageUrl : '';

  // Source URL: extract from Info field if Url is just the portal domain
  let sourceUrl = raw.Url || '';
  if (!sourceUrl || sourceUrl === 'http://culturaportugal.gov.pt') {
    // Try to extract URL from Info HTML
    const linkMatch = (raw.Info || '').match(/href="([^"]+)"/);
    if (linkMatch) sourceUrl = linkMatch[1];
  }

  // Build unique ID from name + date (no numeric ID in API)
  const idSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = 'culturaptgov-' + idSlug + '-' + dateStart;

  return {
    id,
    source: 'culturaptgov',
    sourceUrl,
    title,
    description,
    category,
    imageUrl,
    cost: cost === 'Ver bilheteira' ? '' : cost,
    dateStart,
    dateEnd: dateEnd || dateStart,
    timeStart: null,
    timeEnd: null,
    isRecurring: raw.Permanent === true,
    recurrenceNote: raw.Permanent ? 'Evento permanente' : '',
    venue,
    address: '',
    lat: pos ? pos.lat : null,
    lng: pos ? pos.lng : null,
    city: raw.Location || '',
    tags: [raw.Who || ''].filter(Boolean),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  id: 'culturaptgov',
  name: 'Portal da Cultura',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
  parsePosition,
};
