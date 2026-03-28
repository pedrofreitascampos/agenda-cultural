'use strict';

/**
 * Tests for frontend filtering logic.
 * filterEvents() is a pure function — tested without DOM.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

// Inline the filter function (same logic that will be in app.js)
function filterEvents(events, filters) {
  return events.filter(e => {
    // Date overlap: event active during filter window
    const end = e.dateEnd || e.dateStart;
    if (end && filters.dateFrom && end < filters.dateFrom) return false;
    if (e.dateStart && filters.dateTo && e.dateStart > filters.dateTo) return false;
    // Category
    if (filters.categories && filters.categories.size > 0 && !filters.categories.has(e.category)) return false;
    // Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const inTitle = (e.title || '').toLowerCase().includes(q);
      const inVenue = (e.venue || '').toLowerCase().includes(q);
      if (!inTitle && !inVenue) return false;
    }
    // City
    if (filters.city && e.city !== filters.city) return false;
    return true;
  });
}

// ─── Test Data ───────────────────────────────────────────────

const EVENTS = [
  {
    id: 'e1', title: 'Concerto de Fado', category: 'music', venue: 'Casa do Fado',
    dateStart: '2026-03-28', dateEnd: '2026-03-28', city: 'Lisboa',
  },
  {
    id: 'e2', title: 'Exposição Arte Moderna', category: 'exhibitions', venue: 'Museu X',
    dateStart: '2026-03-01', dateEnd: '2026-04-15', city: 'Lisboa',
  },
  {
    id: 'e3', title: 'Festival de Jazz', category: 'music', venue: 'Coliseu do Porto',
    dateStart: '2026-04-01', dateEnd: '2026-04-05', city: 'Porto',
  },
  {
    id: 'e4', title: 'Workshop de Cerâmica', category: 'workshops', venue: 'Atelier Central',
    dateStart: '2026-03-20', dateEnd: '2026-03-20', city: 'Lisboa',
  },
  {
    id: 'e5', title: 'Peça de Teatro', category: 'theatre', venue: 'Teatro Nacional',
    dateStart: '2026-04-10', dateEnd: '2026-04-15', city: 'Lisboa',
  },
];

module.exports = [
  // ─── Date Filtering ──────────────────────────────────────

  {
    name: 'filterEvents: date range includes current + upcoming',
    fn: () => {
      const result = filterEvents(EVENTS, {
        dateFrom: '2026-03-28',
        dateTo: '2026-04-04',
      });
      // e1 (28 Mar), e2 (1 Mar-15 Apr, overlaps), e3 (1-5 Apr, overlaps)
      assertEqual(result.length, 3, 'count');
      assert(result.find(e => e.id === 'e1'), 'includes e1');
      assert(result.find(e => e.id === 'e2'), 'includes e2 (spanning)');
      assert(result.find(e => e.id === 'e3'), 'includes e3');
    },
  },
  {
    name: 'filterEvents: excludes events that ended before dateFrom',
    fn: () => {
      const result = filterEvents(EVENTS, {
        dateFrom: '2026-03-25',
        dateTo: '2026-03-27',
      });
      // Only e2 spans this range; e4 ended 20 Mar
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].id, 'e2', 'only spanning event');
    },
  },
  {
    name: 'filterEvents: excludes events starting after dateTo',
    fn: () => {
      const result = filterEvents(EVENTS, {
        dateFrom: '2026-03-01',
        dateTo: '2026-03-15',
      });
      // e2 (starts 1 Mar), e4 would start 20 Mar (excluded)
      assertEqual(result.length, 1, 'count');
    },
  },

  // ─── Category Filtering ──────────────────────────────────

  {
    name: 'filterEvents: empty categories = all pass',
    fn: () => {
      const result = filterEvents(EVENTS, {
        categories: new Set(),
      });
      assertEqual(result.length, EVENTS.length, 'all events');
    },
  },
  {
    name: 'filterEvents: single category filter',
    fn: () => {
      const result = filterEvents(EVENTS, {
        categories: new Set(['music']),
      });
      assertEqual(result.length, 2, 'two music events');
    },
  },
  {
    name: 'filterEvents: multiple categories',
    fn: () => {
      const result = filterEvents(EVENTS, {
        categories: new Set(['music', 'theatre']),
      });
      assertEqual(result.length, 3, 'music + theatre');
    },
  },

  // ─── Text Search ─────────────────────────────────────────

  {
    name: 'filterEvents: search by title (case insensitive)',
    fn: () => {
      const result = filterEvents(EVENTS, { search: 'fado' });
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].id, 'e1', 'fado concert');
    },
  },
  {
    name: 'filterEvents: search by venue',
    fn: () => {
      const result = filterEvents(EVENTS, { search: 'coliseu' });
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].id, 'e3', 'Coliseu venue');
    },
  },
  {
    name: 'filterEvents: search with no matches',
    fn: () => {
      const result = filterEvents(EVENTS, { search: 'xyz123' });
      assertEqual(result.length, 0, 'no matches');
    },
  },

  // ─── City Filter ─────────────────────────────────────────

  {
    name: 'filterEvents: city filter',
    fn: () => {
      const result = filterEvents(EVENTS, { city: 'Porto' });
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].id, 'e3', 'Porto event');
    },
  },

  // ─── Combined Filters ────────────────────────────────────

  {
    name: 'filterEvents: combined date + category + search',
    fn: () => {
      const result = filterEvents(EVENTS, {
        dateFrom: '2026-03-28',
        dateTo: '2026-04-04',
        categories: new Set(['music']),
        search: 'jazz',
      });
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].id, 'e3', 'Jazz festival');
    },
  },
  {
    name: 'filterEvents: all filters with no results',
    fn: () => {
      const result = filterEvents(EVENTS, {
        dateFrom: '2026-03-28',
        dateTo: '2026-03-28',
        categories: new Set(['theatre']),
        city: 'Porto',
      });
      assertEqual(result.length, 0, 'no matches');
    },
  },

  // ─── Edge Cases ──────────────────────────────────────────

  {
    name: 'filterEvents: event spanning filter boundary',
    fn: () => {
      // e2 runs Mar 1 - Apr 15, filter window is Mar 28 - Apr 4
      const result = filterEvents([EVENTS[1]], {
        dateFrom: '2026-03-28',
        dateTo: '2026-04-04',
      });
      assertEqual(result.length, 1, 'spanning event included');
    },
  },
  {
    name: 'filterEvents: empty events array',
    fn: () => {
      const result = filterEvents([], { dateFrom: '2026-03-28', dateTo: '2026-04-04' });
      assertEqual(result.length, 0, 'empty');
    },
  },
  {
    name: 'filterEvents: no filters = all pass',
    fn: () => {
      const result = filterEvents(EVENTS, {});
      assertEqual(result.length, EVENTS.length, 'all events');
    },
  },
];
