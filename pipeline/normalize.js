'use strict';

/**
 * Shared normalization utilities for the data pipeline.
 * Handles Portuguese date/time parsing, category mapping, HTML stripping, dedup.
 */

// ─── Category Taxonomy ───────────────────────────────────────

const CATEGORIES = {
  music:        { icon: '\uD83C\uDFB5', color: '#8b5cf6', label: 'Musica' },
  theatre:      { icon: '\uD83C\uDFAD', color: '#ef4444', label: 'Teatro' },
  dance:        { icon: '\uD83D\uDC83', color: '#ec4899', label: 'Danca' },
  cinema:       { icon: '\uD83C\uDFAC', color: '#f59e0b', label: 'Cinema' },
  exhibitions:  { icon: '\uD83D\uDDBC\uFE0F', color: '#3b82f6', label: 'Exposicoes' },
  workshops:    { icon: '\uD83D\uDEE0\uFE0F', color: '#10b981', label: 'Workshops' },
  festivals:    { icon: '\u2B50',        color: '#f97316', label: 'Festivais' },
  literature:   { icon: '\uD83D\uDCD6', color: '#6366f1', label: 'Literatura' },
  family:       { icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', color: '#14b8a6', label: 'Familias' },
  other:        { icon: '\uD83D\uDCC5', color: '#6b7280', label: 'Outros' },
};

// ─── Portuguese Month Names ──────────────────────────────────

const PT_MONTHS = {
  'janeiro': 1, 'jan': 1,
  'fevereiro': 2, 'fev': 2,
  'marco': 3, 'março': 3, 'mar': 3,
  'abril': 4, 'abr': 4,
  'maio': 5, 'mai': 5,
  'junho': 6, 'jun': 6,
  'julho': 7, 'jul': 7,
  'agosto': 8, 'ago': 8,
  'setembro': 9, 'set': 9,
  'outubro': 10, 'out': 10,
  'novembro': 11, 'nov': 11,
  'dezembro': 12, 'dez': 12,
};

// ─── Date Parsing ────────────────────────────────────────────

/**
 * Parse a Portuguese date string into { dateStart, dateEnd } ISO strings.
 *
 * Handles formats like:
 *   "28 de março de 2026"
 *   "28 março 2026"
 *   "28 de março a 5 de abril de 2026"
 *   "28 mar - 5 abr 2026"
 *   "2026-03-28" (ISO passthrough)
 *   "28/03/2026" (DD/MM/YYYY)
 *
 * Returns { dateStart: 'YYYY-MM-DD', dateEnd: 'YYYY-MM-DD' } or null on failure.
 */
function parsePtDateRange(str, fallbackYear) {
  if (!str || typeof str !== 'string') return null;
  const raw = str.trim();

  // ISO passthrough: "2026-03-28" (check before transformations)
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = isoMatch[0];
    return { dateStart: d, dateEnd: d };
  }

  const s = raw.toLowerCase()
    .replace(/\bde\b/g, '')  // remove "de"
    .replace(/\ba\b/g, '–')  // "a" as range separator → dash
    .replace(/\s*[-–]\s*/g, '–') // normalize dashes
    .replace(/\s+/g, ' ')
    .trim();

  // DD/MM/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = formatDate(+slashMatch[3], +slashMatch[2], +slashMatch[1]);
    return d ? { dateStart: d, dateEnd: d } : null;
  }

  // Try range: "28 março – 5 abril 2026"
  const rangeParts = s.split('–');
  if (rangeParts.length === 2) {
    const start = parseSinglePtDate(rangeParts[0].trim(), fallbackYear);
    const end = parseSinglePtDate(rangeParts[1].trim(), fallbackYear);
    if (start && end) {
      // If start has no year, infer from end
      return { dateStart: start, dateEnd: end };
    }
  }

  // Single date: "28 março 2026"
  const single = parseSinglePtDate(s, fallbackYear);
  if (single) {
    return { dateStart: single, dateEnd: single };
  }

  return null;
}

/**
 * Parse a single Portuguese date like "28 março 2026" or "28 mar" into "YYYY-MM-DD".
 */
function parseSinglePtDate(str, fallbackYear) {
  if (!str) return null;
  const tokens = str.trim().split(/\s+/);

  let day = null, month = null, year = fallbackYear || new Date().getFullYear();

  for (const tok of tokens) {
    const num = parseInt(tok, 10);
    if (!isNaN(num)) {
      if (num > 31) {
        year = num; // it's a year
      } else if (day === null) {
        day = num;
      }
    } else {
      const m = PT_MONTHS[tok];
      if (m) month = m;
    }
  }

  if (day && month) {
    return formatDate(year, month, day);
  }
  return null;
}

