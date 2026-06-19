'use strict';

const {
  normalize,
  _extractEvents,
  _mapCategory,
  _parseMeoDate,
} = require('../pipeline/sources/meoarena');

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

// Real-shaped card — Scorpions, single date "08 JUL 2026".
const BLOCK_SCORPIONS = `
<div class="agendaDestaquesUn agendaDestaquesUn--style agendaDestaquesUn--styleexception">
  <div class="agendaDestaquesFundo">
    <figure>
      <a href="/agenda/scorpions-coming-home-2026_pt/15776" class="agendaDestaquesImg">
        <img src=" https://arena.wntech.com/image?pic=eventId%3D15776" loading="lazy" alt="">
      </a>
    </figure>
    <div class="agendaDestaquesDesc agendaDestaquesDesc--left">
      <a href="/agenda/scorpions-coming-home-2026_pt/15776" class="destaquesNome">SCORPIONS - COMING HOME 2026</a>
      <div class="destaquesData">
        <div class="data-abrev">08 <span>JUL</span> 2026</div>
      </div>
      <div class="destaquesBotaoes">
        <a href="/agenda/scorpions-coming-home-2026_pt/15776" class="info" aria-label="Info">Info</a>
        <a href="https://www.ticketline.pt/scorpions" target="_blank" class="comprar" aria-label="Comprar">comprar</a>
      </div>
    </div>
  </div>
</div>`;

// Range-date card — "29 OUT A 31 OUT 2026".
const BLOCK_RANGE = `
<div class="agendaDestaquesUn agendaDestaquesUn--style">
  <div class="agendaDestaquesFundo">
    <figure>
      <a href="/agenda/some-show_pt/99001" class="agendaDestaquesImg">
        <img src="https://arena.wntech.com/image?pic=eventId%3D99001" loading="lazy" alt="">
      </a>
    </figure>
    <div class="agendaDestaquesDesc agendaDestaquesDesc--left">
      <a href="/agenda/some-show_pt/99001" class="destaquesNome">SOME SHOW - OCTOBER TOUR</a>
      <div class="destaquesData">
        <div class="data-abrev">29 <span>OUT</span> A 31 <span>OUT</span> 2026</div>
      </div>
      <div class="destaquesBotaoes">
        <a href="/agenda/some-show_pt/99001" class="info" aria-label="Info">Info</a>
        <a href="https://www.ticketline.pt/some-show" target="_blank" class="comprar" aria-label="Comprar">comprar</a>
      </div>
    </div>
  </div>
</div>`;

const SAMPLE_HTML = `<html><body>${BLOCK_SCORPIONS}${BLOCK_RANGE}</body></html>`;

// Raw object as normalize() expects (mirrors what fetchEvents returns).
const SAMPLE_RAW_SCORPIONS = {
  eventId:   '15776',
  title:     'SCORPIONS - COMING HOME 2026',
  sourceUrl: 'https://arena.meo.pt/agenda/scorpions-coming-home-2026_pt/15776',
  imageUrl:  'https://arena.wntech.com/image?pic=eventId%3D15776',
  dateText:  '08 JUL 2026',
};

// ─── Tests ───────────────────────────────────────────────────

