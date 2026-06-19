'use strict';

/**
 * MEO Arena (Altice Arena, Lisbon) concert/show listing source module.
 * Single-page HTML scrape — https://arena.meo.pt/agenda-completa
 * All events are at one fixed venue; lat/lng are hardcoded (no geocoding needed).
 */

const { stripHtml, formatDate } = require('../normalize');

// ─── Venue Constants ─────────────────────────────────────────

const VENUE   = 'MEO Arena';
const ADDRESS = 'Rossio dos Olivais, Parque das Nações';
const CITY    = 'Lisboa';
const LAT     = 38.7656;
const LNG     = -9.0944;

const LISTING_URL = 'https://arena.meo.pt/agenda-completa';

// ─── Category Mapping ────────────────────────────────────────

/**
 * Keyword → canonical category overrides.
 * Arena default is 'music'; override only for known non-concert content.
 */
const CATEGORY_MAP = {
  seinfeld:    'other',
  comedy:      'other',
  commedia:    'other',
  'stand up':  'other',
  gala:        'other',
  'hot wheels': 'family',
  stunt:       'family',
  disney:      'family',
  frozen:      'family',
  circo:       'family',
  patrulha:    'family',
  festival:    'festivals',
};

/**
 * Map an event title to a canonical category.
 * An arena is overwhelmingly concerts → default 'music'.
 */
function mapCategory(title) {
  if (!title) return 'music';
  const lower = title.toLowerCase();
  // family shows (check before 'other' to avoid stunt/hot-wheels hitting 'other')
  if (
    lower.includes('hot wheels') || lower.includes('stunt') ||
    lower.includes('disney') || lower.includes('frozen') ||
    lower.includes('circo') || lower.includes('patrulha')
  ) return 'family';
  // comedy / stand-up / gala
  if (
    lower.includes('seinfeld') || lower.includes('comedy') ||
    lower.includes('commedia') || lower.includes('stand up') ||
    lower.includes('gala')
  ) return 'other';
  // festivals
  if (lower.includes('festival')) return 'festivals';
  return 'music';
}

// ─── Date Parsing ────────────────────────────────────────────

/**
 * Portuguese (and English fallback) month abbreviations → month number.
 * Source emits uppercase (e.g. "JUL", "AGO", "OUT").
 */
const MONTH_MAP = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
  // EN safety-net fallbacks (those that differ from PT)
  FEB: 2, APR: 4, MAY: 5, AUG: 8, SEP: 9, OCT: 10, DEC: 12,
};

/**
 * Parse a MEO Arena date string into { dateStart, dateEnd } or null.
 *
 * Handles all observed formats:
 *   "08 JUL 2026"             → single day
 *   "29 E 30 AGO 2026"        → two days, same month  ("E" = and)
 *   "29 OUT A 31 OUT 2026"    → range, same month     ("A" = to)
 *   "30 OUT A 02 NOV 2026"    → range, cross-month
 *
 * Algorithm:
 *   1. Uppercase, extract 4-digit year.
 *   2. Scan tokens left→right, collecting day numbers (1-31) and month codes.
 *   3. Derive start/end from collected days and unique months (in order).
 */
function parseMeoDate(dateText) {
  if (!dateText || typeof dateText !== 'string') return null;

  const upper = dateText.trim().toUpperCase();
  if (!/\d/.test(upper)) return null;

  // Year must be present
  const yearMatch = upper.match(/\b(20\d{2})\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[1], 10);

  const days   = [];
  const months = [];

  for (const tok of upper.split(/\s+/)) {
    if (MONTH_MAP[tok] !== undefined) {
      months.push(MONTH_MAP[tok]);
    } else if (/^\d{1,2}$/.test(tok)) {
      const n = parseInt(tok, 10);
      if (n >= 1 && n <= 31) days.push(n);
    }
    // Separators ("E", "A") and year token are ignored
  }

  if (days.length === 0 || months.length === 0) return null;

  // Unique months in order of first appearance
  const uniqueMonths = [...new Set(months)];

  let dateStart, dateEnd;

  if (uniqueMonths.length === 1) {
    dateStart = formatDate(year, uniqueMonths[0], days[0]);
    dateEnd   = formatDate(year, uniqueMonths[0], days[days.length - 1]);
  } else if (uniqueMonths.length === 2) {
    dateStart = formatDate(year, uniqueMonths[0], days[0]);
    dateEnd   = formatDate(year, uniqueMonths[1], days[days.length - 1]);
  } else {
    return null; // 3+ months not expected
  }

  if (!dateStart || !dateEnd) return null;
  return { dateStart, dateEnd };
}

// ─── HTML Parsing ────────────────────────────────────────────

