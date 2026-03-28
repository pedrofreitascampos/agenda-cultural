/* ═══════════════════════════════════════════════════════════
   Agora — Frontend Application
   Map, filters, event detail, personal agenda (watchlist)
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─── Category Definitions ────────────────────────────────────

const CATEGORIES = {
  music:       { icon: '\uD83C\uDFB5', color: '#8b5cf6', label: 'Música' },
  theatre:     { icon: '\uD83C\uDFAD', color: '#ef4444', label: 'Teatro' },
  dance:       { icon: '\uD83D\uDC83', color: '#ec4899', label: 'Dança' },
  cinema:      { icon: '\uD83C\uDFAC', color: '#f59e0b', label: 'Cinema' },
  exhibitions: { icon: '\uD83D\uDDBC\uFE0F', color: '#3b82f6', label: 'Exposições' },
  workshops:   { icon: '\uD83D\uDEE0\uFE0F', color: '#10b981', label: 'Workshops' },
  festivals:   { icon: '\u2B50',        color: '#f97316', label: 'Festivais' },
  literature:  { icon: '\uD83D\uDCD6', color: '#6366f1', label: 'Literatura' },
  family:      { icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67', color: '#14b8a6', label: 'Famílias' },
  other:       { icon: '\uD83D\uDCC5', color: '#6b7280', label: 'Outros' },
};

// ─── State ───────────────────────────────────────────────────

const State = {
  events: [],
  filtered: [],
  view: 'map',       // 'map' | 'agenda'
  filters: {
    search: '',
    dateFrom: '',
    dateTo: '',
    categories: new Set(),  // empty = all
    city: '',
  },
  sources: {},            // from data/sources.json
  disabledSources: {},    // { sourceId: true } — user-toggled off
  userEvents: {},         // { eventId: 'watching' | 'attending' }
  userId: null,
  firebaseReady: false,
  weather: null,          // current weather + forecast cache
  weatherEnabled: true,
};

// ─── DOM References ──────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  map: null,
  clusterGroup: null,
  searchInput: $('#search-input'),
  dateFrom: $('#date-from'),
  dateTo: $('#date-to'),
  categoryFilters: $('#category-filters'),
  cityFilter: $('#city-filter'),
  clearFilters: $('#clear-filters'),
  eventCount: $('#event-count'),
  eventDetail: $('#event-detail'),
  detailContent: $('#detail-content'),
  detailClose: $('#detail-close'),
  agendaView: $('#agenda-view'),
  agendaContent: $('#agenda-content'),
  filterPanel: $('#filter-panel'),
  filterHandle: $('#filter-handle'),
  toastContainer: $('#toast-container'),
  tabBtns: $$('.tab-btn'),
  settingsBtn: $('#settings-btn'),
  settingsPanel: $('#settings-panel'),
  settingsBackdrop: $('#settings-backdrop'),
  settingsClose: $('#settings-close'),
  sourcesList: $('#sources-list'),
  weatherToggle: $('#weather-toggle'),
  weatherWidget: $('#weather-widget'),
};

// ─── Map Setup ───────────────────────────────────────────────

function initMap() {
  DOM.map = L.map('map', {
    center: [38.72, -9.14],  // Lisboa
    zoom: 12,
    zoomControl: true,
    attributionControl: true,
  });

  // Dark tile layer (CartoDB Dark Matter)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(DOM.map);

  // Cluster group
  DOM.clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    iconCreateFunction: function (cluster) {
      const count = cluster.getChildCount();
      let size = 'small';
      if (count > 20) size = 'medium';
      if (count > 50) size = 'large';
      return L.divIcon({
        html: '<div>' + count + '</div>',
        className: 'marker-cluster marker-cluster-' + size,
        iconSize: L.point(40, 40),
      });
    },
  });
  DOM.map.addLayer(DOM.clusterGroup);
}

// ─── Marker Creation ─────────────────────────────────────────

function createMarkerIcon(category) {
  const cat = CATEGORIES[category] || CATEGORIES.other;
  return L.divIcon({
    html: '<div class="category-marker" style="background:' + cat.color + '">' +
          '<span class="chip-icon">' + cat.icon + '</span></div>',
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function createPopupContent(event) {
  const cat = CATEGORIES[event.category] || CATEGORIES.other;
  const dateStr = formatDateRange(event.dateStart, event.dateEnd);
  const timeStr = event.timeStart ? (' \u00B7 ' + event.timeStart + (event.timeEnd ? '–' + event.timeEnd : '')) : '';
  const venueStr = event.venue ? ('<div>' + escapeHtml(event.venue) + '</div>') : '';
  const costStr = event.cost ? ('<div>' + escapeHtml(event.cost) + '</div>') : '';

  return '<div class="popup-content">' +
    '<div class="popup-cat" style="color:' + cat.color + '">' + cat.icon + ' ' + escapeHtml(cat.label) + '</div>' +
    '<div class="popup-title">' + escapeHtml(event.title) + '</div>' +
    '<div class="popup-meta">' +
      '<div>' + dateStr + timeStr + '</div>' +
      venueStr +
      costStr +
    '</div>' +
    '<a class="popup-link" data-event-id="' + escapeHtml(event.id) + '">Ver detalhes \u2192</a>' +
  '</div>';
}

// ─── Render Markers ──────────────────────────────────────────

function renderMarkers() {
  DOM.clusterGroup.clearLayers();

  const geoEvents = State.filtered.filter(e => e.lat != null && e.lng != null);
  const markers = [];

  for (const event of geoEvents) {
    const marker = L.marker([event.lat, event.lng], {
      icon: createMarkerIcon(event.category),
    });
    marker.bindPopup(createPopupContent(event), { maxWidth: 280 });
    marker.on('popupopen', function () {
      const link = document.querySelector('.popup-link[data-event-id="' + CSS.escape(event.id) + '"]');
      if (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          openDetail(event);
        });
      }
    });
    markers.push(marker);
  }

  DOM.clusterGroup.addLayers(markers);

  // Update event count
  const total = State.filtered.length;
  const mapped = geoEvents.length;
  if (mapped < total) {
    DOM.eventCount.textContent = mapped + ' no mapa \u00B7 ' + total + ' total';
  } else {
    DOM.eventCount.textContent = total + ' eventos';
  }

  // Fit bounds if we have markers
  if (markers.length > 0) {
    const bounds = DOM.clusterGroup.getBounds();
    if (bounds.isValid()) {
      DOM.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }

  // Show banner for unmapped events
  renderUnmappedBanner(total - mapped);
}

function renderUnmappedBanner(unmappedCount) {
  let banner = document.querySelector('.event-list-banner');
  if (unmappedCount > 0) {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'event-list-banner';
      $('#map').parentElement.appendChild(banner);
    }
    banner.innerHTML =
      '<span>' + unmappedCount + ' eventos sem localização no mapa</span>' +
      '<button onclick="showUnmappedList()">Ver lista</button>';
    banner.classList.remove('hidden');
  } else if (banner) {
    banner.classList.add('hidden');
  }
}

// ─── Unmapped Events List (shown inside agenda view temporarily) ─

function showUnmappedList() {
  const unmapped = State.filtered.filter(e => e.lat == null || e.lng == null);
  if (unmapped.length === 0) return;

  // Switch to agenda view to show the list
  switchView('agenda');
  renderEventList(unmapped, 'Eventos sem localização');
}

function renderEventList(events, title) {
  const grouped = groupByDate(events);
  let html = '<h2 style="font-size:16px;font-weight:600;margin-bottom:16px;color:var(--color-text)">' +
    escapeHtml(title) + ' (' + events.length + ')</h2>';

  for (const [date, dayEvents] of grouped) {
    html += '<div class="agenda-day-header">' + formatDisplayDate(date) + '</div>';
    for (const event of dayEvents) {
      const cat = CATEGORIES[event.category] || CATEGORIES.other;
      const status = State.userEvents[event.id];
      html += '<div class="agenda-card" data-event-id="' + escapeHtml(event.id) + '">' +
        '<div class="agenda-card-cat" style="background:' + cat.color + '">' + cat.icon + '</div>' +
        '<div class="agenda-card-body">' +
          '<div class="agenda-card-title">' + escapeHtml(event.title) + '</div>' +
          '<div class="agenda-card-meta">' +
            (event.venue ? escapeHtml(event.venue) : '') +
            (event.timeStart ? ' \u00B7 ' + event.timeStart : '') +
            (status ? ' \u00B7 ' + statusLabel(status) : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }
  }

  DOM.agendaContent.innerHTML = html;
  bindAgendaCardClicks();
}

// ─── Filters ─────────────────────────────────────────────────

function initFilters() {
  // Category chips
  renderCategoryChips();

  // City dropdown
  populateCityDropdown();

  // Set default date range: today → +30 days
  const today = new Date().toISOString().slice(0, 10);
  DOM.dateFrom.value = today;

  // Event listeners
  DOM.searchInput.addEventListener('input', debounce(applyFilters, 200));
  DOM.dateFrom.addEventListener('change', applyFilters);
  DOM.dateTo.addEventListener('change', applyFilters);
  DOM.cityFilter.addEventListener('change', applyFilters);
  DOM.clearFilters.addEventListener('click', clearFilters);
}

function renderCategoryChips() {
  let html = '';
  const counts = {};
  for (const e of State.events) {
    counts[e.category] = (counts[e.category] || 0) + 1;
  }

  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (!counts[key]) continue;
    html += '<button class="chip" data-category="' + key + '" ' +
      'style="--chip-color:' + cat.color + ';--chip-bg:' + cat.color + '22">' +
      '<span class="chip-icon">' + cat.icon + '</span>' +
      '<span>' + escapeHtml(cat.label) + '</span>' +
      '<span class="chip-count">' + counts[key] + '</span>' +
    '</button>';
  }

  DOM.categoryFilters.innerHTML = html;

  // Click handlers
  DOM.categoryFilters.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', function () {
      const cat = this.dataset.category;
      if (State.filters.categories.has(cat)) {
        State.filters.categories.delete(cat);
        this.classList.remove('active');
      } else {
        State.filters.categories.add(cat);
        this.classList.add('active');
      }
      applyFilters();
    });
  });
}

function populateCityDropdown() {
  const cities = new Set();
  for (const e of State.events) {
    if (e.city) cities.add(e.city);
  }
  const sorted = Array.from(cities).sort();

  let html = '<option value="">Todas</option>';
  for (const city of sorted) {
    html += '<option value="' + escapeHtml(city) + '">' + escapeHtml(city) + '</option>';
  }
  DOM.cityFilter.innerHTML = html;
}

function applyFilters() {
  State.filters.search = DOM.searchInput.value.trim().toLowerCase();
  State.filters.dateFrom = DOM.dateFrom.value;
  State.filters.dateTo = DOM.dateTo.value;
  State.filters.city = DOM.cityFilter.value;

  const { search, dateFrom, dateTo, categories, city } = State.filters;

  State.filtered = State.events.filter(event => {
    // Source toggle
    if (State.disabledSources[event.source]) return false;

    // Text search
    if (search) {
      const haystack = (event.title + ' ' + (event.venue || '') + ' ' + (event.description || '')).toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    // Date range
    if (dateFrom && event.dateEnd && event.dateEnd < dateFrom) return false;
    if (dateTo && event.dateStart && event.dateStart > dateTo) return false;

    // Category
    if (categories.size > 0 && !categories.has(event.category)) return false;

    // City
    if (city && event.city !== city) return false;

    return true;
  });

  if (State.view === 'map') {
    renderMarkers();
  } else {
    renderAgenda();
  }
}

function clearFilters() {
  DOM.searchInput.value = '';
  DOM.dateFrom.value = '';
  DOM.dateTo.value = '';
  DOM.cityFilter.value = '';
  State.filters.categories.clear();
  DOM.categoryFilters.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  applyFilters();
}

// ─── Event Detail Drawer ─────────────────────────────────────

function openDetail(event) {
  const cat = CATEGORIES[event.category] || CATEGORIES.other;
  const status = State.userEvents[event.id];
  const dateStr = formatDateRange(event.dateStart, event.dateEnd);
  const timeStr = event.timeStart ? (event.timeStart + (event.timeEnd ? ' – ' + event.timeEnd : '')) : null;

  let html = '';

  // Image
  if (event.imageUrl) {
    html += '<img class="detail-image" src="' + escapeHtml(event.imageUrl) + '" alt="" onerror="this.style.display=\'none\'">';
  }

  html += '<div class="detail-body">';

  // Category badge
  html += '<div class="detail-cat" style="color:' + cat.color + '">' + cat.icon + ' ' + escapeHtml(cat.label) + '</div>';

  // Title
  html += '<div class="detail-title">' + escapeHtml(event.title) + '</div>';

  // Action buttons (watchlist/attending)
  html += '<div style="display:flex;gap:8px;margin-bottom:20px">';
  html += renderStatusButton(event.id, 'watching', '\uD83D\uDC41\uFE0F A ver', status);
  html += renderStatusButton(event.id, 'attending', '\u2705 Confirmado', status);
  html += '</div>';

  // Info rows
  html += '<div class="detail-info">';
  html += infoRow('\uD83D\uDCC5', dateStr);
  if (timeStr) html += infoRow('\uD83D\uDD53', timeStr);
  if (event.venue) html += infoRow('\uD83D\uDCCD', event.venue);
  if (event.address) html += infoRow('', event.address, true);
  if (event.city) html += infoRow('\uD83C\uDFD9\uFE0F', event.city);
  if (event.cost) html += infoRow('\uD83D\uDCB6', event.cost);
  if (event.isRecurring && event.recurrenceNote) html += infoRow('\uD83D\uDD01', event.recurrenceNote, true);
  html += '</div>';

  // Weather forecast for event dates
  html += renderDetailWeather(event);

  // Description
  if (event.description) {
    html += '<div class="detail-description">' + escapeHtml(event.description) + '</div>';
  }

  // Source badge
  html += '<div style="font-size:11px;color:var(--color-text-dim);margin-bottom:12px">' +
    'Fonte: ' + escapeHtml(event.source) + '</div>';

  // Source link
  if (event.sourceUrl) {
    html += '<a class="detail-link" href="' + escapeHtml(event.sourceUrl) + '" target="_blank" rel="noopener">Ver na fonte original \u2197</a>';
  }

  html += '</div>';

  DOM.detailContent.innerHTML = html;
  DOM.eventDetail.classList.remove('hidden');
  DOM.eventDetail.classList.add('open');

  // Bind status button clicks
  DOM.detailContent.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      toggleEventStatus(this.dataset.eventId, this.dataset.status);
    });
  });
}

function renderStatusButton(eventId, statusType, label, currentStatus) {
  const isActive = currentStatus === statusType;
  const activeStyle = isActive
    ? 'background:var(--color-accent);color:#fff;border-color:var(--color-accent)'
    : '';
  return '<button class="status-btn btn-secondary" data-event-id="' + escapeHtml(eventId) + '" ' +
    'data-status="' + statusType + '" ' +
    'style="flex:1;' + activeStyle + '">' + label + '</button>';
}

function infoRow(icon, text, muted) {
  return '<div class="detail-info-row">' +
    '<span class="detail-info-icon">' + icon + '</span>' +
    '<span class="detail-info-text' + (muted ? ' muted' : '') + '">' + escapeHtml(text) + '</span>' +
  '</div>';
}

function closeDetail() {
  DOM.eventDetail.classList.remove('open');
  setTimeout(() => DOM.eventDetail.classList.add('hidden'), 250);
}

// ─── Watchlist / Attending ───────────────────────────────────

function toggleEventStatus(eventId, status) {
  if (State.userEvents[eventId] === status) {
    delete State.userEvents[eventId];
  } else {
    State.userEvents[eventId] = status;
  }

  // Persist to localStorage (and Firebase if authenticated)
  saveUserEvents();

  // Re-render detail if open
  const event = State.events.find(e => e.id === eventId);
  if (event) openDetail(event);

  // Re-render agenda if visible
  if (State.view === 'agenda') renderAgenda();

  toast(State.userEvents[eventId]
    ? statusLabel(State.userEvents[eventId]) + ': ' + (event ? event.title : eventId)
    : 'Removido da agenda');
}

function statusLabel(status) {
  if (status === 'watching') return '\uD83D\uDC41\uFE0F A ver';
  if (status === 'attending') return '\u2705 Confirmado';
  return '';
}

function saveUserEvents() {
  try {
    localStorage.setItem('agora_userEvents', JSON.stringify(State.userEvents));
  } catch { /* storage full or unavailable */ }

  // Firebase sync (if authenticated)
  if (State.userId && State.firebaseReady) {
    firebase.database().ref('users/' + State.userId + '/events').set(State.userEvents);
  }
}

