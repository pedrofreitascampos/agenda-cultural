'use strict';

const {
  parsePtDateRange,
  parseSinglePtDate,
  parsePtTimeRange,
  parseSingleTime,
  stripHtml,
  similarity,
  formatDate,
} = require('../pipeline/normalize');

const { normalize, parsePrice } = require('../pipeline/sources/agendalx');

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

function assertDeepEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    const err = new Error(`${label}: mismatch`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

module.exports = [
  // ─── Portuguese Date Parsing ─────────────────────────────

  {
    name: 'parsePtDateRange: single date "28 março 2026"',
    fn: () => {
      const r = parsePtDateRange('28 março 2026');
      assertDeepEqual(r, { dateStart: '2026-03-28', dateEnd: '2026-03-28' }, 'single date');
    },
  },
  {
    name: 'parsePtDateRange: range "28 de março a 5 de abril de 2026"',
    fn: () => {
      const r = parsePtDateRange('28 de março a 5 de abril de 2026');
      assertEqual(r.dateStart, '2026-03-28', 'start');
      assertEqual(r.dateEnd, '2026-04-05', 'end');
    },
  },
  {
    name: 'parsePtDateRange: abbreviated "13 fev - 19 abr 2026"',
    fn: () => {
      const r = parsePtDateRange('13 fev - 19 abr 2026');
      assertEqual(r.dateStart, '2026-02-13', 'start');
      assertEqual(r.dateEnd, '2026-04-19', 'end');
    },
  },
  {
    name: 'parsePtDateRange: ISO passthrough "2026-03-28"',
    fn: () => {
      const r = parsePtDateRange('2026-03-28');
      assertDeepEqual(r, { dateStart: '2026-03-28', dateEnd: '2026-03-28' }, 'iso');
    },
  },
  {
    name: 'parsePtDateRange: DD/MM/YYYY "28/03/2026"',
    fn: () => {
      const r = parsePtDateRange('28/03/2026');
      assertDeepEqual(r, { dateStart: '2026-03-28', dateEnd: '2026-03-28' }, 'slash');
    },
  },
  {
    name: 'parsePtDateRange: null/empty returns null',
    fn: () => {
      assert(parsePtDateRange(null) === null, 'null');
      assert(parsePtDateRange('') === null, 'empty');
      assert(parsePtDateRange('   ') === null, 'whitespace');
    },
  },
  {
    name: 'parsePtDateRange: range with fallback year',
    fn: () => {
      const r = parsePtDateRange('28 março - 5 abril', 2026);
      assertEqual(r.dateStart, '2026-03-28', 'start');
      assertEqual(r.dateEnd, '2026-04-05', 'end');
    },
  },
  {
    name: 'parseSinglePtDate: "28 março 2026"',
    fn: () => {
      assertEqual(parseSinglePtDate('28 março 2026'), '2026-03-28', 'single');
    },
  },
  {
    name: 'parseSinglePtDate: "5 abr" with fallback year',
    fn: () => {
      assertEqual(parseSinglePtDate('5 abr', 2026), '2026-04-05', 'abbrev');
    },
  },
  {
    name: 'formatDate: pads month and day',
    fn: () => {
      assertEqual(formatDate(2026, 3, 5), '2026-03-05', 'padded');
      assertEqual(formatDate(2026, 12, 25), '2026-12-25', 'no pad');
    },
  },

  // ─── Portuguese Time Parsing ─────────────────────────────

  {
    name: 'parsePtTimeRange: "21h00 - 23h00"',
    fn: () => {
      const r = parsePtTimeRange('21h00 - 23h00');
      assertEqual(r.timeStart, '21:00', 'start');
      assertEqual(r.timeEnd, '23:00', 'end');
    },
  },
  {
    name: 'parsePtTimeRange: "21h" single time',
    fn: () => {
      const r = parsePtTimeRange('21h');
      assertEqual(r.timeStart, '21:00', 'start');
      assertEqual(r.timeEnd, null, 'end');
    },
  },
  {
    name: 'parsePtTimeRange: "das 10h00 às 18h00"',
    fn: () => {
      const r = parsePtTimeRange('das 10h00 às 18h00');
      assertEqual(r.timeStart, '10:00', 'start');
      assertEqual(r.timeEnd, '18:00', 'end');
    },
  },
  {
    name: 'parsePtTimeRange: "21:30" colon format',
    fn: () => {
      const r = parsePtTimeRange('21:30');
      assertEqual(r.timeStart, '21:30', 'start');
    },
  },
  {
    name: 'parsePtTimeRange: null/empty returns nulls',
    fn: () => {
      const r = parsePtTimeRange(null);
      assertEqual(r.timeStart, null, 'null start');
      assertEqual(r.timeEnd, null, 'null end');
    },
  },
  {
    name: 'parseSingleTime: edge cases',
    fn: () => {
      assertEqual(parseSingleTime('0h00'), '00:00', 'midnight');
      assertEqual(parseSingleTime('9h30'), '09:30', 'morning');
      assertEqual(parseSingleTime('invalid'), null, 'invalid');
      assertEqual(parseSingleTime(''), null, 'empty');
    },
  },

  // ─── HTML Stripping ──────────────────────────────────────

  {
    name: 'stripHtml: removes tags and decodes entities',
    fn: () => {
      assertEqual(stripHtml('<p>Hello <b>world</b></p>'), 'Hello world', 'tags');
      assertEqual(stripHtml('a &amp; b'), 'a & b', 'amp');
      assertEqual(stripHtml('a &lt; b &gt; c'), 'a < b > c', 'ltgt');
      assertEqual(stripHtml('line<br/>break'), 'line break', 'br');
    },
  },
  {
    name: 'stripHtml: truncates to maxLen with ellipsis',
    fn: () => {
      const result = stripHtml('This is a long description that should be truncated', 20);
      assert(result.length <= 20, `length ${result.length} > 20`);
      assert(result.endsWith('\u2026'), 'should end with ellipsis');
    },
  },
  {
    name: 'stripHtml: null/empty returns empty string',
    fn: () => {
      assertEqual(stripHtml(null), '', 'null');
      assertEqual(stripHtml(''), '', 'empty');
    },
  },

  // ─── Similarity ──────────────────────────────────────────

  {
    name: 'similarity: identical strings = 1',
    fn: () => {
      assertEqual(similarity('hello', 'hello'), 1, 'identical');
    },
  },
  {
    name: 'similarity: completely different < 0.3',
    fn: () => {
      assert(similarity('abc', 'xyz') < 0.3, 'different');
    },
  },
  {
    name: 'similarity: similar strings > 0.6',
    fn: () => {
      assert(similarity('Concerto de Fado', 'Concerto do Fado') > 0.6, 'similar');
    },
  },
  {
    name: 'similarity: null returns 0',
    fn: () => {
      assertEqual(similarity(null, 'test'), 0, 'null a');
      assertEqual(similarity('test', null), 0, 'null b');
    },
  },

  // ─── AgendaLx Price Parsing ──────────────────────────────

  {
    name: 'parsePrice: PHP serialized with value and description',
    fn: () => {
      const result = parsePrice(
        ['value'],
        ['a:1:{i:0;a:2:{s:5:"value";s:1:"4";s:11:"description";s:29:"Visitas incluídas no bilhete";}}']
      );
      assertEqual(result, '4\u20AC (Visitas incluídas no bilhete)', 'price');
    },
  },
  {
    name: 'parsePrice: PHP serialized with value only',
    fn: () => {
      const result = parsePrice(['value'], ['a:1:{i:0;a:1:{s:5:"value";s:1:"4";}}']);
      assertEqual(result, '4\u20AC', 'value only');
    },
  },
  {
    name: 'parsePrice: free category',
    fn: () => {
      assertEqual(parsePrice(['free'], ''), 'Gratuito', 'free cat');
      assertEqual(parsePrice(['gratuito'], ''), 'Gratuito', 'gratuito cat');
    },
  },
  {
    name: 'parsePrice: unknown/empty returns empty',
    fn: () => {
      assertEqual(parsePrice(['unknown'], ''), '', 'unknown');
      assertEqual(parsePrice(null, null), '', 'null');
    },
  },

  // ─── AgendaLx Normalize ──────────────────────────────────

  {
    name: 'normalize: full AgendaLx event',
    fn: () => {
      const raw = {
        id: 174735,
        title: { rendered: 'Concerto de Fado' },
        featured_media_large: 'https://example.com/img.jpg',
        subtitle: '',
        subject: 'musica',
        string_dates: '28 março 2026',
        string_times: '21h00 - 23h00',
        description: ['Uma noite de fado tradicional.'],
        venue: { 'casa-fado': { id: 1, slug: 'casa-fado', name: 'Casa do Fado' } },
        categories_name_list: { musica: { id: 10, slug: 'musica', name: 'musica' } },
        tags_name_list: {},
        link: 'https://www.agendalx.pt/events/event/concerto-fado/',
        occurences: ['2026-03-28'],
        StartDate: '2026-03-28',
        LastDate: '2026-03-28',
        price_cat: ['value'],
        price_val: ['a:1:{i:0;a:1:{s:5:"value";s:2:"10";}}'],
      };

      const event = normalize(raw);
      assertEqual(event.id, 'agendalx-174735', 'id');
      assertEqual(event.source, 'agendalx', 'source');
      assertEqual(event.title, 'Concerto de Fado', 'title');
      assertEqual(event.category, 'music', 'category');
      assertEqual(event.venue, 'Casa do Fado', 'venue');
      assertEqual(event.city, 'Lisboa', 'city');
      assertEqual(event.dateStart, '2026-03-28', 'dateStart');
      assertEqual(event.dateEnd, '2026-03-28', 'dateEnd');
      assertEqual(event.timeStart, '21:00', 'timeStart');
      assertEqual(event.timeEnd, '23:00', 'timeEnd');
      assertEqual(event.isRecurring, false, 'not recurring');
      assertEqual(event.cost, '10\u20AC', 'cost');
      assertEqual(event.imageUrl, 'https://example.com/img.jpg', 'image');
      assertEqual(event.sourceUrl, 'https://www.agendalx.pt/events/event/concerto-fado/', 'sourceUrl');
    },
  },
  {
    name: 'normalize: recurring event (many occurences)',
    fn: () => {
      const dates = [];
      for (let i = 1; i <= 30; i++) {
        dates.push(`2026-03-${String(i).padStart(2, '0')}`);
      }

      const raw = {
        id: 999,
        title: { rendered: 'Exposição Permanente' },
        featured_media_large: '',
        subtitle: ['Arte Moderna'],
        string_dates: '1 a 30 março 2026',
        string_times: 'das 10h00 às 18h00',
        description: ['Uma exposição de arte moderna.'],
        venue: { 'museu-x': { id: 2, slug: 'museu-x', name: 'Museu X' } },
        categories_name_list: { artes: { id: 1, slug: 'artes', name: 'artes' } },
        tags_name_list: { gratuito: { id: 27, slug: 'gratuito', name: 'gratuito' } },
        link: 'https://www.agendalx.pt/events/event/expo/',
        occurences: dates,
        StartDate: '2026-03-01',
        LastDate: '2026-03-30',
        price_cat: ['unknown'],
        price_val: '',
      };

      const event = normalize(raw);
      assertEqual(event.isRecurring, true, 'recurring');
      assert(event.recurrenceNote.length > 0, 'has recurrence note');
      assertEqual(event.category, 'exhibitions', 'artes → exhibitions');
      assertEqual(event.cost, 'Gratuito', 'free from tag');
      assert(event.description.includes('Arte Moderna'), 'subtitle in description');
    },
  },
  {
    name: 'normalize: null/missing fields returns null',
    fn: () => {
      assertEqual(normalize(null), null, 'null');
      assertEqual(normalize({}), null, 'empty');
      assertEqual(normalize({ id: 1 }), null, 'no title');
    },
  },
  {
    name: 'normalize: unknown category maps to other',
    fn: () => {
      const raw = {
        id: 123,
        title: { rendered: 'Test' },
        categories_name_list: { 'unknown-cat': { id: 99, slug: 'unknown-cat', name: 'unknown' } },
        occurences: ['2026-03-28'],
        StartDate: '2026-03-28',
        LastDate: '2026-03-28',
        venue: {},
        description: [],
        tags_name_list: {},
        link: '',
        price_cat: [],
        price_val: '',
      };
      const event = normalize(raw);
      assertEqual(event.category, 'other', 'unknown → other');
    },
  },
];
