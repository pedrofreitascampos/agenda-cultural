'use strict';

const {
  normalize,
  _extractEvents,
  _mapCategory,
  _parsePumpkinDate,
} = require('../pipeline/sources/pumpkin');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

function assertNotNull(actual, label) {
  if (actual == null) {
    throw new Error(`${label}: expected non-null, got ${JSON.stringify(actual)}`);
  }
}

// ─── Fixture ─────────────────────────────────────────────────

// Real-shaped article block from the Scherzando listing card.
const SAMPLE_ARTICLE = `<article id="post-303868" class="article-preview col-4 post-303868 event type-event status-publish format-standard has-post-thumbnail hentry category-musica-teatro-filmes tag-musica-criancas-lisboa location-sintra location-lisboa">
  <a class="post-thumbnail" href="https://pumpkin.pt/eventos/projeto-scherzando/">
    <img width="800" height="418" src="https://cdn.pumpkin.pt/2026/06/Banner-Scherzando-800x418.jpg" class="attachment-previews size-previews wp-post-image" alt="Projeto Scherzando: Workshop Pais e Filhos" />
  </a>
  <header class="entry-header">
    <div class="entry-meta">
      <h3 class="preview-meta familia">
        <span class="event-dates-preview"> 17 Jun 2026 </span>
        <span class="">Grande Lisboa, Sintra</span>
      </h3>
      <h3 class="preview-meta familia"><span class="event-admission">Grátis</span> </h3>
      <h3 class="preview-meta meta-tag familia" itemprop="articleSection"><a href="https://pumpkin.pt/familia/agenda-familia/musica-teatro-filmes/">Música, Teatro e Filmes</a></h3>
    </div>
    <h2 class="entry-title"><a href="https://pumpkin.pt/eventos/projeto-scherzando/" rel="bookmark">Projeto Scherzando: Workshop Pais e Filhos</a></h2>
  </header>
</article>`;

// Raw object as normalize() expects it (mirrors what fetchEvents() enriches with city).
const SAMPLE_RAW = {
  postId:       '303868',
  title:        'Projeto Scherzando: Workshop Pais e Filhos',
  sourceUrl:    'https://pumpkin.pt/eventos/projeto-scherzando/',
  imageUrl:     'https://cdn.pumpkin.pt/2026/06/Banner-Scherzando-800x418.jpg',
  dateText:     '17 Jun 2026',
  location:     'Grande Lisboa, Sintra',
  cost:         'Grátis',
  categorySlug: 'musica-teatro-filmes',
  city:         'lisboa',
};

// ─── Tests ───────────────────────────────────────────────────

