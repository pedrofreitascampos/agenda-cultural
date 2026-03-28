'use strict';

/**
 * Source module template.
 * Copy this file and implement fetch() and normalize() for a new data source.
 */

const { stripHtml } = require('../normalize');

const CATEGORY_MAP = {
  // 'source-native-category': 'normalized-category',
  // See normalize.js CATEGORIES for valid values:
  // music, theatre, dance, cinema, exhibitions, workshops, festivals, literature, family, other
};

/**
 * Fetch raw events from this source.
 * @param {object} log - Pipeline logger (log.api, log.info, etc.)
 * @returns {Promise<Array>} Raw event objects in source-native format.
 */
async function fetchEvents(log) {
  // Implement: HTTP fetch, pagination, error handling
  return [];
}

/**
 * Normalize a single raw event to the common schema.
 * @param {object} raw - Raw event from fetch()
 * @returns {object|null} Normalized event, or null to skip.
 */
function normalize(raw) {
  // Implement: map raw fields to normalized schema
  return null;
}

module.exports = {
  id: 'source-name',
  name: 'Human Readable Name',
  enabled: false,
  CATEGORY_MAP,
  fetch: fetchEvents,
  normalize,
};
