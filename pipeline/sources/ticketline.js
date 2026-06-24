'use strict';

/**
 * Ticketline (ticketline.pt) national Portuguese ticketing source module.
 * Listing uses schema.org microdata — structured scrape, no prose date parsing.
 *
 * Fetches current month + next MONTHS_AHEAD months:
 *   https://www.ticketline.pt/pesquisa/?month=<M>&year=<Y>
 *
 * Each month page returns up to ~20 events. Events are deduplicated by id
 * across months. No coords in the card — the pipeline geocoder resolves the
 * venue name after the fact.
 */

const https = require('https');
const zlib  = require('zlib');
const { stripHtml } = require('../normalize');

// ─── Config ──────────────────────────────────────────────────

const BASE_URL     = 'https://www.ticketline.pt/pesquisa/';
const MONTHS_AHEAD = 3; // current month + 3 ahead = 4 months total
const PAGE_CAP     = 20; // warn when a month returns exactly this many (silent truncation)

const FETCH_HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'text/html',
  'Accept-Language': 'pt-PT,pt;q=0.9',
};

/**
 * Fetch a URL as decoded HTML text.
 *
 * Why not native `fetch`? Ticketline's server emits a non-RFC-compliant
 * multi-line CSP response header (trailing whitespace / stray colons), which
 * Node's strict undici HTTP parser rejects with `TypeError: fetch failed`
 * (HTTPParserError). Browsers and PowerShell are lenient and accept it; Node is
 * not. We use the built-in `https` module with `insecureHTTPParser: true` to
 * tolerate the malformed headers — scoped to THIS source only, never the whole
 * pipeline. Risk is negligible here: a CI client doing a read-only GET of one
 * known host with no proxying. Response is gzip-encoded, so we gunzip manually
 * (native fetch would auto-decompress; the raw https module does not).
 *
 * @param {string} url
 * @returns {Promise<{status:number, body:string}>}
 */
function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        insecureHTTPParser: true,
        headers: { ...FETCH_HEADERS, 'Accept-Encoding': 'gzip, deflate' },
      },
      (res) => {
        const status = res.statusCode;
        const enc = String(res.headers['content-encoding'] || '').toLowerCase();
        let stream = res;
        if (enc === 'gzip')         stream = res.pipe(zlib.createGunzip());
        else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (enc === 'br')      stream = res.pipe(zlib.createBrotliDecompress());

        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf-8') }));
        stream.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy(new Error('request timeout')));
  });
}

// ─── Category Mapping ────────────────────────────────────────

/**
 * Exact-match table: lowercased PT category label → canonical category.
 * Valid canonical values: music, theatre, dance, cinema, exhibitions,
 *   workshops, festivals, literature, family, other.
 */
const CATEGORY_MAP = {
  'música':              'music',
  'teatro':              'theatre',
  'teatro imersivo':     'theatre',
  'dança':               'dance',
  'cinema':              'cinema',
  'museus & exposições': 'exhibitions',
  'exposições':          'exhibitions',
  'festival':            'festivals',
  'stand up comedy':     'other',
  'lazer':               'other',
  'desporto':            'other',
  'infantil':            'family',
  'família':             'family',
  'crianças':            'family',
  'literatura':          'literature',
};

/**
 * Map a Ticketline category label to a canonical category.
 * Steps: decode &amp;, lowercase, exact CATEGORY_MAP hit, keyword includes, else 'other'.
 *
 * @param {string} label — raw category label (may have HTML entities)
 * @returns {string} canonical category
 */
function mapCategory(label) {
  if (!label) return 'other';
  const lower = label.toLowerCase().replace(/&amp;/g, '&');

  // Exact match
  if (CATEGORY_MAP[lower] !== undefined) return CATEGORY_MAP[lower];

  // Keyword includes fallback
  if (lower.includes('música') || lower.includes('concerto'))   return 'music';
  if (lower.includes('teatro'))                                  return 'theatre';
  if (lower.includes('dança'))                                   return 'dance';
  if (lower.includes('cinema') || lower.includes('filme'))       return 'cinema';
  if (lower.includes('expos')  || lower.includes('museu'))       return 'exhibitions';
  if (lower.includes('festival'))                                return 'festivals';
  if (
    lower.includes('infantil') ||
    lower.includes('famíl')    ||
    lower.includes('criança')
  )                                                              return 'family';
  if (
    lower.includes('comedy')   ||
    lower.includes('stand up') ||
    lower.includes('lazer')    ||
    lower.includes('desporto')
  )                                                              return 'other';
  if (lower.includes('literatura') || lower.includes('livro'))   return 'literature';

  return 'other';
}

