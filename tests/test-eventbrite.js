'use strict';

const { normalize, extractEventsFromHtml } = require('../pipeline/sources/eventbrite');

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
    name: 'normalize: full Eventbrite JSON-LD event',
    fn: () => {
      const result = normalize({
        '@type': 'Event',
        name: 'Tech Meetup Lisbon',
        startDate: '2026-04-15T19:00:00',
        endDate: '2026-04-15T22:00:00',
        description: 'A meetup for tech enthusiasts.',
        url: 'https://www.eventbrite.pt/e/tech-meetup-lisbon-tickets-123456',
        image: 'https://img.evbuc.com/test.jpg',
        location: {
          '@type': 'Place',
          name: 'Hub Criativo do Beato',
          address: {
            streetAddress: 'Rua do Beato 1',
            addressLocality: 'Lisboa',
            postalCode: '1900-001',
          },
          geo: { latitude: '38.7350', longitude: '-9.1050' },
        },
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      });
      assertEqual(result.id, 'eventbrite-tech-meetup-lisbon-tickets-123456', 'id');
      assertEqual(result.source, 'eventbrite', 'source');
      assertEqual(result.dateStart, '2026-04-15', 'dateStart');
      assertEqual(result.timeStart, '19:00', 'timeStart');
      assertEqual(result.timeEnd, '22:00', 'timeEnd');
      assertEqual(result.venue, 'Hub Criativo do Beato', 'venue');
      assertEqual(result.city, 'Lisboa', 'city');
      assertEqual(result.lat, 38.735, 'lat');
    },
  },
  {
    name: 'normalize: online-only event without venue returns null',
    fn: () => {
      const result = normalize({
        '@type': 'Event',
        name: 'Online Workshop',
        startDate: '2026-04-15',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
      });
      assertEqual(result, null, 'online-only skipped');
    },
  },
  {
    name: 'normalize: null/missing name returns null',
    fn: () => {
      assertEqual(normalize(null), null, 'null');
      assertEqual(normalize({ '@type': 'Event' }), null, 'no name');
    },
  },
  {
    name: 'extractEventsFromHtml: extracts from ListItem wrapping',
    fn: () => {
      const html = `<script type="application/ld+json">[
        {"@type":"ItemList","itemListElement":[
          {"@type":"ListItem","position":1,"item":{
            "@type":"Event","name":"Test Event","startDate":"2026-04-01"
          }}
        ]}
      ]</script>`;
      const events = extractEventsFromHtml(html);
      assertEqual(events.length, 1, 'found 1 event');
      assertEqual(events[0].name, 'Test Event', 'event name');
    },
  },
  {
    name: 'extractEventsFromHtml: empty HTML returns empty array',
    fn: () => {
      assertEqual(extractEventsFromHtml('').length, 0, 'no events');
      assertEqual(extractEventsFromHtml('<html></html>').length, 0, 'no events in html');
    },
  },
];
