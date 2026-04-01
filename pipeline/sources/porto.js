'use strict';

/**
 * Porto.pt municipal events source module.
 * Extracts events from porto.pt/pt/eventos/ — Next.js server-rendered.
 * No public API. Events are parsed from embedded RSC data or JSON-LD.
 *
 * Site: https://www.porto.pt/pt/eventos/
 */

const { stripHtml } = require('../normalize');

const EVENTS_URL = 'https://www.porto.pt/pt/eventos/';

const CATEGORY_MAP = {
  'cultura':      'other',
  'desporto':     'other',
  'economia':     'other',
  'política':     'other',
  'politica':     'other',
  'sociedade':    'other',
  'turismo':      'other',
};

/**
 * Extract events from Porto.pt HTML.
 * Tries JSON-LD first, then falls back to parsing embedded Next.js data.
 */
function extractEvents(html) {
  const events = [];

  // Try JSON-LD
  const ldJsonRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = ldJsonRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'Event') events.push(data);
      if (Array.isArray(data)) {
        data.filter(d => d['@type'] === 'Event').forEach(e => events.push(e));
      }
    } catch { /* skip */ }
  }

  // Try to find event data in Next.js server data
  // Porto.pt embeds event data in RSC format — look for event-like objects
  const eventPattern = /"title":"([^"]+)"[^}]*"startDate":"(\d{4}-\d{2}-\d{2})[^}]*"slug":"([^"]+)"/g;
  let m;
  while ((m = eventPattern.exec(html)) !== null) {
    // Check if we already got this from JSON-LD
    const title = m[1];
    if (!events.find(e => e.name === title)) {
      events.push({
        name: title,
        startDate: m[2],
        url: 'https://www.porto.pt/pt/evento/' + m[3] + '/',
        _fromRSC: true,
      });
    }
  }

  return events;
}

/**
 * Fetch events from Porto.pt.
 */
async function fetchEvents(log) {
  const start = Date.now();

  try {
    const res = await fetch(EVENTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'pt-PT,pt;q=0.9',
      },
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('porto', EVENTS_URL, res.status, durationMs);
      throw new Error('HTTP ' + res.status);
    }

    const html = await res.text();
    log.api('porto', EVENTS_URL, res.status, durationMs, { bodyLength: html.length });

    const events = extractEvents(html);
    log.info('porto.parsed', { events: events.length });

    return events;
  } catch (err) {
    log.api('porto', EVENTS_URL, 'error', Date.now() - start, { error: String(err) });
    throw err;
  }
}

/**
 * Normalize a single Porto.pt event.
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
  let city = 'Porto';
  let lat = null;
  let lng = null;

  if (raw.location) {
    venue = raw.location.name || '';
    if (raw.location.address) {
      city = raw.location.address.addressLocality || 'Porto';
    }
    if (raw.location.geo) {
      lat = parseFloat(raw.location.geo.latitude) || null;
      lng = parseFloat(raw.location.geo.longitude) || null;
    }
  }

  const description = stripHtml(raw.description || '', 500);
  const imageUrl = (typeof raw.image === 'string') ? raw.image : '';
  const sourceUrl = raw.url || '';

  const idSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = 'porto-' + idSlug + '-' + dateStart;

  return {
    id,
    source: 'porto',
    sourceUrl,
    title: stripHtml(title, 200),
    description,
    category: 'other',
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
  id: 'porto',
  name: 'Porto.pt',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
};