function loadUserEvents() {
  try {
    const stored = localStorage.getItem('agora_userEvents');
    if (stored) {
      State.userEvents = JSON.parse(stored);
    }
  } catch { /* corrupt data */ }
}

// ─── Agenda View ─────────────────────────────────────────────

function renderAgenda() {
  const userEventIds = Object.keys(State.userEvents);

  if (userEventIds.length === 0) {
    DOM.agendaContent.innerHTML =
      '<div class="agenda-empty">' +
        '<p style="font-size:32px;margin-bottom:12px">\uD83C\uDFAD</p>' +
        '<p>A tua agenda está vazia.</p>' +
        '<p style="color:var(--color-text-dim);font-size:13px;margin-top:4px">' +
          'Marca eventos como "A ver" ou "Confirmado" para os veres aqui.</p>' +
      '</div>';
    return;
  }

  // Get user's events, sorted by date
  const agendaEvents = State.events
    .filter(e => State.userEvents[e.id])
    .sort((a, b) => (a.dateStart || '').localeCompare(b.dateStart || ''));

  if (agendaEvents.length === 0) {
    DOM.agendaContent.innerHTML =
      '<div class="agenda-empty">' +
        '<p>Nenhum evento encontrado na tua agenda.</p>' +
      '</div>';
    return;
  }

  renderEventList(agendaEvents, 'A Minha Agenda');
}

