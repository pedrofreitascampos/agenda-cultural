'use strict';

/**
 * Tests for geocoding logic (cache hit/miss, no actual HTTP calls).
 */

const { cacheKey } = require('../pipeline/geocode');

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
    name: 'cacheKey: normalizes venue + city',
    fn: () => {
      assertEqual(
        cacheKey('Casa do Fado', 'Lisboa'),
        'casa do fado|lisboa',
        'lowercase + trimmed'
      );
    },
  },
  {
    name: 'cacheKey: handles empty/null',
    fn: () => {
      assertEqual(cacheKey('', ''), '|', 'both empty');
      assertEqual(cacheKey(null, null), '|', 'both null');
      assertEqual(cacheKey('Venue', ''), 'venue|', 'no city');
    },
  },
  {
    name: 'cacheKey: trims whitespace',
    fn: () => {
      assertEqual(
        cacheKey('  Museu X  ', '  Porto  '),
        'museu x|porto',
        'trimmed'
      );
    },
  },
  {
    name: 'cacheKey: same venue different cities = different keys',
    fn: () => {
      const k1 = cacheKey('Teatro Nacional', 'Lisboa');
      const k2 = cacheKey('Teatro Nacional', 'Porto');
      if (k1 === k2) throw new Error('keys should differ');
    },
  },
];