module.exports = [

  // ── _extractEvents ──────────────────────────────────────────

  {
    name: '_extractEvents: parses 2 event blocks',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      assertEqual(events.length, 2, 'event count');
    },
  },
  {
    name: '_extractEvents: Scorpions block — title, eventId, sourceUrl, dateText',
    fn: () => {
      const events = _extractEvents(SAMPLE_HTML);
      const e = events[0];
      assertEqual(e.title,     'SCORPIONS - COMING HOME 2026',                                    'title');
      assertEqual(e.eventId,   '15776',                                                            'eventId');
      assertEqual(e.sourceUrl, 'https://arena.meo.pt/agenda/scorpions-coming-home-2026_pt/15776', 'sourceUrl');
      assertEqual(e.dateText,  '08 JUL 2026',                                                     'dateText');
    },
  },
  {
    name: '_extractEvents: empty HTML returns empty array',
    fn: () => {
      assertEqual(_extractEvents('').length, 0, 'empty string');
      assertEqual(_extractEvents('<html><body>nothing here</body></html>').length, 0, 'no cards');
    },
  },

  // ── _parseMeoDate ───────────────────────────────────────────

  {
    name: '_parseMeoDate: "08 JUL 2026" → single day (dateStart === dateEnd)',
    fn: () => {
      const d = _parseMeoDate('08 JUL 2026');
      assertNotNull(d, 'result');
      assertEqual(d.dateStart, '2026-07-08', 'dateStart');
      assertEqual(d.dateEnd,   '2026-07-08', 'dateEnd');
    },
  },
  {
    name: '_parseMeoDate: "29 E 30 AGO 2026" → two-day same month',
    fn: () => {
      const d = _parseMeoDate('29 E 30 AGO 2026');
      assertNotNull(d, 'result');
      assertEqual(d.dateStart, '2026-08-29', 'dateStart');
      assertEqual(d.dateEnd,   '2026-08-30', 'dateEnd');
    },
  },
  {
    name: '_parseMeoDate: "29 OUT A 31 OUT 2026" → range same month',
    fn: () => {
      const d = _parseMeoDate('29 OUT A 31 OUT 2026');
      assertNotNull(d, 'result');
      assertEqual(d.dateStart, '2026-10-29', 'dateStart');
      assertEqual(d.dateEnd,   '2026-10-31', 'dateEnd');
    },
  },
  {
    name: '_parseMeoDate: "30 OUT A 02 NOV 2026" → cross-month range',
    fn: () => {
      const d = _parseMeoDate('30 OUT A 02 NOV 2026');
      assertNotNull(d, 'result');
      assertEqual(d.dateStart, '2026-10-30', 'dateStart');
      assertEqual(d.dateEnd,   '2026-11-02', 'dateEnd');
    },
  },
  {
    name: '_parseMeoDate: "lixo" → null',
    fn: () => {
      assertEqual(_parseMeoDate('lixo'), null, 'garbage input');
    },
  },
  {
    name: '_parseMeoDate: null / empty → null',
    fn: () => {
      assertEqual(_parseMeoDate(null), null, 'null');
      assertEqual(_parseMeoDate(''),   null, 'empty');
    },
  },

  // ── _mapCategory ────────────────────────────────────────────

  {
    name: '_mapCategory: concert titles → music',
    fn: () => {
      assertEqual(_mapCategory('SCORPIONS - COMING HOME 2026'), 'music', 'band → music');
      assertEqual(_mapCategory('Coldplay World Tour'),           'music', 'tour → music');
      assertEqual(_mapCategory(''),                              'music', 'empty → music');
    },
  },
  {
    name: '_mapCategory: comedy/stand-up/gala → other',
    fn: () => {
      assertEqual(_mapCategory('Jerry Seinfeld - MEO Commedia'), 'other', 'commedia → other');
      assertEqual(_mapCategory('Best of Stand Up Comedy Night'), 'other', 'stand up → other');
      assertEqual(_mapCategory('Grande Gala de Natal'),          'other', 'gala → other');
    },
  },
  {
    name: '_mapCategory: family shows → family',
    fn: () => {
      assertEqual(_mapCategory('Hot Wheels Stunt Show'), 'family', 'hot wheels → family');
      assertEqual(_mapCategory('Disney On Ice'),          'family', 'disney → family');
      assertEqual(_mapCategory('Frozen - O Musical'),     'family', 'frozen → family');
    },
  },
  {
    name: '_mapCategory: festivals → festivals',
    fn: () => {
      assertEqual(_mapCategory('NOS Alive Festival 2026'), 'festivals', 'festival keyword');
    },
  },

  // ── normalize ───────────────────────────────────────────────

  {
    name: 'normalize: full Scorpions raw → correct common-schema fields',
    fn: () => {
      const n = normalize(SAMPLE_RAW_SCORPIONS);
      assertNotNull(n, 'result');
      assertEqual(n.source,         'meoarena',                                                          'source');
      assertEqual(n.id,             'meoarena-15776',                                                    'id');
      assertEqual(n.title,          'SCORPIONS - COMING HOME 2026',                                      'title');
      assertEqual(n.dateStart,      '2026-07-08',                                                        'dateStart');
      assertEqual(n.dateEnd,        '2026-07-08',                                                        'dateEnd');
      assertEqual(n.venue,          'MEO Arena',                                                         'venue');
      assertEqual(n.address,        'Rossio dos Olivais, Parque das Nações',                   'address');
      assertEqual(n.city,           'Lisboa',                                                            'city');
      assertEqual(n.lat,            38.7656,                                                             'lat');
      assertEqual(n.lng,            -9.0944,                                                             'lng');
      assertEqual(n.category,       'music',                                                             'category');
      assertEqual(n.description,    '',                                                                  'description');
      assertEqual(n.cost,           '',                                                                  'cost');
      assertEqual(n.timeStart,      null,                                                                'timeStart');
      assertEqual(n.timeEnd,        null,                                                                'timeEnd');
      assertEqual(n.isRecurring,    false,                                                               'isRecurring');
      assertEqual(n.recurrenceNote, '',                                                                  'recurrenceNote');
    },
  },
  {
    name: 'normalize: missing / unparseable date → null',
    fn: () => {
      assertEqual(normalize({ ...SAMPLE_RAW_SCORPIONS, dateText: 'lixo' }), null, 'bad dateText');
      assertEqual(normalize({ ...SAMPLE_RAW_SCORPIONS, dateText: '' }),     null, 'empty dateText');
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