function bindAgendaCardClicks() {
  DOM.agendaContent.querySelectorAll('.agenda-card').forEach(card => {
    card.addEventListener('click', function () {
      const event = State.events.find(e => e.id === this.dataset.eventId);
      if (event) openDetail(event);
    });
  });
}

// ─── View Switching ──────────────────────────────────────────

function switchView(view) {
  State.view = view;

  DOM.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'map') {
    $('#map').classList.remove('hidden');
    DOM.agendaView.classList.add('hidden');
    DOM.filterPanel.classList.remove('hidden');
    setTimeout(() => DOM.map.invalidateSize(), 100);
    renderMarkers();
  } else {
    $('#map').classList.add('hidden');
    DOM.agendaView.classList.remove('hidden');
    // Keep filter panel visible for agenda too
    renderAgenda();
  }
}

// ─── Tab Navigation ──────────────────────────────────────────

function initTabs() {
  DOM.tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      switchView(this.dataset.view);
    });
  });
}

// ─── Mobile Bottom Sheet ─────────────────────────────────────

function initMobileSheet() {
  if (!DOM.filterHandle) return;

  DOM.filterHandle.addEventListener('click', function () {
    DOM.filterPanel.classList.toggle('expanded');
  });

  // Close on outside tap (map area)
  document.getElementById('map').addEventListener('click', function () {
    DOM.filterPanel.classList.remove('expanded');
  });
}

