'use strict';

/**
 * Pumpkin.pt kids/family events source module.
 * HTML listing — each event is an <article class="...event type-event..."> block.
 * Pagination: /eventos/page/{N}/?pesquisa=true&onde=<city>
 *
 * Date strings use English 3-letter month abbreviations (e.g. "17 Jun 2026",
 * "12 Sep 2025 a 20 Jun 2026"), so we translate them to PT before calling
 * parsePtDateRange.
 */

const { stripHtml, parsePtDateRange } = require('../normalize');

// ─── Config ──────────────────────────────────────────────────

const CITIES = ['lisboa'];
const MAX_PAGES = 20;

/** Map city slugs to display labels (extend alongside CITIES). */
const CITY_LABELS = { 'lisboa': 'Lisboa', 'porto': 'Porto' };

// ─── Category Mapping ────────────────────────────────────────

const CATEGORY_MAP = {
  'espetaculos-musica-escolas':           'theatre',
  'musica-teatro-filmes':                  'theatre',
  'oficinas-artisticas':                   'workshops',
  'oficinas-culinaria-criancas':           'workshops',
  'hora-do-conto-atividades-leitura-escrita': 'literature',
};

/**
 * Map a Pumpkin category slug (from the article class) to a canonical category.
 * Falls back to 'family' — this is a kids/family source.
 */
function mapCategory(slug) {
  if (!slug) return 'family';
  const lower = slug.toLowerCase();
  if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];
  if (lower.includes('oficina'))                         return 'workshops';
  if (lower.includes('musica') || lower.includes('concerto')) return 'music';
  if (lower.includes('teatro'))                          return 'theatre';
  if (lower.includes('conto') || lower.includes('leitura')) return 'literature';
  if (lower.includes('danca'))                           return 'dance';
  if (lower.includes('cinema') || lower.includes('filme')) return 'cinema';
  if (lower.includes('exposic'))                         return 'exhibitions';
  if (lower.includes('festival'))                        return 'festivals';
  return 'family';
}

// ─── Date Parsing ────────────────────────────────────────────

/**
 * English month abbreviations → Portuguese abbreviations understood by parsePtDateRange.
 * Only the ones that differ from PT need translating; all are listed for completeness.
 */
const EN_TO_PT = {
  'jan': 'jan', 'feb': 'fev', 'mar': 'mar', 'apr': 'abr',
  'may': 'mai', 'jun': 'jun', 'jul': 'jul', 'aug': 'ago',
  'sep': 'set', 'oct': 'out', 'nov': 'nov', 'dec': 'dez',
};

/**
 * Parse a Pumpkin date string into { dateStart, dateEnd } or null.
 *
 * Handles:
 *   "17 Jun 2026"               → single date
 *   "12 Sep 2025 a 20 Jun 2026" → range ("a" separator handled by parsePtDateRange)
 *   "Evento permanente"         → null (no digit)
 *
 * Strategy: translate English months to PT, then delegate to parsePtDateRange.
 */
function parsePumpkinDate(dateText) {
  if (!dateText || typeof dateText !== 'string') return null;
  // No digit → not a real date (e.g. "Evento permanente")
  if (!/\d/.test(dateText)) return null;

  let translated = dateText.toLowerCase();
  for (const [en, pt] of Object.entries(EN_TO_PT)) {
    translated = translated.replace(new RegExp('\\b' + en + '\\b', 'g'), pt);
  }

  return parsePtDateRange(translated, new Date().getFullYear()) || null;
}

// ─── HTML Parsing ────────────────────────────────────────────

/**
 * Extract raw event objects from a Pumpkin listing page HTML.
 * Filters to <article> blocks whose class contains "event type-event".
 *
 * @param {string} html
 * @returns {Array<{postId,title,sourceUrl,imageUrl,dateText,location,cost,categorySlug}>}
 */