/**
 * Extract raw event objects from the MEO Arena agenda-completa HTML.
 *
 * Each event card is a <div class="agendaDestaquesUn ..."> block.
 * Strategy: split on 'class="agendaDestaquesUn' — inner elements use different
 * class names (agendaDestaquesFundo, agendaDestaquesImg, agendaDestaquesDesc)
 * so the split fires exactly once per card.
 *
 * @param {string} html
 * @returns {Array<{eventId, title, sourceUrl, imageUrl, dateText}>}
 */
function extractEvents(html) {
  const events = [];
  if (!html) return events;

  const chunks = html.split('class="agendaDestaquesUn');
  // chunk[0] = HTML before the first card; skip it.
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    // ── title + href ──────────────────────────────────────────
    // <a href="/agenda/<slug>/<id>" class="destaquesNome">TITLE</a>
    // (or href may follow class= — capture both attribute orders)
    const nomeMatch = chunk.match(/<a\b([^>]*)class="destaquesNome"([^>]*)>([\s\S]*?)<\/a>/);
    if (!nomeMatch) continue;

    const allAttrs = (nomeMatch[1] || '') + (nomeMatch[2] || '');
    const hrefMatch = allAttrs.match(/href="([^"]+)"/);
    if (!hrefMatch) continue;

    const relativePath = hrefMatch[1];
    const titleRaw     = nomeMatch[3];
    const title        = titleRaw.replace(/<[^>]+>/g, '').trim();
    if (!title) continue;

    // ── eventId: last numeric segment of the path ─────────────
    const idMatch = relativePath.match(/\/(\d+)\/?$/);
    if (!idMatch) continue;
    const eventId = idMatch[1];

    const sourceUrl = 'https://arena.meo.pt' + relativePath;

    // ── dateText: inner text of <div class="data-abrev"> ──────
    const dateMatch = chunk.match(/<div[^>]+class="data-abrev"[^>]*>([\s\S]*?)<\/div>/);
    if (!dateMatch) continue;
    const dateText = dateMatch[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!dateText) continue;

    // ── imageUrl: src of <img> inside <figure> ────────────────
    // Real src has a leading space — trim() it.
    const imgMatch = chunk.match(/<figure[\s\S]*?<img\b[^>]+src="([^"]+)"/);
    const imageUrl = imgMatch ? imgMatch[1].trim() : '';

    events.push({ eventId, title, sourceUrl, imageUrl, dateText });
  }

  return events;
}

// ─── Fetcher ─────────────────────────────────────────────────

/**
 * Fetch events from MEO Arena — single page, no pagination.
 * Throws on non-200 (mirrors porto.js page-1 throw behaviour).
 */
async function fetchEvents(log) {
  const url   = LISTING_URL;
  const start = Date.now();

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html',
        'Accept-Language': 'pt-PT,pt;q=0.9',
      },
    });
  } catch (err) {
    log.api('meoarena', url, 'error', Date.now() - start, { error: String(err) });
    throw err;
  }

  const durationMs = Date.now() - start;

  if (!res.ok) {
    log.api('meoarena', url, res.status, durationMs);
    throw new Error('HTTP ' + res.status);
  }

  const html = await res.text();
  log.api('meoarena', url, res.status, durationMs, { bodyLength: html.length });

  const rawEvents = extractEvents(html);
  log.info('meoarena.parsed', { events: rawEvents.length });

  return rawEvents;
}

// ─── Normalizer ──────────────────────────────────────────────

/**
 * Normalize a MEO Arena raw event to the common pipeline schema.
 * Returns null if title is missing or the date cannot be parsed.
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = String(raw.title).trim();
  if (!title) return null;

  const dates = parseMeoDate(raw.dateText || '');
  if (!dates || !dates.dateStart) return null;

  const { dateStart, dateEnd } = dates;

  return {
    id:             'meoarena-' + raw.eventId,
    source:         'meoarena',
    sourceUrl:      raw.sourceUrl || '',
    title:          stripHtml(title, 200),
    description:    '',
    category:       mapCategory(title),
    imageUrl:       raw.imageUrl || '',
    cost:           '',
    dateStart,
    dateEnd:        dateEnd || dateStart,
    timeStart:      null,
    timeEnd:        null,
    isRecurring:    false,
    recurrenceNote: '',
    venue:          VENUE,
    address:        ADDRESS,
    lat:            LAT,
    lng:            LNG,
    city:           CITY,
    tags:           [],
    fetchedAt:      new Date().toISOString(),
  };
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
  id:      'meoarena',
  name:    'MEO Arena',
  enabled: true,
  CATEGORY_MAP,
  fetch:          fetchEvents,
  normalize,
  _extractEvents: extractEvents,
  _mapCategory:   mapCategory,
  _parseMeoDate:  parseMeoDate,
};
