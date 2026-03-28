'use strict';

const { normalize, parsePosition } = require('../pipeline/sources/culturaptgov');

module.exports = [
  {
    name: 'parsePosition: standard "38,7071,-9,13549"',
    fn() {
      const result = parsePosition('38,7071,-9,13549');
      if (!result) throw new Error('Expected result');
      if (Math.abs(result.lat - 38.7071) > 0.001) throw new Error('Bad lat: ' + result.lat);
      if (Math.abs(result.lng - (-9.13549)) > 0.001) throw new Error('Bad lng: ' + result.lng);
    },
  },
  {
    name: 'parsePosition: positive longitude "41,1579,-8,6291"',
    fn() {
      const result = parsePosition('41,1579,-8,6291');
      if (!result) throw new Error('Expected result');
      if (Math.abs(result.lat - 41.1579) > 0.001) throw new Error('Bad lat');
      if (Math.abs(result.lng - (-8.6291)) > 0.001) throw new Error('Bad lng');
    },
  },
  {
    name: 'parsePosition: null/empty returns null',
    fn() {
      if (parsePosition(null) !== null) throw new Error('Expected null');
      if (parsePosition('') !== null) throw new Error('Expected null');
      if (parsePosition(undefined) !== null) throw new Error('Expected null');
    },
  },
  {
    name: 'normalize: full Portal da Cultura event',
    fn() {
      const raw = {
        Name: 'Mozart: Missa de coroação',
        Type: 'Concertos',
        Theme: 'Música',
        Permanent: false,
        StartDate: '2026-05-16T15:34:15',
        EndDate: '2026-05-16T15:34:18',
        Location: 'Caldas da Rainha',
        Position: '39,4036,-9,1377',
        Where: '<p>Centro Cultural e Congressos</p>',
        Price: '<p>10€</p>',
        Text: '<p>Um concerto de contrastes</p>',
        Url: 'http://culturaportugal.gov.pt/pt/conhecer/eventos/test/',
        ImageUrl: 'http://culturaportugal.gov.pt/media/15711/test.jpg',
        Who: 'Adultos',
        Info: '',
      };
      const event = normalize(raw);
      if (!event) throw new Error('Expected event');
      if (event.source !== 'culturaptgov') throw new Error('Bad source');
      if (event.title !== 'Mozart: Missa de coroação') throw new Error('Bad title');
      if (event.category !== 'music') throw new Error('Bad category: ' + event.category);
      if (event.dateStart !== '2026-05-16') throw new Error('Bad dateStart');
      if (event.city !== 'Caldas da Rainha') throw new Error('Bad city');
      if (event.venue !== 'Centro Cultural e Congressos') throw new Error('Bad venue');
      if (!event.lat || !event.lng) throw new Error('Expected coordinates');
    },
  },
  {
    name: 'normalize: null/missing Name returns null',
    fn() {
      if (normalize(null) !== null) throw new Error('Expected null');
      if (normalize({}) !== null) throw new Error('Expected null');
      if (normalize({ Name: '' }) !== null) throw new Error('Expected null');
    },
  },
  {
    name: 'normalize: missing StartDate returns null',
    fn() {
      const result = normalize({ Name: 'Test', StartDate: null });
      if (result !== null) throw new Error('Expected null');
    },
  },
  {
    name: 'normalize: exhibition category mapping',
    fn() {
      const event = normalize({
        Name: 'Test Exhibition',
        Type: 'Exposições',
        Theme: 'Artes Visuais',
        StartDate: '2026-04-01T10:00:00',
        Location: 'Porto',
        Position: '41,1579,-8,6291',
      });
      if (!event) throw new Error('Expected event');
      if (event.category !== 'exhibitions') throw new Error('Bad category: ' + event.category);
    },
  },
  {
    name: 'normalize: strips HTML from description and venue',
    fn() {
      const event = normalize({
        Name: 'Test',
        StartDate: '2026-04-01T10:00:00',
        Text: '<p><em>Bold text</em> and <a href="#">link</a></p>',
        Where: '<p>Venue Name</p>',
        Location: 'Lisboa',
      });
      if (!event) throw new Error('Expected event');
      if (event.description.includes('<')) throw new Error('HTML not stripped from description');
      if (event.venue.includes('<')) throw new Error('HTML not stripped from venue');
      if (event.venue !== 'Venue Name') throw new Error('Bad venue: ' + event.venue);
    },
  },
  {
    name: 'normalize: "Ver bilheteira" cost is cleared',
    fn() {
      const event = normalize({
        Name: 'Test',
        StartDate: '2026-04-01T10:00:00',
        Price: '<p>Ver bilheteira</p>',
        Location: 'Lisboa',
      });
      if (!event) throw new Error('Expected event');
      if (event.cost !== '') throw new Error('Expected empty cost, got: ' + event.cost);
    },
  },
];