// ─── Firebase Auth ───────────────────────────────────────────

function initFirebase() {
  // Check if config exists
  if (typeof window.__APP_CONFIG === 'undefined' || !window.__APP_CONFIG.firebase.apiKey) {
    return; // No Firebase config — run in offline/localStorage mode
  }

  const config = window.__APP_CONFIG.firebase;

  try {
    firebase.initializeApp(config);
    State.firebaseReady = true;

    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        State.userId = user.uid;
        // Load user events from Firebase
        firebase.database().ref('users/' + user.uid + '/events').once('value').then(function (snap) {
          if (snap.val()) {
            State.userEvents = snap.val();
            // Also update localStorage
            saveUserEvents();
            if (State.view === 'agenda') renderAgenda();
          }
        });
      } else {
        State.userId = null;
      }
    });
  } catch (err) {
    console.warn('Firebase init failed:', err);
  }
}

// ─── Data Loading ────────────────────────────────────────────

async function loadEvents() {
  try {
    const res = await fetch('data/events.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    State.events = await res.json();
    return true;
  } catch (err) {
    console.error('Failed to load events:', err);
    toast('Erro ao carregar eventos');
    State.events = [];
    return false;
  }
}

// ─── Utilities ───────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, ms) {
  let timer;
  return function () {
    clearTimeout(timer);
    const args = arguments;
    const ctx = this;
    timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
  };
}

