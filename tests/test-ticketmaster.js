'use strict';

const {
  normalize,
  _extractEvents,
  _mapCategory,
} = require('../pipeline/sources/ticketmaster');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

function assertNotNull(actual, label) {
  if (actual === null || actual === undefined) {
    const err = new Error(`${label}: expected non-null, got ${JSON.stringify(actual)}`);
    throw err;
  }
}

function assertContains(actual, substr, label) {
  if (typeof actual !== 'string' || !actual.includes(substr)) {
    const err = new Error(`${label}: expected "${actual}" to contain "${substr}"`);
    throw err;
  }
}

// ── Fixture ───────────────────────────────────────────────────────────────────
// Mirrors the example event from the Discovery API v2 docs used in the spec.

const SAMPLE_EVENT = {
  name: 'Coldplay: Music of the Spheres',
  id: 'Z698xZbpZ17e3',
  url: 'https://www.ticketmaster.pt/event/coldplay',
  images: [
    { ratio: '4_3',  url: 'https://media.ticketmaster.com/small.jpg',  width: 305,  height: 225 },
    { ratio: '16_9', url: 'https://media.ticketmaster.com/large.jpg',  width: 1024, height: 576 },
    { ratio: '3_2',  url: 'https://media.ticketmaster.com/medium.jpg', width: 640,  height: 427 },
  ],
  dates: {
    start: { localDate: '2026-07-15', localTime: '21:00:00', dateTime: '2026-07-15T20:00:00Z' },
    end:   { localDate: '2026-07-15' },
  },
  classifications: [{
    segment:  { name: 'Music' },
    genre:    { name: 'Rock' },
    subGenre: { name: 'Pop' },
  }],
  priceRanges: [{ type: 'standard', currency: 'EUR', min: 45.0, max: 120.0 }],
  _embedded: {
    venues: [{
      name:       'Estádio da Luz',
      city:       { name: 'Lisboa' },
      address:    { line1: 'Av. Eusébio da Silva Ferreira' },
      postalCode: '1500-313',
      location:   { latitude: '38.752700', longitude: '-9.184600' },
    }],
  },
};

const FIXTURE = { _embedded: { events: [SAMPLE_EVENT] } };

// ── Tests ─────────────────────────────────────────────────────────────────────

