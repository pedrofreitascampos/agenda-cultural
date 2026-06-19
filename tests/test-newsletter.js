'use strict';

const { normalize, _safeUrl, _slugify } = require('../pipeline/sources/newsletter');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const SAMPLE = {
  title: 'Concerto de Verão na Fábrica',
  dateStart: '2026-06-21',
  dateEnd: '2026-06-21',
  venue: 'Fábrica Braço de Prata',
  city: 'Lisboa',
  category: 'music',
  sourceUrl: 'https://bracodeprata.com/evento/concerto-verao',
  imageUrl: 'https://bracodeprata.com/img/concerto.jpg',
  cost: 'Grátis',
  description: 'Um concerto especial ao ar livre.',
  newsletter: 'Lisboa Secreta',
};

module.exports = [
  {
    name: 'safeUrl: allows http(s), rejects javascript/data/empty',
    fn: () => {
      assertEqual(_safeUrl('https://example.pt/x'), 'https://example.pt/x', 'https');
      assertEqual(_safeUrl('http://example.pt/x'), 'http://example.pt/x', 'http');
      assertEqual(_safeUrl('javascript:alert(1)'), '', 'javascript scheme blocked');
      assertEqual(_safeUrl('data:text/html,x'), '', 'data scheme blocked');
      assertEqual(_safeUrl(''), '', 'empty');
      assertEqual(_safeUrl(null), '', 'null');
    },
  },
  {
    name: 'slugify: accents stripped, lowercased, hyphenated',
    fn: () => {
      assertEqual(_slugify('Fábrica Braço de Prata'), 'fabrica-braco-de-prata', 'accents');
      assertEqual(_slugify('Lisboa Secreta'), 'lisboa-secreta', 'spaces');
    },
  },
  {
    name: 'normalize: full curated event maps to common schema',
    fn: () => {
      const n = normalize(SAMPLE);
      assertEqual(n.source, 'newsletter', 'source');
      assertEqual(n.title, 'Concerto de Verão na Fábrica', 'title');
      assertEqual(n.category, 'music', 'category');
      assertEqual(n.dateStart, '2026-06-21', 'dateStart');
      assertEqual(n.venue, 'Fábrica Braço de Prata', 'venue');
      assertEqual(n.city, 'Lisboa', 'city');
      assertEqual(n.cost, 'Grátis', 'cost');
      assertEqual(n.id, 'newsletter-concerto-de-verao-na-fabrica-2026-06-21', 'id');
      assertEqual(n.tags.includes('curado'), true, 'curado tag');
      assertEqual(n.tags.includes('lisboa-secreta'), true, 'provenance tag');
      assertEqual(n.lat, null, 'lat null (geocoder fills)');
    },
  },
  {
    name: 'normalize: invalid category falls back to other',
    fn: () => {
      const n = normalize({ ...SAMPLE, category: 'not-a-category' });
      assertEqual(n.category, 'other', 'category fallback');
    },
  },
  {
    name: 'normalize: javascript: sourceUrl is stripped',
    fn: () => {
      const n = normalize({ ...SAMPLE, sourceUrl: 'javascript:alert(1)' });
      assertEqual(n.sourceUrl, '', 'unsafe url stripped');
    },
  },
  {
    name: 'normalize: missing/invalid date returns null',
    fn: () => {
      assertEqual(normalize({ ...SAMPLE, dateStart: undefined }), null, 'no date');
      assertEqual(normalize({ ...SAMPLE, dateStart: '21 June 2026' }), null, 'non-ISO date');
      assertEqual(normalize({ title: '', dateStart: '2026-06-21' }), null, 'no title');
      assertEqual(normalize(null), null, 'null');
    },
  },
  {
    name: 'normalize: dateEnd defaults to dateStart when missing',
    fn: () => {
      const n = normalize({ ...SAMPLE, dateEnd: undefined });
      assertEqual(n.dateEnd, '2026-06-21', 'dateEnd default');
    },
  },
];