function formatDateRange(start, end) {
  if (!start) return '';
  const s = formatDisplayDate(start);
  if (!end || end === start) return s;
  return s + ' – ' + formatDisplayDate(end);
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const parts = isoDate.split('-');
  const day = parseInt(parts[2], 10);
  const month = months[parseInt(parts[1], 10) - 1];
  const year = parts[0];
  const currentYear = new Date().getFullYear().toString();
  if (year === currentYear) return day + ' ' + month;
  return day + ' ' + month + ' ' + year;
}

function groupByDate(events) {
  const map = new Map();
  for (const e of events) {
    const date = e.dateStart || 'sem-data';
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(e);
  }
  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  DOM.toastContainer.appendChild(el);
  setTimeout(function () { el.remove(); }, 3000);
}

// ─── Settings Panel ──────────────────────────────────────────

function initSettings() {
  DOM.settingsBtn.addEventListener('click', openSettings);
  DOM.settingsClose.addEventListener('click', closeSettings);
  DOM.settingsBackdrop.addEventListener('click', closeSettings);

  DOM.weatherToggle.addEventListener('change', function () {
    State.weatherEnabled = this.checked;
    savePreferences();
    if (State.weatherEnabled) {
      fetchWeather();
    } else {
      DOM.weatherWidget.classList.add('hidden');
    }
  });

  // Load preferences
  loadPreferences();
}

