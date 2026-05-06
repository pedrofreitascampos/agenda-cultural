'use strict';

/**
 * Porto.pt municipal events source module.
 * Next.js server component — events live inside RSC payload script tags:
 *   <script>self.__next_f.push([1,"...escaped JSON..."])</script>
 *
 * The payload contains an "events":{"items":[...]} block; we extract each
 * event object by tracking brace depth from a stable starting marker
 * (`{"__typename":"Event"`).
 */

const { stripHtml } = require('../normalize');

const EVENTS_URL = 'https://www.porto.pt/pt/eventos/';
const MAX_PAGES = 5;

const CATEGORY_MAP = {
  'cultura':       'other',
  'desporto':      'other',
  'economia':      'other',
  'política':      'other',
  'politica':      'other',
  'sociedade':     'other',
  'turismo':       'other',
  'música':        'music',
  'musica':        'music',
  'teatro':        'theatre',
  'dança':         'dance',
  'danca':         'dance',
  'cinema':        'cinema',
  'exposição':     'exhibitions',
  'exposicao':     'exhibitions',
  'festival':      'festivals',
  'literatura':    'literature',
  'oficina':       'workshops',
  'workshop':      'workshops',
  'família':       'family',
  'familia':       'family',
};

/**
 * Decode the JSON-escaped string carried inside an RSC push payload back to
 * regular JSON text. The browser receives this content as a single JS string
 * literal, so backslash-escapes must be unwrapped before we can JSON.parse.
 */
function unescapeRscString(s) {
  // The RSC payload string uses standard JSON string escapes; let JSON.parse handle it.
  try {
    return JSON.parse('"' + s + '"');
  } catch {
    return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
  }
}

/**
 * Find a balanced JSON object starting at a given index, by tracking brace
 * depth and respecting strings/escapes. Returns the substring or null.
 */
function readJsonObject(text, startIdx) {
  if (text[startIdx] !== '{') return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Extract event objects from a single Porto.pt HTML page.
 * Concatenates all RSC payload chunks into one decoded text buffer, then
 * walks `{"__typename":"Event"` markers and JSON-parses each balanced object.
 */
function extractEvents(html) {
  const events = [];

  // Concatenate all RSC chunks. Each chunk: self.__next_f.push([1,"...escaped..."])
  const chunkRe = /self\.__next_f\.push\(\[\d+,"([\s\S]*?)"\]\)/g;
  let chunkMatch;
  let buf = '';
  while ((chunkMatch = chunkRe.exec(html)) !== null) {
    buf += unescapeRscString(chunkMatch[1]);
  }

  if (!buf) return events;

  const marker = '{"__typename":"Event"';
  let idx = 0;
  const seen = new Set();
  while ((idx = buf.indexOf(marker, idx)) !== -1) {
    const objStr = readJsonObject(buf, idx);
    if (!objStr) { idx += marker.length; continue; }
    idx += objStr.length;
    let obj;
    try { obj = JSON.parse(objStr); } catch { continue; }
    if (!obj || !obj.title || !obj.id) continue;
    if (seen.has(obj.id)) continue;
    seen.add(obj.id);
    events.push(obj);
  }

  return events;
}

/**
 * Fetch events from Porto.pt — paginated.
 */
async function fetchEvents(log) {
  const allEvents = [];
  const seen = new Set();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = page === 1 ? EVENTS_URL : EVENTS_URL + '?page=' + page;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'pt-PT,pt;q=0.9',
        },
      });

      const durationMs = Date.now() - start;

      if (!res.ok) {
        log.api('porto', url, res.status, durationMs);
        if (page === 1) throw new Error('HTTP ' + res.status);
        break;
      }

      const html = await res.text();
      log.api('porto', url, res.status, durationMs, { bodyLength: html.length });

      const pageEvents = extractEvents(html);
      let newCount = 0;
      for (const e of pageEvents) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        allEvents.push(e);
        newCount++;
      }
      log.info('porto.page', { page, total: pageEvents.length, new: newCount });
      if (newCount === 0) break; // no new events => last page
    } catch (err) {
      log.api('porto', url, 'error', Date.now() - start, { error: String(err) });
      if (page === 1) throw err;
      break;
    }
  }

  log.info('porto.parsed', { events: allEvents.length });
  return allEvents;
}

/**
 * Map Porto category title to canonical category.
 */
function mapCategory(categoryTitle) {
  if (!categoryTitle) return 'other';
  const lower = categoryTitle.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return 'other';
}

/**
 * Normalize a Porto.pt event from the RSC payload shape.
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = String(raw.title).trim();
  if (!title) return null;

  const dates = Array.isArray(raw.dates) ? raw.dates : [];
  const firstDate = dates[0] || {};
  const startStr = firstDate.start || '';
  const endStr = firstDate.end || '';

  const dateStart = startStr ? startStr.slice(0, 10) : null;
  const dateEnd = endStr ? endStr.slice(0, 10) : (dateStart || null);
  if (!dateStart || !/^\d{4}-\d{2}-\d{2}$/.test(dateStart)) return null;

  let timeStart = null;
  let timeEnd = null;
  if (startStr.length >= 16) timeStart = startStr.slice(11, 16);
  if (endStr.length >= 16) timeEnd = endStr.slice(11, 16);

  const locations = Array.isArray(raw.locations) ? raw.locations : [];
  const firstLoc = locations[0] && locations[0].location ? locations[0].location : {};
  const venue = firstLoc.locality || '';
  const lat = firstLoc.latitude != null ? parseFloat(firstLoc.latitude) || null : null;
  const lng = firstLoc.longitude != null ? parseFloat(firstLoc.longitude) || null : null;

  const thumb = raw.thumbnail || {};
  const imageUrl = (thumb.medium && thumb.medium.url) || (thumb.large && thumb.large.url) || (thumb.small && thumb.small.url) || '';

  const sourceUrl = raw.fullUrl || (raw.url ? 'https://www.porto.pt' + raw.url : '');
  const description = stripHtml(raw.description || raw.searchDescription || '', 500);
  const categoryTitle = raw.categoryPage && raw.categoryPage.title ? raw.categoryPage.title : '';

  const idSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = 'porto-' + (raw.id || idSlug) + '-' + dateStart;

  return {
    id,
    source: 'porto',
    sourceUrl,
    title: stripHtml(title, 200),
    description,
    category: mapCategory(categoryTitle),
    imageUrl,
    cost: '',
    dateStart,
    dateEnd: dateEnd || dateStart,
    timeStart,
    timeEnd,
    isRecurring: false,
    recurrenceNote: '',
    venue,
    address: firstLoc.address || '',
    lat,
    lng,
    city: 'Porto',
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
  // Exported for tests:
  _extractEvents: extractEvents,
  _readJsonObject: readJsonObject,
  _mapCategory: mapCategory,
};