function formatDate(year, month, day) {
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Time Parsing ────────────────────────────────────────────

/**
 * Parse a Portuguese time string into { timeStart, timeEnd }.
 *
 * Handles:
 *   "21h00"
 *   "21h00 - 23h00"
 *   "21:00 - 23:00"
 *   "21h - 23h"
 *   "das 21h00 às 23h00"
 *
 * Returns { timeStart: 'HH:MM', timeEnd: 'HH:MM' } (either can be null).
 */
function parsePtTimeRange(str) {
  if (!str || typeof str !== 'string') return { timeStart: null, timeEnd: null };

  const s = str.trim().toLowerCase()
    .replace(/\bdas\b/gi, '')
    .replace(/\s+às\s+/gi, '–')   // "às" is a range separator
    .replace(/\s+até\s+/gi, '–')  // "até" is a range separator
    .replace(/\s+ate\s+/gi, '–')  // "ate" is a range separator
    .replace(/\s*[-–]\s*/g, '–')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = s.split('–');
  const timeStart = parseSingleTime(parts[0]);
  const timeEnd = parts.length > 1 ? parseSingleTime(parts[1]) : null;

  return { timeStart, timeEnd };
}

/**
 * Parse a single time like "21h00", "21:00", "21h" into "HH:MM".
 */
function parseSingleTime(str) {
  if (!str) return null;
  const s = str.trim();

  // "21h00" or "21h"
  const hMatch = s.match(/(\d{1,2})h(\d{2})?/);
  if (hMatch) {
    const h = parseInt(hMatch[1], 10);
    const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // "21:00"
  const colonMatch = s.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return null;
}

// ─── HTML Stripping ──────────────────────────────────────────

/**
 * Strip HTML tags and decode common entities. Truncate to maxLen chars.
 */
function stripHtml(html, maxLen) {
  if (!html || typeof html !== 'string') return '';
  let text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (maxLen && text.length > maxLen) {
    text = text.slice(0, maxLen - 1).trim() + '\u2026';
  }
  return text;
}

// ─── Deduplication ───────────────────────────────────────────

/**
 * Simple string similarity (Dice coefficient on bigrams).
 * Returns 0-1 where 1 is identical.
 */
function similarity(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  if (a === b) return 1;

  const bigramsA = new Set();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  const bigramsB = new Set();
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

/**
 * Deduplicate events across sources.
 * If two events have similar titles (>0.8), same dateStart, and same venue → keep the one
 * with more data (longer description, has image, has coordinates).
 *
 * Returns the deduplicated array.
 */
function deduplicateEvents(events) {
  const kept = [];
  const removed = new Set();

  for (let i = 0; i < events.length; i++) {
    if (removed.has(i)) continue;

    let best = events[i];
    for (let j = i + 1; j < events.length; j++) {
      if (removed.has(j)) continue;
      const other = events[j];

      // Same source → already unique by id
      if (best.source === other.source) continue;

      // Check duplicate criteria
      if (
        best.dateStart === other.dateStart &&
        similarity(best.title, other.title) > 0.8 &&
        (
          !best.venue || !other.venue ||
          similarity(best.venue, other.venue) > 0.6
        )
      ) {
        // Keep the richer one
        const scoreA = richness(best);
        const scoreB = richness(other);
        if (scoreB > scoreA) {
          best = other;
          removed.add(i);
        } else {
          removed.add(j);
        }
      }
    }
    if (!removed.has(i)) {
      kept.push(best);
    } else if (!removed.has(events.indexOf(best))) {
      // best was swapped to the other event
      kept.push(best);
    }
  }

  return kept;
}

function richness(event) {
  let score = 0;
  if (event.description && event.description.length > 20) score += 2;
  if (event.imageUrl) score += 1;
  if (event.lat != null && event.lng != null) score += 2;
  if (event.cost) score += 1;
  if (event.timeStart) score += 1;
  return score;
}

// ─── Merge & Prune ───────────────────────────────────────────

/**
 * Merge new events into existing events (upsert by id).
 * Returns the merged array.
 */
function mergeEvents(existing, incoming) {
  const index = new Map();
  for (const e of existing) {
    index.set(e.id, e);
  }
  for (const e of incoming) {
    index.set(e.id, e); // upsert: new data overwrites old
  }
  return Array.from(index.values());
}

/**
 * Remove events that ended more than `daysAgo` days ago.
 */
function pruneEvents(events, daysAgo) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysAgo);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return events.filter(e => {
    const end = e.dateEnd || e.dateStart;
    return !end || end >= cutoffStr;
  });
}

// ─── Exports ─────────────────────────────────────────────────

module.exports = {
  CATEGORIES,
  PT_MONTHS,
  parsePtDateRange,
  parseSinglePtDate,
  parsePtTimeRange,
  parseSingleTime,
  stripHtml,
  similarity,
  deduplicateEvents,
  mergeEvents,
  pruneEvents,
  formatDate,
};