function openSettings() {
  renderSourcesList();
  DOM.settingsPanel.classList.remove('hidden');
}

function closeSettings() {
  DOM.settingsPanel.classList.add('hidden');
}

function renderSourcesList() {
  // Known sources: combine what's in sources.json + hardcoded registry
  const SOURCE_REGISTRY = {
    agendalx: { name: 'Agenda Cultural de Lisboa', region: 'Lisboa' },
    culturaptgov: { name: 'Portal da Cultura', region: 'Nacional (governo)' },
  };

  let html = '';

  for (const [id, meta] of Object.entries(State.sources)) {
    const info = SOURCE_REGISTRY[id] || { name: id, region: '', url: '' };
    const isEnabled = !State.disabledSources[id];
    const statusOk = meta.lastError === null;
    const lastFetch = meta.lastFetchAt ? formatRelativeTime(meta.lastFetchAt) : 'nunca';

    html += '<div class="source-card">' +
      '<div class="source-card-header">' +
        '<div>' +
          '<div class="source-card-name">' + escapeHtml(info.name) + '</div>' +
          (info.region ? '<div style="font-size:11px;color:var(--color-text-dim)">' + escapeHtml(info.region) + '</div>' : '') +
        '</div>' +
        '<label class="toggle-row" style="width:auto">' +
          '<input type="checkbox" class="source-toggle" data-source="' + escapeHtml(id) + '"' +
            (isEnabled ? ' checked' : '') + '>' +
          '<span class="toggle-slider"></span>' +
        '</label>' +
      '</div>' +
      '<div class="source-card-meta">' +
        '<div>' +
          '<span class="source-status ' + (statusOk ? 'ok' : 'error') + '">' +
            (statusOk ? '\u25CF OK' : '\u25CF Erro') +
          '</span>' +
        '</div>' +
        '<div><span class="font-mono">' + (meta.lastEventCount || 0) + '</span> eventos</div>' +
        '<div>Atualizado: <span class="font-mono">' + escapeHtml(lastFetch) + '</span></div>' +
      '</div>' +
    '</div>';
  }

  if (!html) {
    html = '<div style="padding:20px;text-align:center;color:var(--color-text-dim)">Nenhuma fonte configurada</div>';
  }

  DOM.sourcesList.innerHTML = html;

  // Bind toggles
  DOM.sourcesList.querySelectorAll('.source-toggle').forEach(toggle => {
    toggle.addEventListener('change', function () {
      const sourceId = this.dataset.source;
      if (this.checked) {
        delete State.disabledSources[sourceId];
      } else {
        State.disabledSources[sourceId] = true;
      }
      savePreferences();
      applyFilters();
    });
  });
}

function savePreferences() {
  try {
    localStorage.setItem('agora_prefs', JSON.stringify({
      disabledSources: State.disabledSources,
      weatherEnabled: State.weatherEnabled,
    }));
  } catch { /* storage full */ }
}

function loadPreferences() {
  try {
    const stored = localStorage.getItem('agora_prefs');
    if (stored) {
      const prefs = JSON.parse(stored);
      State.disabledSources = prefs.disabledSources || {};
      State.weatherEnabled = prefs.weatherEnabled !== false;
    }
  } catch { /* corrupt */ }
  DOM.weatherToggle.checked = State.weatherEnabled;
}

