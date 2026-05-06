'use strict';

/**
 * EGEAC (Empresa de Gestão de Equipamentos e Animação Cultural) source module.
 * Lisbon municipal cultural entity — manages theatres, museums, galleries.
 *
 * No public API. Events are scraped from /programacao-espacos-culturais/, where
 * each card is a `div.col-12.to-filter` element with data attributes:
 *   data-categoria, data-inicio (YYYY-MM-DD), data-fim, data-local
 *
 * Title is in <strong> inside <p class="h5">, image in <img data-src=...>.
 * Source URL comes from the first <a href> inside the card.
 */

const { stripHtml } = require('../normalize');

const PROGRAM_URL = 'https://egeac.pt/programacao-espacos-culturais/';

const CATEGORY_MAP = {
  'teatro':                    'theatre',
  'novo circo':                'theatre',
  'performance':               'theatre',
  'música':                    'music',
  'musica':                    'music',
  'dança':                     'dance',
  'danca':                     'dance',
  'cinema':                    'cinema',
  'exposição':                 'exhibitions',
  'exposicao':                 'exhibitions',
  'instalação':                'exhibitions',
  'instalacao':                'exhibitions',
  'inauguração':               'exhibitions',
  'inauguracao':               'exhibitions',
  'oficina':                   'workshops',
  'workshop':                  'workshops',
  'feira':                     'festivals',
  'festa':                     'festivals',
  'festival':                  'festivals',
  'literatura':                'literature',
  'apresentação':              'literature',
  'apresentacao':              'literature',
  'lançamento':                'literature',
  'debate':                    'literature',
  'conversa':                  'literature',
  'conferência':               'literature',
  'conferencia':               'literature',
  'visita orientada':          'other',
  'percursos':                 'other',
};

function decodeEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Map EGEAC categoria string to our canonical category.
 */
function mapCategory(categoria) {
  if (!categoria) return 'other';
  const lower = categoria.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return 'other';
}

/**
 * Extract events from the programmatic HTML cards.
 * Strategy: locate every `<div ... to-filter ...>` opening tag, parse its
 * data-* attrs, then take the body as the slice up to the next opening tag.
 * This avoids brittle balanced-div matching on nested HTML.
 */
function extractEvents(html) {
  const events = [];

  // Capture each card's opening tag with its data attrs and the index of the
  // tag's end (`>`). The body is everything from there until the next card.
  const openTagRe = /<div[^>]*class="[^"]*\bto-filter\b[^"]*"[^>]*data-categoria="([^"]*)"[^>]*data-inicio="([^"]*)"[^>]*data-fim="([^"]*)"[^>]*data-local="([^"]*)"[^>]*>/g;

  const matches = [];
  let m;
  while ((m = openTagRe.exec(html)) !== null) {
    matches.push({
      categoria: decodeEntities(m[1]),
      dateStart: /^\d{4}-\d{2}-\d{2}$/.test(m[2]) ? m[2] : null,
      dateEnd: /^\d{4}-\d{2}-\d{2}$/.test(m[3]) ? m[3] : null,
      venue: decodeEntities(m[4]),
      bodyStart: m.index + m[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const meta = matches[i];
    const bodyEnd = i + 1 < matches.length ? matches[i + 1].bodyStart : html.length;
    const body = html.slice(meta.bodyStart, bodyEnd);
    const { categoria, dateStart, dateEnd, venue } = meta;

    if (!dateStart) continue;

    // Title: <p class="h5"><strong>TITLE</strong></p>
    const titleMatch = /<p[^>]*class="[^"]*h5[^"]*"[^>]*>\s*<strong[^>]*>([\s\S]*?)<\/strong>/i.exec(body);
    const title = titleMatch ? decodeEntities(stripHtml(titleMatch[1], 200)).trim() : '';
    if (!title) continue;

    // Source URL: first <a href="...">
    const urlMatch = /<a[^>]+href="([^"]+)"/i.exec(body);
    const sourceUrl = urlMatch ? decodeEntities(urlMatch[1]) : '';

    // Image: <img data-src="..."> (lazy-loaded) or <img src="...">
    const imgMatch = /<img[^>]+(?:data-src|src)="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i.exec(body);
    const imageUrl = imgMatch ? decodeEntities(imgMatch[1]) : '';

    events.push({
      categoria,
      title,
      dateStart,
      dateEnd: dateEnd || dateStart,
      venue,
      sourceUrl,
      imageUrl,
    });
  }

  return events;
}

/**
 * Fetch events from EGEAC programming page.
 */
async function fetchEvents(log) {
  const start = Date.now();

  try {
    const res = await fetch(PROGRAM_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Agora-CulturalEventsMap/1.0; +https://github.com/)',
        'Accept': 'text/html',
        'Accept-Language': 'pt-PT,pt;q=0.9',
      },
    });

    const durationMs = Date.now() - start;

    if (!res.ok) {
      log.api('egeac', PROGRAM_URL, res.status, durationMs);
      throw new Error('HTTP ' + res.status);
    }

    const html = await res.text();
    log.api('egeac', PROGRAM_URL, res.status, durationMs, { bodyLength: html.length });

    const events = extractEvents(html);
    log.info('egeac.parsed', { events: events.length });

    return events;
  } catch (err) {
    log.api('egeac', PROGRAM_URL, 'error', Date.now() - start, { error: String(err) });
    throw err;
  }
}

/**
 * Normalize a single EGEAC event card.
 */
function normalize(raw) {
  if (!raw || !raw.title || !raw.dateStart) return null;

  const idSlug = raw.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  const id = 'egeac-' + idSlug + '-' + raw.dateStart;

  return {
    id,
    source: 'egeac',
    sourceUrl: raw.sourceUrl || '',
    title: raw.title,
    description: '',
    category: mapCategory(raw.categoria),
    imageUrl: raw.imageUrl || '',
    cost: '',
    dateStart: raw.dateStart,
    dateEnd: raw.dateEnd || raw.dateStart,
    timeStart: null,
    timeEnd: null,
    isRecurring: false,
    recurrenceNote: '',
    venue: raw.venue || '',
    address: '',
    lat: null,
    lng: null,
    city: 'Lisboa',
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
  // Exported for tests:
  _extractEvents: extractEvents,
  _mapCategory: mapCategory,
};