// ─── HTML Parsing ────────────────────────────────────────────

/**
 * Extract raw event objects from a Ticketline listing page.
 *
 * Events are `<li ... itemscope itemtype="http://schema.org/Event">` blocks.
 * Strategy: split on `itemtype="http://schema.org/Event"` — each chunk[i>=1]
 * starts with `">` + event content. The `<li class="...">` opening tag for
 * event i ends up at the TAIL of chunk[i-1], so we read isRecurring from there.
 *
 * @param {string} html
 * @returns {Array<{id, title, sourceUrl, imageUrl, dateStart, venue, categoryLabel, isRecurring}>}
 */
function extractEvents(html) {
  const events = [];
  if (!html) return events;

  const SPLIT_ON = 'itemtype="http://schema.org/Event"';
  const chunks = html.split(SPLIT_ON);
  // chunk[0] = HTML before the first event (page header, nav, etc.) — skip it.

  for (let i = 1; i < chunks.length; i++) {
    const chunk     = chunks[i];
    const prevChunk = chunks[i - 1];

    // ── isRecurring ───────────────────────────────────────────
    // The <li class="..."> opening for this event is at the tail of prevChunk,
    // just before "itemscope" (which in turn precedes our split token).
    // Pattern: class="<value>" itemscope (end-of-chunk)
    const liClassMatch = prevChunk.match(/class="([^"]*)"\s+itemscope\s*$/);
    const isRecurring  = liClassMatch
      ? liClassMatch[1].includes('has_multiple_sessions')
      : false;

    // ── dateStart ─────────────────────────────────────────────
    // Already ISO YYYY-MM-DD in the data-date attribute.
    const dateMatch = chunk.match(/data-date="(\d{4}-\d{2}-\d{2})"/);
    if (!dateMatch) continue;
    const dateStart = dateMatch[1];

    // ── id + sourceUrl ────────────────────────────────────────
    const hrefMatch = chunk.match(/href="(\/evento\/[^"]+)"/);
    if (!hrefMatch) continue;
    const relativePath = hrefMatch[1];

    // Trailing numeric id: "/evento/<slug>-<id>"
    const idMatch = relativePath.match(/-(\d+)\/?$/);
    if (!idMatch) continue;
    const id        = idMatch[1];
    const sourceUrl = 'https://www.ticketline.pt' + relativePath;

    // ── title ─────────────────────────────────────────────────
    const titleMatch = chunk.match(/<p\b[^>]*\bitemprop="name"[^>]*>([\s\S]*?)<\/p>/);
    if (!titleMatch) continue;
    const title = stripHtml(titleMatch[1], 200);
    if (!title) continue;

    // ── venue ─────────────────────────────────────────────────
    const venueMatch   = chunk.match(/<p\b[^>]*\bitemprop="location"[^>]*>([\s\S]*?)<\/p>/);
    const venue        = venueMatch ? stripHtml(venueMatch[1], 200) : '';

    // ── categoryLabel ─────────────────────────────────────────
    const catMatch     = chunk.match(/<p\b[^>]*class="metadata categories"[^>]*>([\s\S]*?)<\/p>/);
    const categoryLabel = catMatch ? stripHtml(catMatch[1], 100) : '';

    // ── imageUrl ──────────────────────────────────────────────
    // Use data-src-original; the real image URL (src is a blank placeholder).
    const imgMatch  = chunk.match(/data-src-original="([^"]+)"/);
    const imageUrl  = imgMatch ? imgMatch[1] : '';

    events.push({ id, title, sourceUrl, imageUrl, dateStart, venue, categoryLabel, isRecurring });
  }

  return events;
}

