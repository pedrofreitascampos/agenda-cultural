'use strict';

/**
 * AgendaLx (Agenda Cultural de Lisboa) source module.
 * Fetches events from the WordPress REST API at agendalx.pt.
 *
 * API: https://www.agendalx.pt/wp-json/agendalx/v1/events
 * Pagination: ?page=N&per_page=100
 * No authentication required.
 */

const { stripHtml, parsePtTimeRange } = require('../normalize');

const BASE_URL = 'https://www.agendalx.pt/wp-json/agendalx/v1/events';
const PER_PAGE = 100;
const MAX_PAGES = 10; // Safety cap

// Map AgendaLx category slugs → our normalized categories
const CATEGORY_MAP = {
  'musica':          'music',
  'teatro':          'theatre',
  'danca':           'dance',
  'cinema':          'cinema',
  'artes':           'exhibitions',
  'visitas-guiadas': 'workshops',   // Guided visits → workshops (closest fit)
  'feiras':          'festivals',   // Fairs/markets → festivals
  'literatura':      'literature',
  'ciencias':        'workshops',   // Science events → workshops
};

/**
 * Fetch all events from AgendaLx with pagination.
 * Returns array of raw event objects.
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
        headers: { 'User-Agent': 'Agora/1.0 (cultural-events-map)' },
      });
    } catch (err) {
      log.api('agendalx', url, 'error', Date.now() - start, { error: String(err) });
      break;
    }

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('agendalx', url, res.status, durationMs);
      break;
    }

    let data;
    try {
      data = await res.json();
    } catch (err) {
      log.api('agendalx', url, 'parse_error', durationMs, { error: String(err) });
      break;
    }

    log.api('agendalx', url, res.status, durationMs, { count: data.length });

    if (!Array.isArray(data) || data.length === 0) break;

    allEvents.push(...data);

    if (data.length < PER_PAGE) break; // last page
    page++;
  }

  return allEvents;
}

/**
 * Parse the PHP-serialized price_val field.
 * Extracts price value and description from strings like:
 *   'a:1:{i:0;a:2:{s:5:"value";s:1:"4";s:11:"description";s:29:"Visitas incluídas no bilhete";}}'
 *
 * Returns a human-readable price string, or '' if unparseable.
 */
function parsePrice(priceCat, priceVal) {
  const catStr = Array.isArray(priceCat) ? priceCat[0] : (priceCat || '');

  // Check for "free" indicators first (before checking priceVal)
  if (catStr === 'free' || catStr === 'gratuito') return 'Gratuito';

  if (!priceVal) return '';

  const valStr = Array.isArray(priceVal) ? priceVal[0] : priceVal;
  if (!valStr || typeof valStr !== 'string') return '';

  // Extract value from PHP serialized string
  const valueMatch = valStr.match(/"value";s:\d+:"([^"]+)"/);
  const descMatch = valStr.match(/"description";s:\d+:"([^"]+)"/);

  if (valueMatch) {
    const val = valueMatch[1];
    const desc = descMatch ? descMatch[1] : '';
    // If value looks numeric, add euro sign
    if (/^\d+([.,]\d+)?$/.test(val)) {
      return desc ? `${val}\u20AC (${desc})` : `${val}\u20AC`;
    }
    return desc ? `${val} (${desc})` : val;
  }

  if (catStr === 'unknown') return '';

  return '';
}

/**
 * Normalize a single raw AgendaLx event to our common schema.
 * Returns normalized event object, or null to skip.
 */
function normalize(raw) {
  if (!raw || !raw.id || !raw.title) return null;

  const title = raw.title.rendered || raw.title;
  if (!title) return null;

  // Dates: use occurences array for dateStart/dateEnd, or fall back to StartDate/LastDate
  let dateStart = null;
  let dateEnd = null;
  let isRecurring = false;
  let recurrenceNote = '';

  if (raw.occurences && raw.occurences.length > 0) {
    dateStart = raw.occurences[0];
    dateEnd = raw.occurences[raw.occurences.length - 1];
    isRecurring = raw.occurences.length > 7; // more than a week of dates = recurring
  }

  // Override with StartDate/LastDate if available (these are the "current" window)
  if (raw.StartDate) dateStart = raw.StartDate;
  if (raw.LastDate) dateEnd = raw.LastDate;

  if (!dateStart) return null; // can't place an event without a date

  // Build recurrence note from string_dates + string_times
  if (isRecurring) {
    const parts = [];
    if (raw.string_dates) parts.push(raw.string_dates);
    if (raw.string_times && raw.string_times !== 'vários horários') parts.push(raw.string_times);
    recurrenceNote = parts.join(', ');
  }

  // Times
  const times = parsePtTimeRange(
    raw.string_times && raw.string_times !== 'vários horários' ? raw.string_times : ''
  );

  // Category: first key in categories_name_list
  const catSlugs = raw.categories_name_list ? Object.keys(raw.categories_name_list) : [];
  const category = catSlugs.length > 0 ? (CATEGORY_MAP[catSlugs[0]] || 'other') : 'other';

  // Venue: first entry in venue object
  const venueEntries = raw.venue ? Object.values(raw.venue) : [];
  const venueName = venueEntries.length > 0 ? venueEntries[0].name : '';

  // Description: join array, strip HTML, truncate
  const descArr = Array.isArray(raw.description) ? raw.description : [raw.description || ''];
  const description = stripHtml(descArr.join(' '), 500);

  // Subtitle
  const subtitle = Array.isArray(raw.subtitle)
    ? raw.subtitle[0] || ''
    : (raw.subtitle || '');

  // Price
  const cost = parsePrice(raw.price_cat, raw.price_val);

  // Tags: check for "gratuito"
  const tagSlugs = raw.tags_name_list ? Object.keys(raw.tags_name_list) : [];
  const finalCost = cost || (tagSlugs.includes('gratuito') ? 'Gratuito' : '');

  return {
    id: `agendalx-${raw.id}`,
    source: 'agendalx',
    sourceUrl: raw.link || '',
    title: stripHtml(title, 200),
    description: subtitle ? `${stripHtml(subtitle, 100)} \u2014 ${description}` : description,
    category,
    imageUrl: raw.featured_media_large || '',
    cost: finalCost,
    dateStart,
    dateEnd: dateEnd || dateStart,
    timeStart: times.timeStart,
    timeEnd: times.timeEnd,
    isRecurring,
    recurrenceNote,
    venue: venueName,
    address: '',
    lat: null,
    lng: null,
    city: 'Lisboa',
    tags: tagSlugs,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  id: 'agendalx',
  name: 'Agenda Cultural de Lisboa',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
  parsePrice,
};
