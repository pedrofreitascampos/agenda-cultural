# Agora Roadmap

Project-specific backlog for the Agora Lisbon cultural agenda app.

Convention (defined in `~/projects/ai/companion/docs/architecture.md`):
- **Top-level** (this file) — Agora-specific concerns
- **Personal life** — `~/.claude/personal/roadmap.md` (gitignored, never in repo)

## Open

### Pipeline source abstraction — international + sports

Drive: `/admin-plan-holiday` skill (companion repo) reads Agora's `data/events.json` for PT destinations as a first-class itinerary input. For non-PT trips the skill falls back to ad-hoc per-city sources (Eventbrite, Songkick, Time Out city sites). Worth extending Agora's `pipeline/sources/` to cover that fragmented surface so the skill (and future "events anywhere" use cases) have one source of truth.

- [ ] **Eventbrite international source.** Per-city queries via the Eventbrite public events API. Schema: `city` filter + `category` mapping into Agora's existing taxonomy. Rate-limit + cache locally.
- [ ] **Songkick concerts source.** Music-only, but covers every major venue worldwide. Per-city queries via the Songkick API.
- [ ] **Time Out per-city scraper.** Adapter pattern matching the existing AgendaLx module. Start with Lisbon (already partially covered) → Tokyo → London → Paris → NYC.
- [ ] **Sports fixtures source.** Football league fixture lists (Liga Portugal, Premier League, La Liga, Bundesliga, Ligue 1, Serie A) + F1 + ATP/WTA. Adapter per league/series. Lower priority than the cultural sources.
- [ ] **Multi-city `data/events.json`.** Today the JSON is implicitly Lisbon-only. Add a `city` field per event and let the pipeline emit one file per city (or one combined file with city index) so the planner skill can do `filter(events, e => e.city === destination)`.



### Curated newsletter → Agora (companion integration)

Editorial agenda newsletters (Lisboa Secreta, Time Out Lisboa, Pumpkin overlap, Culturgest, Fábrica Braço de Prata, …) have great curation but **no clean feed** — events live in prose. Decision (2026-06-19): extract them **companion-side** during `/companion-email` (an LLM already reads those newsletters), NOT via NLP/offline-model in Agora's CI.