async function loadSources() {
  try {
    const res = await fetch('data/sources.json');
    if (res.ok) {
      State.sources = await res.json();
    }
  } catch { /* offline */ }
}

function formatRelativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return mins + ' min';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h';
  const days = Math.floor(hours / 24);
  return days + 'd';
}

// ─── Weather (Open-Meteo) ────────────────────────────────────

const WEATHER_CODES = {
  0: { icon: '\u2600\uFE0F', desc: 'Céu limpo' },
  1: { icon: '\uD83C\uDF24\uFE0F', desc: 'Quase limpo' },
  2: { icon: '\u26C5', desc: 'Parcialmente nublado' },
  3: { icon: '\u2601\uFE0F', desc: 'Nublado' },
  45: { icon: '\uD83C\uDF2B\uFE0F', desc: 'Nevoeiro' },
  48: { icon: '\uD83C\uDF2B\uFE0F', desc: 'Nevoeiro gelado' },
  51: { icon: '\uD83C\uDF26\uFE0F', desc: 'Chuviscos' },
  53: { icon: '\uD83C\uDF26\uFE0F', desc: 'Chuviscos' },
  55: { icon: '\uD83C\uDF26\uFE0F', desc: 'Chuviscos fortes' },
  61: { icon: '\uD83C\uDF27\uFE0F', desc: 'Chuva fraca' },
  63: { icon: '\uD83C\uDF27\uFE0F', desc: 'Chuva' },
  65: { icon: '\uD83C\uDF27\uFE0F', desc: 'Chuva forte' },
  71: { icon: '\uD83C\uDF28\uFE0F', desc: 'Neve fraca' },
  73: { icon: '\uD83C\uDF28\uFE0F', desc: 'Neve' },
  75: { icon: '\uD83C\uDF28\uFE0F', desc: 'Neve forte' },
  80: { icon: '\uD83C\uDF26\uFE0F', desc: 'Aguaceiros' },
  81: { icon: '\uD83C\uDF27\uFE0F', desc: 'Aguaceiros' },
  82: { icon: '\u26C8\uFE0F', desc: 'Aguaceiros fortes' },
  95: { icon: '\u26C8\uFE0F', desc: 'Trovoada' },
  96: { icon: '\u26C8\uFE0F', desc: 'Trovoada com granizo' },
  99: { icon: '\u26C8\uFE0F', desc: 'Trovoada forte' },
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { icon: '\u2601\uFE0F', desc: 'Desconhecido' };
}

async function fetchWeather() {
  if (!State.weatherEnabled) return;

  // Get map center (or default to Lisboa)
  const center = DOM.map ? DOM.map.getCenter() : { lat: 38.72, lng: -9.14 };
  const lat = center.lat.toFixed(2);
  const lng = center.lng.toFixed(2);

  // Check cache
  const cacheKey = 'agora_weather_' + lat + '_' + lng;
  const cached = sessionStorage.getItem(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      if (Date.now() - data._fetchedAt < 30 * 60 * 1000) { // 30 min cache
        State.weather = data;
        renderWeatherWidget();
        return;
      }
    } catch { /* stale */ }
  }

  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat +
      '&longitude=' + lng +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=Europe%2FLisbon&forecast_days=7';

    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    data._fetchedAt = Date.now();
    State.weather = data;

    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* full */ }

    renderWeatherWidget();
  } catch (err) {
    console.warn('Weather fetch failed:', err);
  }
}

