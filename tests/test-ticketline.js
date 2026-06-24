'use strict';

const {
  normalize,
  _extractEvents,
  _mapCategory,
} = require('../pipeline/sources/ticketline');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual   = actual;
    throw err;
  }
}

function assertNotNull(actual, label) {
  if (actual == null) {
    throw new Error(`${label}: expected non-null, got ${JSON.stringify(actual)}`);
  }
}

// ─── Fixtures ────────────────────────────────────────────────

// Two-event listing page. Event 1: Ecoteca (has_multiple_sessions, Museus & Exposições).
// Event 2: Fado concert (no multi-session flag, Música).
const SAMPLE_HTML = `<html><body>
<ul class="list events_list">
<li class="has_multiple_sessions " itemscope itemtype="http://schema.org/Event">
  <a href="/evento/ecoteca-de-mirandela-2026centro-interpr-ter-100610" itemprop="url">
    <div class="date" data-date="2026-06-19" itemprop="startDate" content="2026-06-19">
      <p class="month">jun</p><p class="day">19<span>+</span></p><p class="weekday">sex</p>
    </div>
    <div class="thumb">
      <img src="/static/img/blank.png" data-src-original="https://info.ticketline.pt/images/Espectaculos/100610/cartaz.jpg?rev=20260612144931" alt="" itemprop="image" />
    </div>
    <div class="details">
      <p class="metadata categories">Museus &amp; Exposições</p>
      <p class="title" itemprop="name">ECOTECA DE MIRANDELA CENTRO INTERPR.TERRITÓRIO2026</p>
      <p class="venues" itemprop="location">Ecoteca De Mirandela - Centro Interpretativo Do Território</p>
    </div>
  </a>
</li>
<li class="" itemscope itemtype="http://schema.org/Event">
  <a href="/evento/concerto-de-fado-em-lisboa-200001" itemprop="url">
    <div class="date" data-date="2026-07-15" itemprop="startDate" content="2026-07-15">
      <p class="month">jul</p><p class="day">15</p><p class="weekday">qua</p>
    </div>
    <div class="thumb">
      <img src="/static/img/blank.png" data-src-original="https://info.ticketline.pt/images/Espectaculos/200001/cartaz.jpg" alt="" itemprop="image" />
    </div>
    <div class="details">
      <p class="metadata categories">Música</p>
      <p class="title" itemprop="name">CONCERTO DE FADO EM LISBOA</p>
      <p class="venues" itemprop="location">Coliseu de Lisboa</p>
    </div>
  </a>
</li>
</ul>
</body></html>`;

// Raw object matching what extractEvents returns for the Ecoteca event.
const RAW_ECOTECA = {
  id:            '100610',
  title:         'ECOTECA DE MIRANDELA CENTRO INTERPR.TERRITÓRIO2026',
  sourceUrl:     'https://www.ticketline.pt/evento/ecoteca-de-mirandela-2026centro-interpr-ter-100610',
  imageUrl:      'https://info.ticketline.pt/images/Espectaculos/100610/cartaz.jpg?rev=20260612144931',
  dateStart:     '2026-06-19',
  venue:         'Ecoteca De Mirandela - Centro Interpretativo Do Território',
  categoryLabel: 'Museus & Exposições',
  isRecurring:   true,
};

// ─── Tests ───────────────────────────────────────────────────

