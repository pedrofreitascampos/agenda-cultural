'use strict';

const { normalize, _extractEvents, _mapCategory } = require('../pipeline/sources/egeac');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    const err = new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    err.expected = expected;
    err.actual = actual;
    throw err;
  }
}

const SAMPLE_CARD = `
<div class="col-12 col-xs-6 col-sm-6 to-filter" data-categoria="Teatro" data-classificacao="Todos" data-acessibilidades="" data-inicio="2026-05-15" data-fim="2026-05-17" data-local="Teatro do Bairro Alto">
  <div class="evento-card">
    <a href="https://teatrodobairroalto.pt/pt/evento/sample-show" title="Site externo" target="_blank">
      <div class="info mb-auto">
        <p class="category">Teatro</p>
        <p class="h5"><strong>SAMPLE SHOW &amp; FRIENDS</strong></p>
        <div class="hr"></div>
        <div class="details">
          <div class="date"><p>15 <abbr title="Maio">Mai</abbr> 2026</p></div>
          <div class="location"><p>Teatro do Bairro Alto</p></div>
        </div>
      </div>
      <img data-src="https://egeac.pt/wp-content/uploads/sample.jpg" alt="">
    </a>
  </div>
</div>
</div>
</div>
`;

module.exports = [
  {
    name: 'mapCategory: maps Teatro -> theatre',
    fn: () => {
      assertEqual(_mapCategory('Teatro'), 'theatre', 'theatre');
      assertEqual(_mapCategory('Música'), 'music', 'music');
      assertEqual(_mapCategory('Exposição'), 'exhibitions', 'exhibitions');
      assertEqual(_mapCategory('Debate/conversa/Conferência'), 'literature', 'literature');
      assertEqual(_mapCategory('Visita Orientada'), 'other', 'other');
      assertEqual(_mapCategory(''), 'other', 'empty');
    },
  },
  {
    name: '_extractEvents: parses card with data attributes',
    fn: () => {
      const events = _extractEvents(SAMPLE_CARD);
      assertEqual(events.length, 1, 'one event extracted');
      const e = events[0];
      assertEqual(e.title, 'SAMPLE SHOW & FRIENDS', 'title decoded');
      assertEqual(e.dateStart, '2026-05-15', 'dateStart');
      assertEqual(e.dateEnd, '2026-05-17', 'dateEnd');
      assertEqual(e.venue, 'Teatro do Bairro Alto', 'venue');
      assertEqual(e.categoria, 'Teatro', 'categoria');
      assertEqual(e.sourceUrl, 'https://teatrodobairroalto.pt/pt/evento/sample-show', 'sourceUrl');
      assertEqual(e.imageUrl, 'https://egeac.pt/wp-content/uploads/sample.jpg', 'imageUrl from data-src');
    },
  },
  {
    name: '_extractEvents: skips cards with invalid date',
    fn: () => {
      const html = `
<div class="col-12 to-filter" data-categoria="Teatro" data-inicio="bad" data-fim="bad" data-local="X">
<div><a href="x"><p class="h5"><strong>Bad date</strong></p></a></div>
</div>
</div>
</div>`;
      const events = _extractEvents(html);
      assertEqual(events.length, 0, 'invalid date skipped');
    },
  },
  {
    name: 'normalize: builds full event from extracted card',
    fn: () => {
      const events = _extractEvents(SAMPLE_CARD);
      const n = normalize(events[0]);
      assertEqual(n.source, 'egeac', 'source');
      assertEqual(n.city, 'Lisboa', 'city');
      assertEqual(n.category, 'theatre', 'category mapped');
      assertEqual(n.dateStart, '2026-05-15', 'dateStart');
      assertEqual(n.dateEnd, '2026-05-17', 'dateEnd');
      assertEqual(n.venue, 'Teatro do Bairro Alto', 'venue');
      assertEqual(n.id.startsWith('egeac-sample-show-friends-'), true, 'id slug');
    },
  },
  {
    name: 'normalize: returns null for missing title or date',
    fn: () => {
      assertEqual(normalize(null), null, 'null');
      assertEqual(normalize({ title: '', dateStart: '2026-05-15' }), null, 'empty title');
      assertEqual(normalize({ title: 'X', dateStart: null }), null, 'no date');
    },
  },
];