function extractEvents(html) {
  const events = [];
  const seen = new Set(); // dedup by postId within a single page

  const articleRe = /<article\b[^>]*>[\s\S]*?<\/article>/g;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const block = m[0];

    // Only process event-type articles
    const classAttrMatch = block.match(/<article\b[^>]*class="([^"]*)"/);
    if (!classAttrMatch || !classAttrMatch[1].includes('event type-event')) continue;
    const articleClass = classAttrMatch[1];

    // postId: id="post-<number>"
    const idMatch = block.match(/\bid="post-(\d+)"/);
    const postId = idMatch ? idMatch[1] : '';
    if (postId && seen.has(postId)) continue;
    if (postId) seen.add(postId);

    // title + sourceUrl from the entry-title <h2><a>
    const titleMatch = block.match(
      /<h2[^>]*class="entry-title"[^>]*>\s*<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/
    );
    const sourceUrl = titleMatch ? titleMatch[1] : '';
    const titleRaw  = titleMatch ? titleMatch[2] : '';
    const title     = titleRaw.replace(/<[^>]+>/g, '').trim();
    if (!title) continue;

    // imageUrl: src of img inside .post-thumbnail anchor
    const imgMatch = block.match(
      /<a[^>]*class="post-thumbnail"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>/
    );
    const imageUrl = imgMatch ? imgMatch[1] : '';

    // dateText: text inside <span class="event-dates-preview">
    const dateMatch = block.match(/<span[^>]*class="event-dates-preview"[^>]*>([\s\S]*?)<\/span>/);
    const dateText  = dateMatch ? dateMatch[1].replace(/\s+/g, ' ').trim() : '';

    // location: bare <span class=""> that immediately follows the dates span
    const locMatch = block.match(
      /<span[^>]*class="event-dates-preview"[^>]*>[\s\S]*?<\/span>\s*<span[^>]*class=""[^>]*>([\s\S]*?)<\/span>/
    );
    const location = locMatch ? locMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // cost: text inside <span class="event-admission">
    const costMatch = block.match(/<span[^>]*class="event-admission"[^>]*>([\s\S]*?)<\/span>/);
    const cost = costMatch ? costMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // categorySlug: first "category-<slug>" token in article class
    const catMatch    = articleClass.match(/\bcategory-([\w-]+)/);
    const categorySlug = catMatch ? catMatch[1] : '';

    events.push({ postId, title, sourceUrl, imageUrl, dateText, location, cost, categorySlug });
  }

  return events;
}

// ─── Fetcher ─────────────────────────────────────────────────

/**
 * Fetch raw events from Pumpkin.pt — paginated per city.
 * Stops per-city when a page returns 0 new events or on HTTP error (throws on page 1).
 */
async function fetchEvents(log) {
  const allEvents = [];
  const seen = new Set(); // dedup by postId across pages

  for (const city of CITIES) {
    const baseUrl = `https://pumpkin.pt/eventos/?pesquisa=true&onde=${city}`;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1
        ? baseUrl
        : `https://pumpkin.pt/eventos/page/${page}/?pesquisa=true&onde=${city}`;
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
          log.api('pumpkin', url, res.status, durationMs);
          if (page === 1) throw new Error('HTTP ' + res.status);
          break;
        }

        const html = await res.text();
        log.api('pumpkin', url, res.status, durationMs, { bodyLength: html.length });

        const pageEvents = extractEvents(html);
        let newCount = 0;
        for (const e of pageEvents) {
          const key = e.postId || (e.title + '\x00' + e.dateText);
          if (seen.has(key)) continue;
          seen.add(key);
          allEvents.push({ ...e, city }); // carry city slug for normalize()
          newCount++;
        }
        log.info('pumpkin.page', { city, page, total: pageEvents.length, new: newCount });
        if (newCount === 0) break; // no new events — last page reached
      } catch (err) {
        log.api('pumpkin', url, 'error', Date.now() - start, { error: String(err) });
        if (page === 1) throw err;
        break;
      }
    }
  }

  log.info('pumpkin.parsed', { events: allEvents.length });
  return allEvents;
}

// ─── Normalizer ──────────────────────────────────────────────

/**
 * Normalize a Pumpkin raw event to the common schema.
 * Returns null if title is missing or date cannot be parsed.
 */
function normalize(raw) {
  if (!raw || !raw.title) return null;

  const title = String(raw.title).trim();
  if (!title) return null;

  const dates = parsePumpkinDate(raw.dateText || '');
  if (!dates || !dates.dateStart) return null;

  const { dateStart, dateEnd } = dates;

  const postId = raw.postId || '';
  const idSlug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = 'pumpkin-' + (postId || idSlug) + '-' + dateStart;

  const city = CITY_LABELS[raw.city] || 'Lisboa';

  return {
    id,
    source:         'pumpkin',
    sourceUrl:      raw.sourceUrl || '',
    title:          stripHtml(title, 200),
    description:    '',
    category:       mapCategory(raw.categorySlug || ''),
    imageUrl:       raw.imageUrl || '',
    cost:           raw.cost || '',
    dateStart,
    dateEnd:        dateEnd || dateStart,
    timeStart:      null,
    timeEnd:        null,
    isRecurring:    false,
    recurrenceNote: '',
    venue:          raw.location || '',
    address:        '',
    lat:            null,
    lng:            null,
    city,
    tags:           ['criancas'],
    fetchedAt:      new Date().toISOString(),
  };
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
  id:   'pumpkin',
  name: 'Pumpkin.pt',
  enabled: true,
  CATEGORY_MAP,
  fetch:     fetchEvents,
  normalize,
  // Exported for tests:
  _extractEvents:    extractEvents,
  _mapCategory:      mapCategory,
  _parsePumpkinDate: parsePumpkinDate,
};
