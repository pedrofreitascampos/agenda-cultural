'use strict';

const { normalize, _extractEvents, _readJsonObject, _mapCategory } = require('../pipeline/sources/porto');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

const SAMPLE_RAW = {
  __typename: 'Event',
  id: '12345',
  url: '/pt/evento/sample-event/',
  fullUrl: 'https://www.porto.pt/pt/evento/sample-event/',
  title: 'Concerto na Casa da Música',
  searchDescription: '',
  categoryPage: { __typename: 'EventsCategoryIndex', id: '50', title: 'Cultura' },
  thumbnail: {
    medium: { url: 'https://www.porto.pt/_next/image?url=test.jpg&w=730' },
  },
  description: 'Um concerto especial.',
  dates: [{ start: '2026-06-15 21:00:00', end: '2026-06-15 23:00:00' }],
  locations: [{
    location: {
      __typename: 'Location',
      locality: 'Casa da Música',
      address: 'Avenida da Boavista 604',
      latitude: 41.158,
      longitude: -8.631,
    },
  }],
};

module.exports = [
  {
    name: 'mapCategory: maps Música -> music, Cultura -> other',
    fn: () => {
      assertEqual(_mapCategory('Música'), 'music', 'music');
      assertEqual(_mapCategory('Cultura'), 'other', 'cultura');
      assertEqual(_mapCategory('Festival'), 'festivals', 'festivals');
      assertEqual(_mapCategory(''), 'other', 'empty');
    },
  },
  {
    name: '_readJsonObject: extracts balanced JSON object',
    fn: () => {
      const text = 'prefix{"a":1,"b":{"c":2}}suffix';
      const obj = _readJsonObject(text, 6);
      assertEqual(obj, '{"a":1,"b":{"c":2}}', 'balanced object');
    },
  },
  {
    name: '_readJsonObject: respects strings with braces',
    fn: () => {
      const text = '{"a":"}{"}';
      const obj = _readJsonObject(text, 0);
      assertEqual(obj, '{"a":"}{"}', 'brace inside string ignored');
    },
  },
  {
    name: '_readJsonObject: returns null for unbalanced',
    fn: () => {
      assertEqual(_readJsonObject('{"a":1', 0), null, 'unbalanced');
      assertEqual(_readJsonObject('not json', 0), null, 'not an object');
    },
  },
  {
    name: '_extractEvents: parses RSC payload with one event',
    fn: () => {
      const eventJson = JSON.stringify(SAMPLE_RAW);
      // RSC payload string is JSON-escaped (so " becomes \")
      const escaped = eventJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const html = `<script>self.__next_f.push([1,"${escaped}"])</script>`;
      const events = _extractEvents(html);
      assertEqual(events.length, 1, 'one event extracted');
      assertEqual(events[0].title, 'Concerto na Casa da Música', 'title');
    },
  },
  {
    name: '_extractEvents: deduplicates by id across chunks',
    fn: () => {
      const eventJson = JSON.stringify(SAMPLE_RAW);
      const escaped = eventJson.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const html = `
        <script>self.__next_f.push([1,"${escaped}"])</script>
        <script>self.__next_f.push([1,"${escaped}"])</script>
      `;
      const events = _extractEvents(html);
      assertEqual(events.length, 1, 'duplicate deduped');
    },
  },
  {
    name: '_extractEvents: empty HTML returns empty array',
    fn: () => {
      assertEqual(_extractEvents('').length, 0, 'empty');
      assertEqual(_extractEvents('<html><body>No data</body></html>').length, 0, 'no rsc');
    },
  },
  {
    name: 'normalize: full event with location and times',
    fn: () => {
      const n = normalize(SAMPLE_RAW);
      assertEqual(n.source, 'porto', 'source');
      assertEqual(n.title, 'Concerto na Casa da Música', 'title');
      assertEqual(n.dateStart, '2026-06-15', 'dateStart');
      assertEqual(n.timeStart, '21:00', 'timeStart');
      assertEqual(n.timeEnd, '23:00', 'timeEnd');
      assertEqual(n.venue, 'Casa da Música', 'venue');
      assertEqual(n.lat, 41.158, 'lat');
      assertEqual(n.lng, -8.631, 'lng');
      assertEqual(n.city, 'Porto', 'city');
      assertEqual(n.imageUrl, 'https://www.porto.pt/_next/image?url=test.jpg&w=730', 'image');
      assertEqual(n.id, 'porto-12345-2026-06-15', 'id uses raw id');
    },
  },
  {
    name: 'normalize: missing dates returns null',
    fn: () => {
      assertEqual(normalize({ title: 'X', id: '1', dates: [] }), null, 'no dates');
      assertEqual(normalize({ title: 'X', id: '1' }), null, 'undefined dates');
      assertEqual(normalize(null), null, 'null');
    },
  },
];
