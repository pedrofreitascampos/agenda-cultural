#!/usr/bin/env node

'use strict';

/**
 * Import events from Google Calendar JSON export into Agora's events.json.
 * Usage: node scripts/import-gcal.js <gcal-json-file>
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '..', 'data', 'gcal-raw.json');
const EVENTS_PATH = path.join(__dirname, '..', 'data', 'events.json');

// Read the MCP tool output
const raw = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
const data = JSON.parse(raw[0].text);
const gcalEvents = data.events;

console.log('Total calendar events:', gcalEvents.length);

const converted = [];

for (const e of gcalEvents) {
  const dateStart = e.start.date || (e.start.dateTime ? e.start.dateTime.slice(0, 10) : null);
  let dateEnd = e.end.date || (e.end.dateTime ? e.end.dateTime.slice(0, 10) : null);
  if (!dateStart) continue;

  // Google all-day events use exclusive end date — subtract 1 day
  if (e.allDay && dateEnd) {
    const d = new Date(dateEnd);
    d.setDate(d.getDate() - 1);
    dateEnd = d.toISOString().slice(0, 10);
  }

  // Extract URL from description HTML
  let sourceUrl = '';
  if (e.description) {
    const m = e.description.match(/href="([^"]+)"/);
    if (m) sourceUrl = m[1];
  }

  // Times
  let timeStart = null;
  let timeEnd = null;
  if (e.start.dateTime) timeStart = e.start.dateTime.slice(11, 16);
  if (e.end.dateTime) timeEnd = e.end.dateTime.slice(11, 16);

  // City from location
  let city = '';
  const location = e.location || '';
  if (location) {
    const parts = location.split(',').map(s => s.trim());
    const ptIdx = parts.findIndex(p => p === 'Portugal');
    if (ptIdx > 0) city = parts[ptIdx - 1];
    else if (parts.length >= 2) city = parts[parts.length - 1];
    else city = parts[0];
  }

  converted.push({
    id: 'gcal-' + e.id.replace(/_/g, '-'),
    source: 'gcal',
    sourceUrl,
    title: e.summary || '',
    description: '',
    category: 'festivals',
    imageUrl: '',
    cost: '',
    dateStart,
    dateEnd: dateEnd || dateStart,
    timeStart,
    timeEnd,
    isRecurring: !!e.recurringEventId,
    recurrenceNote: e.recurringEventId ? 'Evento anual' : '',
    venue: '',
    address: location,
    lat: null,
    lng: null,
    city,
    tags: ['agenda-cultural'],
    fetchedAt: new Date().toISOString(),
  });
}

console.log('Converted:', converted.length, 'events');

// Merge into existing events.json (upsert — update existing, add new)
const existing = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf-8'));
const existingMap = new Map(existing.map(e => [e.id, e]));

let added = 0;
let updated = 0;
for (const ev of converted) {
  if (existingMap.has(ev.id)) {
    // Update dates and details for existing events
    const old = existingMap.get(ev.id);
    old.dateStart = ev.dateStart;
    old.dateEnd = ev.dateEnd;
    old.timeStart = ev.timeStart;
    old.timeEnd = ev.timeEnd;
    old.address = ev.address || old.address;
    old.fetchedAt = ev.fetchedAt;
    updated++;
  } else {
    existing.push(ev);
    existingMap.set(ev.id, ev);
    added++;
  }
}

// Sort by dateStart
existing.sort((a, b) => (a.dateStart || '').localeCompare(b.dateStart || ''));

fs.writeFileSync(EVENTS_PATH, JSON.stringify(existing, null, 2) + '\n');
console.log('Added', added, 'new, updated', updated, 'existing. Total:', existing.length);
