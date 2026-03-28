'use strict';

/**
 * Tests for pipeline merge, dedup, and prune logic.
 */

const {
  mergeEvents,
  pruneEvents,
  deduplicateEvents,
} = require('../pipeline/normalize');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

module.exports = [
  // ─── Merge ───────────────────────────────────────────────

  {
    name: 'mergeEvents: adds new events',
    fn: () => {
      const existing = [{ id: 'a-1', title: 'Event A' }];
      const incoming = [{ id: 'b-1', title: 'Event B' }];
      const result = mergeEvents(existing, incoming);
      assertEqual(result.length, 2, 'count');
    },
  },
  {
    name: 'mergeEvents: upserts existing events',
    fn: () => {
      const existing = [{ id: 'a-1', title: 'Old Title', description: 'old' }];
      const incoming = [{ id: 'a-1', title: 'New Title', description: 'new' }];
      const result = mergeEvents(existing, incoming);
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].title, 'New Title', 'updated title');
      assertEqual(result[0].description, 'new', 'updated description');
    },
  },
  {
    name: 'mergeEvents: preserves events not in incoming',
    fn: () => {
      const existing = [
        { id: 'a-1', title: 'A' },
        { id: 'a-2', title: 'B' },
      ];
      const incoming = [{ id: 'a-1', title: 'A updated' }];
      const result = mergeEvents(existing, incoming);
      assertEqual(result.length, 2, 'count');
      assert(result.find(e => e.id === 'a-2'), 'a-2 preserved');
    },
  },
  {
    name: 'mergeEvents: empty existing + incoming',
    fn: () => {
      assertEqual(mergeEvents([], []).length, 0, 'both empty');
      assertEqual(mergeEvents([], [{ id: 'a' }]).length, 1, 'empty existing');
      assertEqual(mergeEvents([{ id: 'a' }], []).length, 1, 'empty incoming');
    },
  },

  // ─── Prune ───────────────────────────────────────────────

  {
    name: 'pruneEvents: removes events ended > N days ago',
    fn: () => {
      const today = new Date();
      const old = new Date(today);
      old.setDate(old.getDate() - 40);
      const recent = new Date(today);
      recent.setDate(recent.getDate() - 5);

      const events = [
        { id: 'old', dateStart: old.toISOString().slice(0, 10), dateEnd: old.toISOString().slice(0, 10) },
        { id: 'recent', dateStart: recent.toISOString().slice(0, 10), dateEnd: recent.toISOString().slice(0, 10) },
      ];

      const result = pruneEvents(events, 30);
      assertEqual(result.length, 1, 'count');
      assertEqual(result[0].id, 'recent', 'kept recent');
    },
  },
  {
    name: 'pruneEvents: keeps events with no dateEnd (uses dateStart)',
    fn: () => {
      const events = [
        { id: 'a', dateStart: '2099-01-01' },
      ];
      const result = pruneEvents(events, 30);
      assertEqual(result.length, 1, 'kept');
    },
  },
  {
    name: 'pruneEvents: keeps events with no dates',
    fn: () => {
      const events = [{ id: 'a' }];
      const result = pruneEvents(events, 30);
      assertEqual(result.length, 1, 'kept');
    },
  },

  // ─── Deduplication ───────────────────────────────────────

  {
    name: 'deduplicateEvents: removes cross-source duplicates',
    fn: () => {
      const events = [
        {
          id: 'agendalx-1', source: 'agendalx', title: 'Concerto de Fado',
          dateStart: '2026-03-28', venue: 'Casa do Fado',
          description: 'A long description of this event', imageUrl: 'img.jpg',
          lat: 38.72, lng: -9.14,
        },
        {
          id: 'other-1', source: 'other', title: 'Concerto de Fado',
          dateStart: '2026-03-28', venue: 'Casa do Fado',
          description: 'Short', imageUrl: '',
          lat: null, lng: null,
        },
      ];

      const result = deduplicateEvents(events);
      assertEqual(result.length, 1, 'one kept');
      assertEqual(result[0].id, 'agendalx-1', 'richer event kept');
    },
  },
  {
    name: 'deduplicateEvents: keeps events from same source',
    fn: () => {
      const events = [
        { id: 'a-1', source: 'agendalx', title: 'Event A', dateStart: '2026-03-28', venue: 'V' },
        { id: 'a-2', source: 'agendalx', title: 'Event A', dateStart: '2026-03-28', venue: 'V' },
      ];
      const result = deduplicateEvents(events);
      assertEqual(result.length, 2, 'both kept (same source)');
    },
  },
  {
    name: 'deduplicateEvents: different dates = not duplicate',
    fn: () => {
      const events = [
        { id: 'a-1', source: 'agendalx', title: 'Same Event', dateStart: '2026-03-28', venue: 'V' },
        { id: 'b-1', source: 'other', title: 'Same Event', dateStart: '2026-04-05', venue: 'V' },
      ];
      const result = deduplicateEvents(events);
      assertEqual(result.length, 2, 'both kept (different dates)');
    },
  },
  {
    name: 'deduplicateEvents: different titles = not duplicate',
    fn: () => {
      const events = [
        { id: 'a-1', source: 'agendalx', title: 'Concerto de Fado', dateStart: '2026-03-28', venue: 'V' },
        { id: 'b-1', source: 'other', title: 'Workshop de Cerâmica', dateStart: '2026-03-28', venue: 'V' },
      ];
      const result = deduplicateEvents(events);
      assertEqual(result.length, 2, 'both kept (different titles)');
    },
  },
];