module.exports = [

  // ── _extractEvents ──────────────────────────────────────────

  {
    name: '_extractEvents: parses 2 event blocks from sample HTML',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      assertEqual(events.length, 2, 'event count');
    },
  },
  {
    name: '_extractEvents: Ecoteca block — id, dateStart, title, venue, sourceUrl, categoryLabel',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      const e = events[0];
      assertEqual(e.id,            '100610',                                                                          'id');
      assertEqual(e.dateStart,     '2026-06-19',                                                                      'dateStart');
      assertEqual(e.title,         'ECOTECA DE MIRANDELA CENTRO INTERPR.TERRITÓRIO2026',                              'title');
      assertEqual(e.venue,         'Ecoteca De Mirandela - Centro Interpretativo Do Território',                      'venue');
      assertEqual(e.sourceUrl,     'https://www.ticketline.pt/evento/ecoteca-de-mirandela-2026centro-interpr-ter-100610', 'sourceUrl');
      assertEqual(e.categoryLabel, 'Museus & Exposições',                                                             'categoryLabel');
    },
  },
  {
    name: '_extractEvents: Ecoteca block — isRecurring true (has_multiple_sessions)',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      assertEqual(events[0].isRecurring, true, 'isRecurring (ecoteca)');
    },
  },
  {
    name: '_extractEvents: Fado block — isRecurring false (no multi-session flag)',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      assertEqual(events[1].isRecurring, false, 'isRecurring (fado)');
    },
  },
  {
    name: '_extractEvents: Fado block — id, dateStart, title, venue, categoryLabel',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      const e = events[1];
      assertEqual(e.id,            '200001',                                                           'id');
      assertEqual(e.dateStart,     '2026-07-15',                                                       'dateStart');
      assertEqual(e.title,         'CONCERTO DE FADO EM LISBOA',                                       'title');
      assertEqual(e.venue,         'Coliseu de Lisboa',                                                'venue');
      assertEqual(e.categoryLabel, 'Música',                                                           'categoryLabel');
    },
  },
  {
    name: '_extractEvents: empty / no-events HTML returns empty array',
    fn: () => {
      assertEqual(_extractEvents('').length,                               0, 'empty string');
      assertEqual(_extractEvents('<html><body>nothing</body></html>').length, 0, 'no events');
    },
  },

  // ── _mapCategory ────────────────────────────────────────────

  {
    name: '_mapCategory: "Música" → music',
    fn: () => {
      assertEqual(_mapCategory('Música'), 'music', 'Música');
    },
  },
  {
    name: '_mapCategory: "Teatro Imersivo" → theatre',
    fn: () => {
      assertEqual(_mapCategory('Teatro Imersivo'), 'theatre', 'teatro imersivo');
    },
  },
  {
    name: '_mapCategory: "Museus & Exposições" → exhibitions',
    fn: () => {
      assertEqual(_mapCategory('Museus & Exposições'), 'exhibitions', 'museus & exposições');
    },
  },
  {
    name: '_mapCategory: "Festival" → festivals',
    fn: () => {
      assertEqual(_mapCategory('Festival'), 'festivals', 'festival');
    },
  },
  {
    name: '_mapCategory: "Stand Up Comedy" → other',
    fn: () => {
      assertEqual(_mapCategory('Stand Up Comedy'), 'other', 'stand up comedy');
    },
  },
  {
    name: '_mapCategory: unknown label → other',
    fn: () => {
      assertEqual(_mapCategory('Alguma Coisa Estranha'), 'other', 'unknown');
      assertEqual(_mapCategory(''),                       'other', 'empty string');
    },
  },

  // ── normalize ───────────────────────────────────────────────

  {
    name: 'normalize: full Ecoteca raw → correct common-schema fields',
    fn: () => {
      const n = normalize(RAW_ECOTECA);
      assertNotNull(n, 'result');
      assertEqual(n.source,         'ticketline',                                                                          'source');
      assertEqual(n.id,             'ticketline-100610',                                                                   'id');
      assertEqual(n.dateStart,      '2026-06-19',                                                                          'dateStart');
      assertEqual(n.dateEnd,        '2026-06-19',                                                                          'dateEnd');
      assertEqual(n.category,       'exhibitions',                                                                         'category');
      assertEqual(n.venue,          'Ecoteca De Mirandela - Centro Interpretativo Do Território',                          'venue');
      assertEqual(n.lat,            null,                                                                                  'lat');
      assertEqual(n.lng,            null,                                                                                  'lng');
      assertEqual(n.city,           '',                                                                                    'city');
      assertEqual(n.address,        '',                                                                                    'address');
      assertEqual(n.isRecurring,    true,                                                                                  'isRecurring');
      assertEqual(n.recurrenceNote, 'Várias sessões',                                                                      'recurrenceNote');
      assertEqual(n.description,    '',                                                                                    'description');
      assertEqual(n.cost,           '',                                                                                    'cost');
      assertEqual(n.timeStart,      null,                                                                                  'timeStart');
      assertEqual(n.timeEnd,        null,                                                                                  'timeEnd');
    },
  },
  {
    name: 'normalize: missing dateStart → null',
    fn: () => {
      assertEqual(normalize({ ...RAW_ECOTECA, dateStart: '' }),    null, 'empty dateStart');
      assertEqual(normalize({ ...RAW_ECOTECA, dateStart: 'lixo' }), null, 'bad dateStart');
      assertEqual(normalize({ ...RAW_ECOTECA, dateStart: null }),  null, 'null dateStart');
    },
  },
  {
    name: 'normalize: null / no-title input → null',
    fn: () => {
      assertEqual(normalize(null),          null, 'null input');
      assertEqual(normalize({}),            null, 'empty object');
      assertEqual(normalize({ title: '' }), null, 'empty title');
    },
  },
];
