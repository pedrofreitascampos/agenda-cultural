'use strict';

/**
 * Curated-newsletter source module.
 *
 * Unlike the other sources, this one does NOT scrape the web. It reads a local
 * drop-file — `data/curated-newsletter.json` — produced by the companion's
 * `/companion-email` skill, which uses an LLM to extract structured events from
 * editorial agenda newsletters (Lisboa Secreta, Time Out, Pumpkin, Culturgest,
 * Fábrica Braço de Prata, …) that have no clean machine-readable feed.
 *
 * The companion commits the drop-file to this repo; the next pipeline CI run
 * ingests it here and routes it through the SAME normalize → geocode → dedup →
 * merge → prune machinery as every other source. So curated events are
 * additive and self-deduplicating against scraped sources.
 *
 * Drop-file format (either shape accepted):
 *   [ <rawEvent>, ... ]
 *   { "generatedAt": "<iso>", "events": [ <rawEvent>, ... ] }
 *
 * rawEvent: {
 *   title:       string   (required)
 *   dateStart:   "YYYY-MM-DD"  (required — companion parses PT prose into ISO)
 *   dateEnd?:    "YYYY-MM-DD"  (defaults to dateStart)
 *   timeStart?:  "HH:MM" | null
 *   timeEnd?:    "HH:MM" | null
 *   venue?:      string   (name only; pipeline geocodes via the venue gazetteer)
 *   city?:       string   (defaults to "Lisboa")
 *   category?:   canonical category slug (defaults to "other" if invalid)
 *   sourceUrl?:  string   (RESOLVED real URL — tracking redirects followed upstream)
 *   imageUrl?:   string
 *   cost?:       string
 *   description?: string
 *   newsletter?: string   (provenance label, e.g. "Lisboa Secreta")
 * }
 */

const fs = require('fs');
const path = require('path');
const { stripHtml, CATEGORIES } = require('../normalize');

const DROP_FILE = path.join(__dirname, '..', '..', 'data', 'curated-newsletter.json');

// Categories are not source-native here — the companion already emits canonical
// slugs — so CATEGORY_MAP stays empty and we validate against the taxonomy.
const CATEGORY_MAP = {};
const VALID_CATEGORIES = new Set(Object.keys(CATEGORIES));

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Only http(s) URLs are allowed through. `escapeHtml` in the frontend encodes
 * characters but NOT schemes, so `javascript:`/`data:` would survive into an
 * <a href> (Agora security finding H-1). Reject anything that isn't http(s).
 */
function safeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

function slugify(str) {
  return String(str).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/**
 * Read the drop-file. Returns [] if absent or unparseable (source stays inert
 * until the companion produces it).
 */
async function fetchEvents(log) {
  let text;
  try {
    text = fs.readFileSync(DROP_FILE, 'utf-8');
  } catch {
    log.info('newsletter.skip', { reason: 'no drop-file', path: DROP_FILE });
    return [];
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    log.info('newsletter.error', { reason: 'invalid JSON', error: String(err) });
    return [];
  }

  const events = Array.isArray(data) ? data : (Array.isArray(data.events) ? data.events : []);
  log.info('newsletter.parsed', { events: events.length });
  return events;
}

/**
 * Normalize a companion-emitted raw event to the common schema.
 * Returns null if title is missing or dateStart is not a valid ISO date.
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = String(raw.title).trim();
  if (!title) return null;

  const dateStart = typeof raw.dateStart === 'string' ? raw.dateStart.trim() : '';
  if (!ISO_DATE.test(dateStart)) return null;

  let dateEnd = typeof raw.dateEnd === 'string' ? raw.dateEnd.trim() : '';
  if (!ISO_DATE.test(dateEnd)) dateEnd = dateStart;

  const category = VALID_CATEGORIES.has(raw.category) ? raw.category : 'other';

  const id = 'newsletter-' + slugify(title) + '-' + dateStart;

  const tags = ['curado'];
  if (raw.newsletter) tags.push(slugify(raw.newsletter));

  return {
    id,
    source:         'newsletter',
    sourceUrl:      safeUrl(raw.sourceUrl),
    title:          stripHtml(title, 200),
    description:    stripHtml(raw.description || '', 500),
    category,
    imageUrl:       safeUrl(raw.imageUrl),
    cost:           raw.cost ? String(raw.cost).trim() : '',
    dateStart,
    dateEnd,
    timeStart:      raw.timeStart || null,
    timeEnd:        raw.timeEnd || null,
    isRecurring:    false,
    recurrenceNote: '',
    venue:          raw.venue ? String(raw.venue).trim() : '',
    address:        '',
    lat:            null,
    lng:            null,
    city:           raw.city ? String(raw.city).trim() : 'Lisboa',
    tags,
    fetchedAt:      new Date().toISOString(),
  };
}

module.exports = {
  id: 'newsletter',
  name: 'Curated Newsletters',
  enabled: true,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
  // Exported for tests:
  _safeUrl: safeUrl,
  _slugify: slugify,
  DROP_FILE,
};