module.exports = [
  // ── _extractEvents ──────────────────────────────────────────────────────────
  {
    name: '_extractEvents: returns 1 event from the fixture',
    fn: () => {
      const events = _extractEvents(FIXTURE);
      assertEqual(events.length, 1, 'event count');
      assertEqual(events[0].id, 'Z698xZbpZ17e3', 'event id');
    },
  },
  {
    name: '_extractEvents: returns [] for empty object {}',
    fn: () => {
      assertEqual(_extractEvents({}).length, 0, 'empty object');
    },
  },
  {
    name: '_extractEvents: returns [] for {_embedded:{}}',
    fn: () => {
      assertEqual(_extractEvents({ _embedded: {} }).length, 0, 'no events array');
    },
  },

  // ── _mapCategory ────────────────────────────────────────────────────────────
  {
    name: '_mapCategory: Music -> music',
    fn: () => {
      assertEqual(_mapCategory('Music'), 'music', 'Music');
    },
  },
  {
    name: '_mapCategory: Arts & Theatre + genre Dance -> dance',
    fn: () => {
      assertEqual(_mapCategory('Arts & Theatre', 'Dance'), 'dance', 'Dance');
    },
  },
  {
    name: '_mapCategory: Arts & Theatre + genre Rock -> theatre (default)',
    fn: () => {
      assertEqual(_mapCategory('Arts & Theatre', 'Rock'), 'theatre', 'Rock→theatre');
    },
  },
  {
    name: '_mapCategory: Arts & Theatre + genre Classical -> music',
    fn: () => {
      assertEqual(_mapCategory('Arts & Theatre', 'Classical'), 'music', 'Classical→music');
    },
  },
  {
    name: '_mapCategory: Arts & Theatre + genre Opera -> music',
    fn: () => {
      assertEqual(_mapCategory('Arts & Theatre', 'Opera'), 'music', 'Opera→music');
    },
  },
  {
    name: '_mapCategory: Film -> cinema',
    fn: () => {
      assertEqual(_mapCategory('Film'), 'cinema', 'Film');
    },
  },
  {
    name: '_mapCategory: Sports -> other',
    fn: () => {
      assertEqual(_mapCategory('Sports'), 'other', 'Sports');
    },
  },
  {
    name: '_mapCategory: Family -> family',
    fn: () => {
      assertEqual(_mapCategory('Family'), 'family', 'Family');
    },
  },
  {
    name: '_mapCategory: missing segment -> other',
    fn: () => {
      assertEqual(_mapCategory(undefined), 'other', 'undefined');
      assertEqual(_mapCategory(null), 'other', 'null');
      assertEqual(_mapCategory(''), 'other', 'empty string');
    },
  },
  {
    name: '_mapCategory: Miscellaneous -> other',
    fn: () => {
      assertEqual(_mapCategory('Miscellaneous'), 'other', 'Miscellaneous');
    },
  },

  // ── normalize — full fixture event ──────────────────────────────────────────
  {
    name: 'normalize: full fixture event — source and id',
    fn: () => {
      const n = normalize(SAMPLE_EVENT);
      assertNotNull(n, 'result');
      assertEqual(n.source, 'ticketmaster', 'source');
      assertEqual(n.id, 'ticketmaster-Z698xZbpZ17e3', 'id');
    },
  },
  {
    name: 'normalize: full fixture event — dates and times',
    fn: () => {
      const n = normalize(SAMPLE_EVENT);
      assertEqual(n.dateStart, '2026-07-15', 'dateStart');
      assertEqual(n.dateEnd,   '2026-07-15', 'dateEnd');
      assertEqual(n.timeStart, '21:00',      'timeStart');
      assertEqual(n.timeEnd,   null,         'timeEnd');
    },
  },
  {
    name: 'normalize: full fixture event — venue and location',
    fn: () => {
      const n = normalize(SAMPLE_EVENT);
      assertEqual(n.venue,   'Estádio da Luz', 'venue');
      assertEqual(n.city,    'Lisboa',         'city');
      assertEqual(n.address, 'Av. Eusébio da Silva Ferreira', 'address');
      assertEqual(n.lat,      38.7527,         'lat');
      assertEqual(n.lng,     -9.1846,          'lng');
    },
  },
  {
    name: 'normalize: full fixture event — category music and cost contains EUR',
    fn: () => {
      const n = normalize(SAMPLE_EVENT);
      assertEqual(n.category, 'music', 'category');
      assertContains(n.cost, 'EUR', 'cost contains EUR');
    },
  },
  {
    name: 'normalize: full fixture event — picks widest image',
    fn: () => {
      const n = normalize(SAMPLE_EVENT);
      assertEqual(n.imageUrl, 'https://media.ticketmaster.com/large.jpg', 'widest image');
    },
  },

  // ── normalize — edge cases ──────────────────────────────────────────────────
  {
    name: 'normalize: missing dates returns null',
    fn: () => {
      const noDate = Object.assign({}, SAMPLE_EVENT, { dates: undefined });
      assertEqual(normalize(noDate), null, 'undefined dates');

      const emptyDates = Object.assign({}, SAMPLE_EVENT, { dates: { start: {} } });
      assertEqual(normalize(emptyDates), null, 'empty start dates');
    },
  },
  {
    name: 'normalize: null input returns null',
    fn: () => {
      assertEqual(normalize(null), null, 'null');
      assertEqual(normalize(undefined), null, 'undefined');
    },
  },
  {
    name: 'normalize: missing venue still returns a valid event with lat/lng null',
    fn: () => {
      const noVenue = Object.assign({}, SAMPLE_EVENT, { _embedded: {} });
      const n = normalize(noVenue);
      assertNotNull(n, 'result not null');
      assertEqual(n.venue, '',   'venue empty');
      assertEqual(n.lat,   null, 'lat null');
      assertEqual(n.lng,   null, 'lng null');
    },
  },
  {
    name: 'normalize: missing name returns null',
    fn: () => {
      const noName = Object.assign({}, SAMPLE_EVENT, { name: '' });
      assertEqual(normalize(noName), null, 'empty name');
    },
  },
];
