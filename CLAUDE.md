# Agora — Cultural Events Map for Portugal

## Codename: Agora

## Stack
- **Frontend**: Vanilla JS (zero-build), Leaflet 1.9.4, Firebase Auth + RTDB
- **Data pipeline**: Node.js scripts run by GitHub Actions daily cron
- **Deployment**: GitHub Pages (static)
- **Tests**: Zero-dependency custom test runner (Node.js)

## Project Structure
- `app.js` — frontend: map, filters, UI, state management
- `styles.css` — design system (CSS variables), responsive layout
- `pipeline/` — Node.js data pipeline (fetch, normalize, merge, geocode)
- `pipeline/sources/` — one module per data source (agendalx.js, etc.)
- `data/events.json` — normalized events (committed by GitHub Actions)
- `tests/` — test runner + test files

## Conventions
- No build tool. All browser code loaded via `<script>` tags from CDN or local files.
- Global `State` object for frontend state (same pattern as Bifrost).
- Pipeline uses structured JSON logging (`pipeline/log.js`).
- Events normalized to common schema (see `pipeline/normalize.js`).
- Source modules export `{ id, name, enabled, CATEGORY_MAP, fetch(), normalize() }`.
- Test files export arrays of `{ name, fn }` objects.

## Data Sources
- **AgendaLx** (primary): `https://www.agendalx.pt/wp-json/agendalx/v1/events` — no auth required
- Future: dados.gov.pt, iPorto, Eventbrite

## Key Commands
- `node tests/run.js` — run all tests
- `node pipeline/fetch.js` — fetch events from all sources, write data/events.json
