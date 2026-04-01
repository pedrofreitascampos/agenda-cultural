'use strict';

const { normalize, parseEventDate, parseLocation } = require('../pipeline/sources/aondevamos');

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
    name: 'parseEventDate: standard JSON string',
    fn: () => {
      const result = parseEventDate('[{"start":"2026-03-01 00:00:00","end":"2026-03-31 23:59:59","multiday":true,"allday":true}]');
      assertEqual(result.start, '2026-03-01 00:00:00', 'start');
      assertEqual(result.end, '2026-03-31 23:59:59', 'end');
      assertEqual(result.allday, true, 'allday');
    },
  },
  {
    name: 'parseEventDate: null/empty returns null',
    fn: () => {
      assertEqual(parseEventDate(null), null, 'null');
      assertEqual(parseEventDate(''), null, 'empty');
      assertEqual(parseEventDate('[]'), null, 'empty array');
    },
  },
  {
    name: 'parseLocation: standard JSON string',
    fn: () => {
      const result = parseLocation('{"address":"Portimão, Faro, Portugal","latitude":37.1366,"longitude":-8.5392}');
      assertEqual(result.latitude, 37.1366, 'lat');
      assertEqual(result.longitude, -8.5392, 'lng');
      assertEqual(result.address, 'Portimão, Faro, Portugal', 'address');
    },
  },
  {
    name: 'parseLocation: null returns null',
    fn: () => {
      assertEqual(parseLocation(null), null, 'null');
    },
  },
  {
    name: 'normalize: full aondevamos event',
    fn: () => {
      const result = normalize({
        id: 25533,
        title: 'Março Jovem 2026 - Portimão',
        slug: 'marco-jovem',
        permalink: 'https://aondevamos.pt/marco-jovem-2026-portimao/',
        content: '<p>Festival de jovens</p>',
        cover_url: 'https://aondevamos.pt/img/test.jpg',
        event_date: '[{"start":"2026-03-01 00:00:00","end":"2026-03-31 23:59:59","multiday":true,"allday":true}]',
        location: '{"address":"Portimão, Faro, Portugal","latitude":37.1366,"longitude":-8.5392}',
        preco: ['Gratuito'],
        tipos_evento: ['Festas e Festivais'],
        concelho: ['Portimão'],
        distrito: ['Distrito de Faro'],
      });
      assertEqual(result.id, 'aondevamos-25533', 'id');
      assertEqual(result.source, 'aondevamos', 'source');
      assertEqual(result.dateStart, '2026-03-01', 'dateStart');
      assertEqual(result.dateEnd, '2026-03-31', 'dateEnd');
      assertEqual(result.timeStart, null, 'no time for allday');
      assertEqual(result.lat, 37.1366, 'lat');
      assertEqual(result.lng, -8.5392, 'lng');
      assertEqual(result.category, 'festivals', 'category');
      assertEqual(result.cost, 'Gratuito', 'cost');
      assertEqual(result.city, 'Portimão', 'city from concelho');
    },
  },
  {
    name: 'normalize: missing title returns null',
    fn: () => {
      assertEqual(normalize(null), null, 'null');
      assertEqual(normalize({ id: 1 }), null, 'no title');
    },
  },
  {
    name: 'normalize: missing event_date returns null',
    fn: () => {
      assertEqual(normalize({ id: 1, title: 'Test' }), null, 'no date');
    },
  },
  {
    name: 'normalize: timed event has timeStart',
    fn: () => {
      const result = normalize({
        id: 100,
        title: 'Concerto',
        event_date: '[{"start":"2026-04-15 21:00:00","end":"2026-04-15 23:30:00","multiday":false,"allday":false}]',
        location: '{"address":"Lisboa, Portugal","latitude":38.72,"longitude":-9.14}',
        tipos_evento: ['Concertos'],
        preco: ['Pago'],
      });
      assertEqual(result.timeStart, '21:00', 'timeStart');
      assertEqual(result.timeEnd, '23:30', 'timeEnd');
      assertEqual(result.category, 'music', 'concertos → music');
    },
  },
];
