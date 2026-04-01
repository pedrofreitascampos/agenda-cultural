'use strict';

const { normalize } = require('../pipeline/sources/ccb');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

module.exports = [
  {
    name: 'normalize: full CCB Tribe event',
    fn: () => {
      const result = normalize({
        id: 256599,
        title: 'Programa Missão Democracia',
        description: '<p>Uma missão especial para cidadãos.</p>',
        start_date: '2026-04-01 20:00:00',
        end_date: '2026-04-01 22:00:00',
        all_day: false,
        url: 'https://www.ccb.pt/evento/programa-missao-democracia/',
        venue: { venue: 'Centro Cultural de Belém', city: 'Lisboa', address: 'Praça do Império' },
        categories: [{ name: 'Espetáculos' }],
        cost: '10€',
        image: { url: 'https://www.ccb.pt/img/test.png' },
      });
      assertEqual(result.id, 'ccb-256599', 'id');
      assertEqual(result.source, 'ccb', 'source');
      assertEqual(result.title, 'Programa Missão Democracia', 'title');
      assertEqual(result.dateStart, '2026-04-01', 'dateStart');
      assertEqual(result.timeStart, '20:00', 'timeStart');
      assertEqual(result.timeEnd, '22:00', 'timeEnd');
      assertEqual(result.category, 'theatre', 'category mapped from Espetáculos');
      assertEqual(result.venue, 'Centro Cultural de Belém', 'venue');
      assertEqual(result.cost, '10€', 'cost');
      assertEqual(result.lat, 38.6936, 'lat');
    },
  },
  {
    name: 'normalize: all-day event has no times',
    fn: () => {
      const result = normalize({
        id: 100,
        title: 'Exposição',
        start_date: '2026-04-01 00:00:00',
        end_date: '2026-04-30 00:00:00',
        all_day: true,
        url: '',
        categories: [{ name: 'Exposições' }],
      });
      assertEqual(result.timeStart, null, 'no timeStart');
      assertEqual(result.timeEnd, null, 'no timeEnd');
      assertEqual(result.category, 'exhibitions', 'exhibitions category');
    },
  },
  {
    name: 'normalize: null/missing title returns null',
    fn: () => {
      assertEqual(normalize(null), null, 'null');
      assertEqual(normalize({ id: 1 }), null, 'no title');
      assertEqual(normalize({ id: 1, title: '' }), null, 'empty title');
    },
  },
  {
    name: 'normalize: missing start_date returns null',
    fn: () => {
      assertEqual(normalize({ id: 1, title: 'Test' }), null, 'no date');
    },
  },
];