function renderWeatherWidget() {
  if (!State.weather || !State.weatherEnabled) {
    DOM.weatherWidget.classList.add('hidden');
    return;
  }

  const w = State.weather;
  const current = w.current;
  const info = getWeatherInfo(current.weather_code);
  const dayNames = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

  let html = '<div class="weather-current">' +
    '<span class="weather-icon">' + info.icon + '</span>' +
    '<div>' +
      '<div class="weather-temp">' + Math.round(current.temperature_2m) + '\u00B0</div>' +
      '<div class="weather-desc">' + escapeHtml(info.desc) + '</div>' +
    '</div>' +
  '</div>';

  html += '<div class="weather-details">' +
    '<span>\uD83C\uDF21\uFE0F ' + Math.round(current.apparent_temperature) + '\u00B0 sens.</span>' +
    '<span>\uD83D\uDCA7 ' + current.relative_humidity_2m + '%</span>' +
    '<span>\uD83D\uDCA8 ' + Math.round(current.wind_speed_10m) + ' km/h</span>' +
  '</div>';

  // 5-day forecast (skip today)
  html += '<div class="weather-forecast">';
  const daily = w.daily;
  for (let i = 1; i <= 5 && i < daily.time.length; i++) {
    const date = new Date(daily.time[i] + 'T12:00:00');
    const dayInfo = getWeatherInfo(daily.weather_code[i]);
    html += '<div class="weather-forecast-day">' +
      '<div class="day-name">' + dayNames[date.getDay()] + '</div>' +
      '<span class="day-icon">' + dayInfo.icon + '</span>' +
      '<div class="day-temp">' +
        '<span class="day-temp-max">' + Math.round(daily.temperature_2m_max[i]) + '\u00B0</span>' +
        ' <span>' + Math.round(daily.temperature_2m_min[i]) + '\u00B0</span>' +
      '</div>' +
    '</div>';
  }
  html += '</div>';

  DOM.weatherWidget.innerHTML = html;
  DOM.weatherWidget.classList.remove('hidden');
}

/**
 * Get weather forecast for a specific date (for event detail).
 * Returns { icon, desc, tempMax, tempMin, precipProb } or null if outside forecast range.
 */
function getWeatherForDate(isoDate) {
  if (!State.weather || !State.weather.daily) return null;
  const daily = State.weather.daily;
  const idx = daily.time.indexOf(isoDate);
  if (idx === -1) return null;

  return {
    icon: getWeatherInfo(daily.weather_code[idx]).icon,
    desc: getWeatherInfo(daily.weather_code[idx]).desc,
    tempMax: Math.round(daily.temperature_2m_max[idx]),
    tempMin: Math.round(daily.temperature_2m_min[idx]),
    precipProb: daily.precipitation_probability_max[idx],
  };
}

/**
 * Render weather section for event detail drawer.
 * Shows forecast for each day of the event that falls within the 7-day forecast.
 */
function renderDetailWeather(event) {
  if (!State.weather || !State.weather.daily || !event.dateStart) return '';

  const daily = State.weather.daily;
  const forecastDates = new Set(daily.time);

  // Collect event dates that overlap with forecast
  const start = event.dateStart;
  const end = event.dateEnd || start;
  const matches = [];

  // Iterate through forecast dates that overlap with event
  for (const date of daily.time) {
    if (date >= start && date <= end) {
      matches.push(date);
    }
  }

  if (matches.length === 0) return '';

  let html = '<div class="detail-weather">';
  html += '<div class="detail-weather-header">\u26C5 Previsão meteorológica</div>';

  for (const date of matches) {
    const w = getWeatherForDate(date);
    if (!w) continue;
    html += '<div class="detail-weather-row">' +
      '<span class="detail-weather-icon">' + w.icon + '</span>' +
      '<span class="detail-weather-date">' + formatDisplayDate(date) + '</span>' +
      '<span class="detail-weather-temps">' + w.tempMax + '\u00B0/' + w.tempMin + '\u00B0</span>' +
      '<span style="font-size:11px;color:var(--color-text-muted)">' +
        (w.precipProb > 0 ? '\uD83D\uDCA7 ' + w.precipProb + '%' : '') +
      '</span>' +
    '</div>';
  }

  html += '</div>';
  return html;
}

// ─── Init ────────────────────────────────────────────────────

async function init() {
  // Show loading
  const mapEl = document.getElementById('map');
  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = '<div class="loading-spinner"></div>';
  mapEl.appendChild(loader);

  // Init map
  initMap();

  // Load data
  loadUserEvents();
  await Promise.all([loadEvents(), loadSources()]);

  // Init UI
  initFilters();
  initTabs();
  initMobileSheet();
  initSettings();
  initFirebase();

  // Apply initial filters
  applyFilters();

  // Fetch weather (non-blocking)
  fetchWeather();

  // Detail drawer close
  DOM.detailClose.addEventListener('click', closeDetail);

  // Close detail on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDetail();
  });

  // Remove loader
  loader.classList.add('fade-out');
  setTimeout(function () { loader.remove(); }, 300);
}

// Boot
document.addEventListener('DOMContentLoaded', init);
