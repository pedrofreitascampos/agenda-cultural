'use strict';

/**
 * EGEAC (Empresa de Gestão de Equipamentos e Animação Cultural) source module.
 * Lisbon municipal cultural entity — manages theatres, museums, galleries.
 *
 * No public API. Events are scraped from the WordPress site's agenda page.
 * This source is fragile and may break if the site structure changes.
 *
 * Site: https://egeac.pt/agenda/
 * Venues: https://egeac.pt/wp-json/wp/v2/espacos
 */

const { stripHtml } = require('../normalize');

const AGENDA_URL = 'https://egeac.pt/agenda/';

const CATEGORY_MAP = {
  'teatro':       'theatre',
  'música':       'music',
  'musica':       'music',
  'dança':        'dance',
  'danca':        'dance',
  'cinema':       'cinema',
  'exposição':    'exhibitions',
  'exposicao':    'exhibitions',
  'exposições':   'exhibitions',
  'oficina':      'workshops',
  'workshop':     'workshops',
  'festival':     'festivals',
  'literatura':   'literature',
  'infantil':     'family',
  'circo':        'theatre',
  'concerto':     'music',
  'performance':  'theatre',
};

/**
 * Extract event links and basic data from EGEAC agenda page HTML.
 */
function extractEventLinks(html) {
  const events = [];

  // Look for JSON-LD structured data first
  const ldJsonRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = ldJsonRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'Event') events.push(data);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item['@type'] === 'Event') events.push(item);
        }
      }
    } catch { /* skip */ }
  }

  return events;
}

/**
 * Fetch events from EGEAC.
 */
async function fetchEvents(log) {
  const start = Date.now();

  try {
    const res = await fetch(AGENDA_URL, {
      headers: {
        'User-Agent': 'Agora-CulturalEventsMap/1.0 (https://github.com/; agora-events@pm.me)',
        'Accept': 'text/html',
      },
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('egeac', AGENDA_URL, res.status, durationMs);
      throw new Error('HTTP ' + res.status);
    }

    const html = await res.text();
    log.api('egeac', AGENDA_URL, res.status, durationMs, { bodyLength: html.length });

    const events = extractEventLinks(html);
    log.info('egeac.parsed', { events: events.length });

    return events;
  } catch (err) {
    log.api('egeac', AGENDA_URL, 'error', Date.now() - start, { error: String(err) });
    throw err;
  }
}

/**
 * Normalize a single EGEAC event (JSON-LD schema.org format).
 */
function normalize(raw) {
  if (!raw || !raw.name) return null;

  const title = (typeof raw.name === 'string' ? raw.name : '').trim();
  if (!title) return null;

  const dateStart = raw.startDate ? raw.startDate.slice(0, 10) : null;
  const dateEnd = raw.endDate ? raw.endDate.slice(0, 10) : null;
  if (!dateStart) return null;

  let timeStart = null;
  let timeEnd = null;
  if (raw.startDate && raw.startDate.includes('T')) {
    timeStart = raw.startDate.slice(11, 16);
  }
  if (raw.endDate && raw.endDate.includes('T')) {
    timeEnd = raw.endDate.slice(11, 16);
  }

  let venue = '';
  let city = 'Lisboa';
  let lat = null;
  let lng = null;

  if (raw.location) {
    venue = raw.location.name || '';
    if (raw.location.address) {
      city = raw.location.address.addressLocality || 'Lisboa';
    }
    if (raw.location.geo) {
      lat = parseFloat(raw.location.geo.latitude) || null;
      lng = parseFloat(raw.location.geo.longitude) || null;
    }
  }

  const description = stripHtml(raw.description || '', 500);
  const imageUrl = (typeof raw.image === 'string') ? raw.image : '';
  const sourceUrl = raw.url || '';

  // Category from title/description keywords
  const lowerTitle = title.toLowerCase();
  let category = 'other';
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lowerTitle.includes(keyword)) {
      category = cat;
      break;
    }
  }

  const idSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = 'egeac-' + idSlug + '-' + dateStart;

  return {
    id,
    source: 'egeac',
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
    address: '',
    lat,
    lng,
    city,
    tags: [],
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  id: 'egeac',
  name: 'EGEAC Lisboa',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
};