- [x] **Agora side** — `sources/newsletter.js` drop-file source (done, see Recently done).
- [ ] **Companion side** — add a step to the `companion-email` skill: extract events from the `newsletters - agenda` Gmail label → resolve Mailchimp tracking links to real https URLs → write `data/curated-newsletter.json` → **commit + push to the agenda-cultural repo** (chosen hand-off: fully automated, behind a commit/review gate) so the next `pipeline.yml` CI run ingests them.
- [ ] **Guardrails** — surface-only confirm gate (propose, don't auto-push); only emit events with a parseable ISO date + a venue (so they geocode onto the map); skip editorial guides; tag `source:newsletter` + `curado` for reversibility.

### PT source scouting (2026-06-19)

Ranked candidates from a web sweep + the `newsletters - agenda` Gmail label. Probe `/wp-json/wp/v2/mec-events` (Modern Events Calendar) and `/wp-json/tribe/events/v1/events` (The Events Calendar) on WP candidates — that's the AgendaLx-grade structured-feed pattern.

- [ ] **Ticketmaster Discovery API** — free JSON, the only source with reliable geo-coords + ticket URLs. Easy (~1 day). **Build first.**
- [ ] **Agenda Cultural do Porto** — `wp-json/wp/v2/mec-events` confirmed live; structured. Medium.
- [ ] **Cartaz Cultural de Lisboa** — `wp-json/wp/v2/posts` live; nightlife/stand-up/cinema. Medium (HTML parse for date/venue).
- [ ] **MEO/Altice Arena** — clean HTML `/agenda`, unique big-venue inventory. Easy-Medium.
- [ ] **Dezanove** — `/feed` RSS, zero-overlap LGBTQ+ niche. Medium.
- [ ] **AML – Lisboa Metro** — `aml.pt/agenda` wp-json live (posts only); extends to Cascais/Sintra/Oeiras/Almada. Medium.
- [ ] **NoCartaz** — press claims open JSON API, 8,800+ events nationwide; `/api/events` 404'd, needs XHR inspection. Highest leverage IF endpoint found.
- [ ] **Ticketline** — `/agenda/YYYY/MM`, broad inventory; bot-hostile robots.txt. Medium-Hard.
- Skip: dados.cm-lisboa (= AgendaLx), Fnac/Worten (= BOL), Lisboa Secreta direct (= Fever front-end → use newsletter route). Partnership-only (defer): Viral Agenda, Fever, Whatsupintown.

### P0 — Unblocker

Most feature work below depends on Firebase being live. Tackle this first.

- [ ] **Firebase project setup** — create project, enable Google Auth + RTDB, add `pedrofreitascampos.github.io` to authorized domains, fill `config.prod.js` with real credentials, push. Mostly console clicks, not code.
- [ ] **Firebase Security Rules** — see [M-1] below; same task viewed from the security angle.

### P1 — Quick wins (small, standalone)

- [ ] **Emoji in Google Calendar export** — prepend a category emoji (🎭 🎵 🎨…) to event title when adding via the gcal button. ~10 LoC.
- [ ] **More frequent pipeline runs** — bump GitHub Actions cron from daily to every few hours. One-line workflow change; pair with delta fetching (P2) before going aggressive.
- [ ] **Geocode button** in event detail — manually trigger Nominatim geocoding from the browser when an event has no coordinates.
- [ ] **Mobile weather tab** — promote the existing desktop weather overlay to a dedicated tab on mobile.
- [ ] **.ics file import** — upload a .ics from any calendar app and merge into My Agenda. No backend dep.

### P2 — Core feature work

- [ ] **In-app custom event form** — UI to create one-off custom events (current "custom events" feature is recurring-only).
- [ ] **In-app Google Calendar import** — Settings button to re-import from the user's Google Calendar (replaces/augments the one-shot `scripts/import-gcal.js`). Needs Google OAuth scope on the existing Firebase sign-in.
- [ ] **Incremental / delta fetching** in the pipeline — only fetch new/changed events rather than full refetch. Refactor across all 7 source modules; unlocks aggressive cron frequency.
- [ ] **More data sources** — onboard new ones (dados.gov.pt, iPorto, individual venue sites). Additive, one source module each.
- [ ] **More manual venue coordinates** — ~238 Nominatim misses remain after the existing 60 overrides cover 296/534.

### P3 — Depends on Firebase being live

- [ ] **Custom events with sharing** — "shared with others" flag publishing to a Firebase shared node visible to all users. Needs `sharedEvents` security rules.
- [ ] **Email alerts** — configurable "remind me X days before" via email. Needs Firebase Cloud Functions or similar backend.
- [ ] **Curated annual events layer** — turn the 149-event "Agenda Cultural" personal Google Calendar into a proper pipeline source that re-imports annually. *Distinct* from the per-user in-app gcal import (P2).
- [ ] **Recurring event year sync** — refresh/carry forward recurring annual events into the new year.

### Security (audit 2026-05-30)

11 findings total. Zero committed secrets, no RCE vectors. Main risk surface is stored XSS via scraped external event data.

#### HIGH

- [ ] **[H-1] Open redirect + stored XSS via unvalidated `sourceUrl` in `<a href>`.** `app.js:653` — `<a href="' + escapeHtml(event.sourceUrl) + '">`. `sourceUrl` comes from scraped sources (AgendaLx, Eventbrite, etc.) OR user input (`#ef-url` custom-event field). `javascript:alert(1)` survives `escapeHtml` (encodes characters, not schemes). Fix: validate scheme allowlist (`https:`, `http:`) before rendering; validate in `saveCustomEvents()` before persisting.
- [ ] **[H-2] Inline `onclick` attribute with user-controlled `event.id` interpolation.** `app.js:644-645`. Single-quote escaping is incomplete (`replace(/'/g, "\\'")` misses backtick / `)`). Fragile pattern. Fix: eliminate the inline `onclick`; use `data-*` attribute + `addEventListener` like the rest of the file.

#### MEDIUM

- [ ] **[M-1] Firebase RTDB Security Rules not in repo — write access scope unconfirmed.** Path `users/{uid}/events` + `users/{uid}/customEvents`. Client uses `State.userId` from Firebase Auth but no server-side enforcement is visible. Fix: confirm rules contain `".write": "auth != null && auth.uid === $uid"`; restrict `sharedEvents` writes to owner.
- [ ] **[M-2] No SRI on Firebase SDK scripts.** `index.html:26-28`. Leaflet has SRI, the 3 Firebase scripts don't. Fix: add `integrity="sha384-..."` + `crossorigin="anonymous"` to all 3 Firebase tags.
- [ ] **[M-3] MarkerCluster CSS links missing SRI.** `index.html:16-17`. CSS injection can exfiltrate via attribute selectors. Fix: add SRI hashes to both CSS links.
- [ ] **[M-4] No CSP header.** No `<meta http-equiv>` in `index.html`; no `_headers` file in repo. Fix: add CSP meta with `default-src 'self'`, scoped `script-src` / `connect-src` for unpkg/gstatic/googleapis/firebaseio/nominatim/open-meteo.
- [ ] **[M-5] `allowedEmails` allowlist is client-side only.** `app.js:1298-1302`. Window between sign-in and signOut allows a valid Firebase token. Anyone can hit the RTDB REST API directly with a Google token from a non-allowlisted account. Fix: move access restriction to Firebase Security Rules (`auth.token.email_verified == true && root.child('allowedUsers').child(...).exists()`).

#### LOW

- [ ] **[L-1] `data/gcal-raw.json` is gitignored but present on disk (~182 KB).** May contain personal event descriptions, attendee emails, private URLs. Fix: confirm contents are non-sensitive; add a pre-commit guard that fails on stage.
- [ ] **[L-2] `config.prod.js` empty values — no runtime guard.** Empty Firebase config silently fails. Fix: add an assertion in `initFirebase()` that checks `__APP_CONFIG.firebase.projectId` is non-empty before `firebase.initializeApp(...)`.
- [ ] **[L-3] `data/venue-cache.json` + `venue-overrides.json` are committed and grow over time.** No PII risk currently, but no max-size guard. Fix: periodic audit; consider a size cap in `saveCache()`.
- [ ] **[L-4] Pipeline has no `package.json` / lockfile.** Currently zero external deps (uses only Node built-ins + native `fetch`). If a dep is ever added, no automated audit path. Fix: add a minimal `pipeline/package.json` with `"dependencies": {}` as a foundation; CI step for `npm audit`.

## Recently done

- 2026-06-19 — **Pumpkin.pt source** (`sources/pumpkin.js`) — kids/family events, HTML scrape of `/eventos/?onde=lisboa`, paginated, English-month-abbrev date shim, 17 tests. ~125 events/run. Fills the family category gap.
- 2026-06-19 — **Curated-newsletter source contract** (`sources/newsletter.js`) — reads a local `data/curated-newsletter.json` drop-file (no scrape); validates URL scheme (closes part of [H-1]); routes through normal geocode/dedup/merge. The companion side (extraction + commit) is tracked under "Curated newsletter → Agora" below.
- 2026-05-21 — EGEAC + Porto scraper rewrites with tests (commit `f1fdd12`).