module.exports = [
  // _extractEvents
  {
    name: '_extractEvents: parses single article block — fields',
    fn: () => {
      const events = _extractEvents(SAMPLE_ARTICLE);
      assertEqual(events.length, 1, 'event count');
      const e = events[0];
      assertEqual(e.postId,       '303868',                                         'postId');
      assertEqual(e.title,        'Projeto Scherzando: Workshop Pais e Filhos',     'title');
      assertEqual(e.sourceUrl,    'https://pumpkin.pt/eventos/projeto-scherzando/', 'sourceUrl');
      assertEqual(e.imageUrl,     'https://cdn.pumpkin.pt/2026/06/Banner-Scherzando-800x418.jpg', 'imageUrl');
      assertEqual(e.dateText,     '17 Jun 2026',                                   'dateText');
      assertEqual(e.location,     'Grande Lisboa, Sintra',                          'location');
      assertEqual(e.cost,         'Grátis',                                         'cost');
      assertEqual(e.categorySlug, 'musica-teatro-filmes',                           'categorySlug');
    },
  },
  {
    name: '_extractEvents: ignores non-event articles',
    fn: () => {
      const html = `<article class="post type-post">unrelated</article>` + SAMPLE_ARTICLE;
      const events = _extractEvents(html);
      assertEqual(events.length, 1, 'only event type-event counted');
    },
  },
  {
    name: '_extractEvents: deduplicates by postId within page',
    fn: () => {
      const html = SAMPLE_ARTICLE + '\n' + SAMPLE_ARTICLE;
      const events = _extractEvents(html);
      assertEqual(events.length, 1, 'duplicate postId deduplicated');
    },
  },
  {
    name: '_extractEvents: empty HTML returns empty array',
    fn: () => {
      assertEqual(_extractEvents('').length, 0, 'empty string');
      assertEqual(_extractEvents('<html><body>No events here</body></html>').length, 0, 'no articles');
    },
  },

  // _mapCategory
  {
    name: '_mapCategory: exact CATEGORY_MAP hits',
    fn: () => {
      assertEqual(_mapCategory('oficinas-artisticas'),          'workshops',  'oficinas-artisticas');
      assertEqual(_mapCategory('espetaculos-musica-escolas'),   'theatre',    'espetaculos-musica-escolas');
      assertEqual(_mapCategory('musica-teatro-filmes'),          'theatre',    'musica-teatro-filmes');
      assertEqual(_mapCategory('oficinas-culinaria-criancas'),  'workshops',  'oficinas-culinaria-criancas');
      assertEqual(_mapCategory('hora-do-conto-atividades-leitura-escrita'), 'literature', 'hora-do-conto');
    },
  },
  {
    name: '_mapCategory: keyword fallback',
    fn: () => {
      assertEqual(_mapCategory('algum-festival-verão'), 'festivals', 'festival keyword');
      assertEqual(_mapCategory('grande-exposicao-arte'), 'exhibitions', 'exposic keyword');
      assertEqual(_mapCategory('oficina-magia'),         'workshops',  'oficina keyword');
    },
  },
  {
    name: '_mapCategory: unknown slug defaults to family',
    fn: () => {
      assertEqual(_mapCategory('something-unknown'), 'family', 'unknown slug');
      assertEqual(_mapCategory(''),                  'family', 'empty slug');
      assertEqual(_mapCategory(null),                'family', 'null slug');
    },
  },

  // _parsePumpkinDate
  {
    name: '_parsePumpkinDate: single date "17 Jun 2026"',
    fn: () => {
      const d = _parsePumpkinDate('17 Jun 2026');
      assertNotNull(d, 'result');
      assertEqual(d.dateStart, '2026-06-17', 'dateStart');
    },
  },
  {
    name: '_parsePumpkinDate: range "12 Sep 2025 a 20 Jun 2026"',
    fn: () => {
      const d = _parsePumpkinDate('12 Sep 2025 a 20 Jun 2026');
      assertNotNull(d, 'result');
      assertEqual(d.dateStart, '2025-09-12', 'dateStart');
      assertEqual(d.dateEnd,   '2026-06-20', 'dateEnd');
    },
  },
  {
    name: '_parsePumpkinDate: "Evento permanente" returns null',
    fn: () => {
      assertEqual(_parsePumpkinDate('Evento permanente'), null, 'permanent event');
    },
  },
  {
    name: '_parsePumpkinDate: null/empty returns null',
    fn: () => {
      assertEqual(_parsePumpkinDate(null),  null, 'null');
      assertEqual(_parsePumpkinDate(''),    null, 'empty');
      assertEqual(_parsePumpkinDate('   '), null, 'whitespace');
    },
  },
  {
    name: '_parsePumpkinDate: English months translated correctly',
    fn: () => {
      // Spot-check months that differ from PT: Feb→fev, Aug→ago, Oct→out
      const feb = _parsePumpkinDate('5 Feb 2026');
      assertNotNull(feb, 'feb result');
      assertEqual(feb.dateStart, '2026-02-05', 'Feb→fev');

      const aug = _parsePumpkinDate('20 Aug 2026');
      assertNotNull(aug, 'aug result');
      assertEqual(aug.dateStart, '2026-08-20', 'Aug→ago');

      const oct = _parsePumpkinDate('1 Oct 2026');
      assertNotNull(oct, 'oct result');
      assertEqual(oct.dateStart, '2026-10-01', 'Oct→out');
    },
  },

  // normalize
  {
    name: 'normalize: full sample event',
    fn: () => {
      const n = normalize(SAMPLE_RAW);
      assertNotNull(n, 'result');
      assertEqual(n.id,        'pumpkin-303868-2026-06-17',                       'id');
      assertEqual(n.source,    'pumpkin',                                          'source');
      assertEqual(n.title,     'Projeto Scherzando: Workshop Pais e Filhos',       'title');
      assertEqual(n.sourceUrl, 'https://pumpkin.pt/eventos/projeto-scherzando/',   'sourceUrl');
      assertEqual(n.imageUrl,  'https://cdn.pumpkin.pt/2026/06/Banner-Scherzando-800x418.jpg', 'imageUrl');
      assertEqual(n.category,  'theatre',     'category (musica-teatro-filmes → theatre)');
      assertEqual(n.dateStart, '2026-06-17',  'dateStart');
      assertEqual(n.cost,      'Grátis',       'cost');
      assertEqual(n.city,      'Lisboa',       'city');
      assertEqual(n.venue,     'Grande Lisboa, Sintra', 'venue');
      assertEqual(n.address,   '',             'address empty');
      assertEqual(n.lat,       null,           'lat null');
      assertEqual(n.lng,       null,           'lng null');
      assertEqual(n.timeStart, null,           'timeStart null');
      assertEqual(n.timeEnd,   null,           'timeEnd null');
      assertEqual(n.description, '',           'description empty');
      assertEqual(n.isRecurring, false,        'isRecurring false');
      // tags must include 'criancas'
      if (!Array.isArray(n.tags) || !n.tags.includes('criancas')) {
        throw new Error(`tags: expected array containing 'criancas', got ${JSON.stringify(n.tags)}`);
      }
    },
  },
  {
    name: 'normalize: "Evento permanente" dateText returns null',
    fn: () => {
      assertEqual(normalize({ ...SAMPLE_RAW, dateText: 'Evento permanente' }), null, 'permanent');
    },
  },
  {
    name: 'normalize: null input returns null',
    fn: () => {
      assertEqual(normalize(null),             null, 'null input');
      assertEqual(normalize({}),               null, 'empty object (no title)');
      assertEqual(normalize({ title: '' }),    null, 'empty title');
    },
  },
  {
    name: 'normalize: unknown city slug falls back to Lisboa',
    fn: () => {
      const n = normalize({ ...SAMPLE_RAW, city: 'unknown-city' });
      assertNotNull(n, 'result');
      assertEqual(n.city, 'Lisboa', 'unknown city falls back');
    },
  },
  {
    name: 'normalize: workshops category from oficinas slug',
    fn: () => {
      const n = normalize({ ...SAMPLE_RAW, categorySlug: 'oficinas-artisticas' });
      assertNotNull(n, 'result');
      assertEqual(n.category, 'workshops', 'oficinas-artisticas → workshops');
    },
  },
];