// ─── Fetcher ─────────────────────────────────────────────────

/**
 * Fetch events from Ticketline — one request per month (current + MONTHS_AHEAD).
 *
 * Behaviour on errors:
 *   - Non-200: log.api + continue (one bad month should not kill the source).
 *   - Network-level throw on the FIRST month: re-throw (mirrors porto page-1).
 *   - Network-level throw on subsequent months: log + continue.
 *
 * If a month returns exactly PAGE_CAP events, logs { capped: true } so
 * silent truncation is visible in the pipeline log.
 *
 * @param {object} log — structured pipeline logger
 * @returns {Promise<Array>} array of raw event objects
 */
async function fetchEvents(log) {
  const allEvents = [];
  const seen      = new Set();

  const now        = new Date();
  const startYear  = now.getFullYear();
  const startMonth = now.getMonth() + 1; // getMonth() is 0-indexed → 1-12

  let firstAttempt = true;

  for (let i = 0; i <= MONTHS_AHEAD; i++) {
    // Compute month/year with year-rollover handling.
    const totalMonth = startMonth + i;
    const year  = startYear + Math.floor((totalMonth - 1) / 12);
    const month = ((totalMonth - 1) % 12) + 1;

    const url      = `${BASE_URL}?month=${month}&year=${year}`;
    const start    = Date.now();
    const wasFirst = firstAttempt;
    firstAttempt   = false;

    let resp;
    try {
      resp = await fetchHtml(url);
    } catch (err) {
      log.api('ticketline', url, 'error', Date.now() - start, { error: String(err) });
      if (wasFirst) throw err;
      continue;
    }

    const durationMs = Date.now() - start;

    if (resp.status !== 200) {
      log.api('ticketline', url, resp.status, durationMs);
      continue; // one bad month should not abort the source
    }

    const html = resp.body;
    log.api('ticketline', url, resp.status, durationMs, { bodyLength: html.length });

    const monthEvents = extractEvents(html);
    let newCount = 0;
    for (const e of monthEvents) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      allEvents.push(e);
      newCount++;
    }

    const logMeta = { month, year, total: monthEvents.length, new: newCount };
    if (monthEvents.length === PAGE_CAP) logMeta.capped = true;
    log.info('ticketline.page', logMeta);
  }

  log.info('ticketline.parsed', { events: allEvents.length });
  return allEvents;
}

// ─── Normalizer ──────────────────────────────────────────────

/**
 * Normalize a Ticketline raw event to the common pipeline schema.
 * Returns null if title is missing or dateStart is invalid.
 *
 * lat/lng are intentionally null — Ticketline is national; no coords in the
 * card. The pipeline geocoder resolves the venue name after the fact.
 *
 * @param {object} raw — as returned by extractEvents
 * @returns {object|null} normalized event or null
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = String(raw.title).trim();
  if (!title) return null;

  const dateStart = raw.dateStart || null;
  if (!dateStart || !/^\d{4}-\d{2}-\d{2}$/.test(dateStart)) return null;

  return {
    id:             'ticketline-' + raw.id,
    source:         'ticketline',
    sourceUrl:      raw.sourceUrl  || '',
    title:          stripHtml(title, 200),
    description:    '',
    category:       mapCategory(raw.categoryLabel),
    imageUrl:       raw.imageUrl   || '',
    cost:           '',
    dateStart,
    dateEnd:        dateStart,
    timeStart:      null,
    timeEnd:        null,
    isRecurring:    raw.isRecurring || false,
    recurrenceNote: raw.isRecurring ? 'Várias sessões' : '',
    venue:          raw.venue      || '',
    address:        '',
    lat:            null,
    lng:            null,
    city:           '',
    tags:           [],
    fetchedAt:      new Date().toISOString(),
  };
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
  id:      'ticketline',
  name:    'Ticketline',
  enabled: true,
  CATEGORY_MAP,
  fetch:          fetchEvents,
  normalize,
  _extractEvents: extractEvents,
  _mapCategory:   mapCategory,
};
