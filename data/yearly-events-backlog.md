# Portugal — Yearly Recurring Events Backlog

Source: Pedro's "Agenda Cultural" Google Calendar (curated recurring PT festivals, romarias, feiras, motor/air shows, medieval fairs, etc.) via `~/projects/agenda-cultural/data/gcal-raw.json`. Extracted 2026-07-02. **Remaining-2026 dates (Jul–Dec) re-verified online 2026-07-02** — most events were added in 2024 and had drifted since; see the "Verified?" column. **Corrections applied directly to the live Google Calendar on 2026-08-31** (67 events + 1 rename/re-date). Jan–Jun 2026 events were not re-verified this pass (already passed for the year) — treat those as baseline-only until next refresh.

**⚠️ Dates still drift year to year** (moveable feasts, harvest timing, organizer scheduling, weather cancellations). Before locking a plan around any event — even a "high confidence" one below — WebSearch `"{event name}" {year}` to reconfirm for the actual year in play. "Verified" here means checked as of 2026-07-02 for the **2026** edition specifically; it will go stale again for 2027+.

**Correction, not removal:** "Tribeca Film Festival" turned out to be a genuine Portuguese event — **Tribeca Festival Lisboa**, an officially licensed European edition (Tribeca Enterprises + SIC + Lisbon City Council, partnership through 2028), NOT the NYC festival. Renamed and re-dated to its actual 2026 slot (Dec 10–13, 3rd edition/25th-anniversary special, Avenida da Liberdade) rather than deleted — an earlier pass in this file wrongly concluded it was a mistake and flagged it for deletion; that was wrong, corrected 2026-08-31.

**Flags worth knowing:**
- 🔴 **Festival de Gastronomia Maranho** (Sertã) — cancelled for 2026 (storm Kristin damage). Left untouched in the calendar at Pedro's request (2026-08-31).
- 🔴 **Rally de Lisboa** — moved to late May in the national rally calendar; **already happened** this year (not autumn as baseline suggested). Calendar corrected anyway for hygiene.
- 🟡 **Portugal Air Summit** (Ponte de Sor) — conflicting signals; may be paused/cancelled for 2026, unconfirmed. Left untouched in the calendar.
- 🟡 **MotoGP Portugal** — moved 2 weeks later than baseline (Nov 20–22, not Nov 7–10).
- 🟡 **Festas do Pescador (Sept edition)** — the live calendar entry (Sept 4–6) didn't match either the original scrape baseline (Sept 6–9) or the re-verified date (Sept 6–8) closely enough to safely auto-correct; left untouched, flag if attending.
- 🟡 **Festival Jardins do Marquês** — only one live calendar entry exists (🎵, corrected to Jun 26–Jul 6); the 🎭 variant from the original scrape has no matching live event (likely already merged/cleaned) — nothing to fix there.

**Companion file:** `yearly-events-backlog.json` (same directory) — same data, machine-readable. Each object: `start`/`end` (2024-baseline), `title`, `location`, `region`, `source`, and — where re-verified — `verified_2026_start`/`verified_2026_end`/`verify_confidence`/`verify_note`/`applied_to_gcal`.

## How to use this

- **Single-trip planning (`/companion-holiday` §3e Events at destination):** when the candidate is anywhere in Portugal, cross-check this list against the travel window + destination region before falling back to general WebSearch — this is curated, not scraped noise. Flag any event whose date range overlaps the trip window AND whose region/location is within reasonable reach of the base. Prefer the verified date over baseline where both exist.
- **Yearly portfolio planning (`/companion-holiday-year`):** when proposing slot windows or destinations, check whether a big/medium slot lands near a marquee event in this list and surface it as a scheduling consideration.
- **Always re-verify for the actual planning year** — even "verified" entries here are frozen as of 2026-07-02 for the 2026 edition. See the warning above.

## Index by region

- **Alentejo** (15): Beja Air Show ✈️, Enterro do Ano Velho 🎆, Feira Medieval de Belver 🗡️, Feira da Castanha de Marvão 🌰, Feira da Foda 🐄, Feira do Queijo do Alentejo 🧀, Feira do Tapete de Arraiolos 🎆, Festa Gastronomia e Artesanato 🍲, Festas São Mateus 🎆, Festival Fora da Casca 🍲, Festival Internacional Balões de Ar Quente 🎈, Festival Músicas do Mundo 🎵, O Tapete Está Na Rua 🎆, Portugal Air Summit ✈️, Rally Raid Grândola 🏎️
- **Algarve** (10): Algarve Classics Festival 🏎️, Charolas de Bordeira 🎆, Feira da Castanha de Marmelete 🌰, Feira de São Martinho de Portimão 🎆, Festa da Mãe Soberana 📿, Festa das Chouriças 🍖, Festas do Pescador 🐟, Magusto de Alferce 🌰, MotoGP Portugal 🏍️
- **Centro** (39): Aldeia Fundeira 🎆, Cabeça Aldeia Natal 🎄, Capeia Arraiana 🎆, Caramulo Motorfestival 🏎️, Carnaval da Linhaceira 👹, Carnaval das Cabanas de Viriato 👹, Corrida do Entrudo👹, Dia dos Idades 🎆, Equinócio Primavera Pedra da Cabeleira 🔭, Feira Raiana 🍲, Feira de Antiguidades Caldas, Feira de Leiria 🎉, Feira de Sabores do Tejo 🍲, Feira de São Mateus 🎆, Feira do Mel e da Castanha 🌰🍯, Festa Templária 🗡️, Festa das Luzes 🕎, Festa de Nossa Senhora da Esperança 📿, Festas das Varas do Fumeiro 🍖, Festas de São Gonçalinho 🎆, Festiva de Ópera de Óbidos 🎵, Festival Bons Sons 🎵, Festival Internacional do Chocolate🍫, Festival Medieval de Óbidos 🗡️, Festival de Gastronomia Maranho 🍲, Fête de la Musique à Peniche 🎵, Hardmetalfest Mangualde🎶, Leiria Sobre Rodas 🚗, Madeiro de Natal de Penamocor 🎄, Magusto da Velha 🌰, Mostra de Artes e Sabores da Maúnça 🍲, PalhaçArte 🤡, Passeio dos Ingleses ACP 🚗, Procissão da Aleluia 📿, Provart 🎭, Queima das Fitas 👨‍🎓, Romaria dos Santos Mártires de Marrocos 📿, Semana da Chanfana 🍲
- **Lisboa e Vale do Tejo** (45): Almada Extreme Sprint 🏎️, Amadora BD 🎨, Arraial de Alvalade 🎆, Carnaval de Torres 👹, Cortejo Etnográfico 🎆, Dias da Idade Média 🗡️, Doc Lisboa 🎞️, ECar Show 🚗, Estoril Classics 🏎️, Estoril Endurance Festival 🏁, Estoril Experience Day 🏁, Estoril Summer Fest 🏎️, Feira Nacional de Agricultura 🐄, Feira Nacional do Cavalo 🐎, Feira Rural de Torres Vedras 🐄, Festa Nossa Senhora da Apresentação 📿, Festa da Criança 🧒, Festa da Nossa Senhora da Nazaré 📿, Festa das Vindimas (Palmela) 🍇, Festa do Animal 🐶, Festa do Avante ☭, Festa do Colete Encarnado 🐂, Festa do Leitão e do Espumante 🍲, Festa do Vinho 🍷, Festas das Vindimas 🍇, Festas do Mar 🐟, Festas em Honra de Nossa Senhora da Guia 📿, Festival Internacional Cavalo Lusitano 🐎, Festival Jardins do Marquês 🎭, Festival Jardins do Marquês 🎵, Festival Vapor 🎶, Festival da Sapateira 🦀, Festival da Sopa da Pedra 🍲, Festival de Sintra 🎶, LISB-ON 🎶, Lisboa Games Week 🕹️, MEO Kalorama 🎶, Mercado Caramelo 🍲, Motorclássico de Lisboa 🚗, Nauticampo 🛥️, Oeiras Air Show ✈️, Rally de Lisboa 🏎️, Rally de Portugal Histórico 🏎️, Tribeca Festival Lisboa 🎞️, WSL Ericeira 🏄
- **Norte** (36): Artbeerfest 🍺, Autoclássico 🚗, Banhos Santos 📿, Entrudo Chocalheiro👹, Entrudo de Lazarim 👹, Feira de São Martinho em Penafiel 🎆, Feira do Vinho Verde, do Lavrador, Gastronomia e Artesanato 🍷, Feira dos Petiscos 🍲, Feiras Novas 🎆, Festa da Cabra e do Canhoto👹, Festa da História 🗡️, Festa da Nossa Senhora dos Remédios 📿, Festa das Cruzes 📿, Festa das Papas 🍲, Festa das Vindimas (Douro e Alentejo) 🍇, Festa do Alvarinho e do Fumeiro 🍖, Festa do Caldo de Quintadona 🍲, Festa do Pito 🍰, Festa dos Povos 🎆, Festa dos Rapazes / Caretos de Ousilhão 🎄, Festa dos Rapazes / Caretos de Varge 🎄, Festas Nicolinas 🎆, Festas da Agonia 📿, Festas de São João de Valeta 🎆, Festival das Camélias 🌺, Fumeiro de Montalegre 🍖, Magic Valongo 🔮, Natal do Bananeiro 🍌, Noite São João (Braga) 🎆, Noite São João (Porto) 🎆, Rally de Portugal 🏎️, Romaria de Santa Marta 📿, Rural Castanea 🌰, SWR Barroselas Metalfest 🎶, Semana Santa de Braga 📿, Viagem Medieval Em Terra de Santa Maria 🗡️

---

## January

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Charolas de Bordeira 🎆 | Algarve | Bordeira, 8005 Faro | 2026-01-01 → 2026-01-07 | not re-verified this pass (baseline only) |
| Festas de São Gonçalinho 🎆 | Centro | Aveiro | 2026-01-09 → 2026-01-13 | not re-verified this pass (baseline only) |
| Semana da Chanfana 🍲 | Centro | Vila Nova de Poiares, 3350 Vila Nova de Poiares | 2026-01-10 → 2026-01-21 | not re-verified this pass (baseline only) |
| Hardmetalfest Mangualde🎶 | Centro | Mangualde, 3530 Mangualde | 2026-01-11 → 2026-01-13 | not re-verified this pass (baseline only) |
| Festa das Chouriças 🍖 | Algarve | Querença, 8100 Querença | 2026-01-18 → 2026-01-20 | not re-verified this pass (baseline only) |
| Romaria dos Santos Mártires de Marrocos 📿 | Centro | Largo Santos Mártires, 3750 Travassô | 2026-01-18 → 2026-01-20 | not re-verified this pass (baseline only) |
| Festa das Papas 🍲 | Norte | Samão, 4860 Cabeceiras de Basto | 2026-01-20 → 2026-01-21 | not re-verified this pass (baseline only) |
| Fumeiro de Montalegre 🍖 | Norte | Montalegre, 5470 Montalegre | 2026-01-23 → 2026-01-27 | not re-verified this pass (baseline only) |
| Passeio dos Ingleses ACP 🚗 | Centro | Aranhas, 6090 Aranhas | 2026-01-24 → 2026-01-25 | not re-verified this pass (baseline only) |
| Festas das Varas do Fumeiro 🍖 | Centro | Aranhas, 6090 Aranhas | 2026-01-24 → 2026-01-27 | not re-verified this pass (baseline only) |

## February

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Feira do Queijo do Alentejo 🧀 | Alentejo | Parque de Feiras e Exposições, Circular Interna de Serpa | 2026-02-21 → 2026-02-24 | not re-verified this pass (baseline only) |
| Carnaval de Torres 👹 | Lisboa e Vale do Tejo | Torres Vedras, 2560 Torres Vedras | 2026-02-28 → 2026-03-06 | not re-verified this pass (baseline only) |

## March

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Entrudo de Lazarim 👹 | Norte | Lazarim, 2815 Sobreda | 2026-03-01 → 2026-03-05 | not re-verified this pass (baseline only) |
| Entrudo Chocalheiro👹 | Norte | Podence, 5340 Macedo de Cavaleiros | 2026-03-01 → 2026-03-05 | not re-verified this pass (baseline only) |
| Carnaval das Cabanas de Viriato 👹 | Centro | Cabanas de Viriato, 3430 Cabanas de Viriato | 2026-03-01 → 2026-03-05 | not re-verified this pass (baseline only) |
| Carnaval da Linhaceira 👹 | Centro | Tomar, 2300 Tomar | 2026-03-01 → 2026-03-05 | not re-verified this pass (baseline only) |
| Corrida do Entrudo👹 | Centro | Aigra Nova, 3330-222 Góis | 2026-03-02 → 2026-03-03 | not re-verified this pass (baseline only) |
| Festa do Leitão e do Espumante 🍲 | Lisboa e Vale do Tejo | Praça Beato, Tv. Grilo 1 | 2026-03-07 → 2026-03-08 | not re-verified this pass (baseline only) |
| Feira da Foda 🐄 | Alentejo | Pias, 4950 Pias | 2026-03-14 → 2026-03-17 | not re-verified this pass (baseline only) |
| Festival das Camélias 🌺 | Norte | Praça das Pocinhas, 4620-657 Lousada | 2026-03-14 → 2026-03-17 | not re-verified this pass (baseline only) |
| Motorclássico de Lisboa 🚗 | Lisboa e Vale do Tejo | Cordoaria Nacional, Av. da Índia | 2026-03-20 → 2026-03-23 | not re-verified this pass (baseline only) |
| Equinócio Primavera Pedra da Cabeleira 🔭 | Centro | Pedra da Cabeleira, Chãs | 2026-03-20 → 2026-03-21 | not re-verified this pass (baseline only) |
| Festa Inês | Unclear (no location given — likely small local event) | — | 2026-03-20 → 2026-03-20 | not re-verified this pass (baseline only) |
| Festival Internacional do Chocolate🍫 | Centro | Óbidos, 2510 Óbidos | 2026-03-21 → 2026-04-07 | not re-verified this pass (baseline only) |
| Nauticampo 🛥️ | Lisboa e Vale do Tejo | Feira Internacional de Lisboa, R. do Bojador | 2026-03-26 → 2026-03-31 | not re-verified this pass (baseline only) |

## April

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Rally Raid Grândola 🏎️ | Alentejo | Grândola, 7570 Grândola | 2026-04-02 → 2026-04-08 | not re-verified this pass (baseline only) |
| Feira Rural de Torres Vedras 🐄 | Lisboa e Vale do Tejo | Torres Vedras, 2560 Torres Vedras | 2026-04-06 → 2026-04-07 | not re-verified this pass (baseline only) |
| Semana Santa de Braga 📿 | Norte | Braga | 2026-04-13 → 2026-04-21 | not re-verified this pass (baseline only) |
| Procissão da Aleluia 📿 | Centro | Cem Soldos, 2305 Cem Soldos | 2026-04-20 → 2026-04-21 | not re-verified this pass (baseline only) |
| SWR Barroselas Metalfest 🎶 | Norte | Barroselas, 4905 Barroselas | 2026-04-23 → 2026-04-27 | not re-verified this pass (baseline only) |
| Festa de Nossa Senhora da Esperança 📿 | Centro | Belmonte, 6250 Belmonte | 2026-04-23 → 2026-04-27 | not re-verified this pass (baseline only) |
| Festa do Alvarinho e do Fumeiro 🍖 | Norte | Melgaço, 4960 Melgaço | 2026-04-25 → 2026-04-28 | not re-verified this pass (baseline only) |
| Festa do Vinho 🍷 | Lisboa e Vale do Tejo | Cartaxo, 2070 Cartaxo | 2026-04-25 → 2026-05-01 | not re-verified this pass (baseline only) |
| Festa das Cruzes 📿 | Norte | Barcelos, 4750 Barcelos | 2026-04-29 → 2026-05-04 | not re-verified this pass (baseline only) |

## May

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Feira de Leiria 🎉 | Centro | Leiria | 2026-05-01 → 2026-06-02 | not re-verified this pass (baseline only) |
| Festa da Mãe Soberana 📿 | Algarve | Loulé, 8100 Loulé | 2026-05-04 → 2026-05-05 | not re-verified this pass (baseline only) |
| Mercado Caramelo 🍲 | Lisboa e Vale do Tejo | Pinhal Novo, 2955 Pinhal Novo | 2026-05-10 → 2026-05-13 | not re-verified this pass (baseline only) |
| Rally de Portugal 🏎️ | Norte | Lousada, 4620 Lousada | 2026-05-15 → 2026-05-19 | not re-verified this pass (baseline only) |
| ECar Show 🚗 | Lisboa e Vale do Tejo | Feira Internacional de Lisboa, R. do Bojador | 2026-05-23 → 2026-05-26 | not re-verified this pass (baseline only) |
| Queima das Fitas 👨‍🎓 | Centro | Coimbra | 2026-05-23 → 2026-05-31 | not re-verified this pass (baseline only) |
| Almada Extreme Sprint 🏎️ | Lisboa e Vale do Tejo | Old Lisnave Shipyards, Margueira | 2026-05-24 → 2026-05-26 | not re-verified this pass (baseline only) |
| PalhaçArte 🤡 | Centro | Rio Maior, 2040 Rio Maior | 2026-05-28 → 2026-06-03 | not re-verified this pass (baseline only) |
| Rally de Lisboa 🏎️ | Lisboa e Vale do Tejo | Lisbon | 2026-05-29 → 2026-05-30 | ✅ high — FPAK 2026 calendar moved it to late May -- ALREADY OCCURRED this year · applied to calendar 2026-08-31 |

## June

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Beja Air Show ✈️ | Alentejo | Beja, 7800 Beja | 2026-06-01 → 2026-06-03 | not re-verified this pass (baseline only) |
| O Tapete Está Na Rua 🎆 | Alentejo | Arraiolos, 7040 Arraiolos | 2026-06-01 → 2026-06-10 | not re-verified this pass (baseline only) |
| Festas do Pescador 🐟 | Algarve | Albufeira, 8200 Albufeira | 2026-06-05 → 2026-06-08 | not re-verified this pass (baseline only) |
| Feira Nacional de Agricultura 🐄 | Lisboa e Vale do Tejo | CNEMA - National Exhibition Center and Agricultural Markets, Quinta das Cegonhas | 2026-06-08 → 2026-06-17 | not re-verified this pass (baseline only) |
| Festa Gastronomia e Artesanato 🍲 | Alentejo | Vila Viçosa, 7160 Vila Viçosa | 2026-06-09 → 2026-06-10 | not re-verified this pass (baseline only) |
| Festival de Sintra 🎶 | Lisboa e Vale do Tejo | Sintra, 2710 Sintra | 2026-06-12 → 2026-06-23 | not re-verified this pass (baseline only) |
| Arraial de Alvalade 🎆 | Lisboa e Vale do Tejo | Alvalade, 1700-238 Lisboa | 2026-06-12 → 2026-06-17 | not re-verified this pass (baseline only) |
| Feira Medieval de Belver 🗡️ | Alentejo | Belver, 6040 Belver | 2026-06-14 → 2026-06-17 | not re-verified this pass (baseline only) |
| Rally de Portugal Histórico 🏎️ | Lisboa e Vale do Tejo | Sintra, 2710 Sintra | 2026-06-17 → 2026-06-22 | not re-verified this pass (baseline only) |
| Provart 🎭 | Centro | Sertã, 6100 Sertã | 2026-06-20 → 2026-06-24 | not re-verified this pass (baseline only) |
| Fête de la Musique à Peniche 🎵 | Centro | Peniche, 2520 Peniche | 2026-06-21 → 2026-06-22 | not re-verified this pass (baseline only) |
| Festas de São João de Valeta 🎆 | Norte | Arcos de Valdevez, 4970 Arcos de Valdevez | 2026-06-22 → 2026-06-25 | not re-verified this pass (baseline only) |
| Noite São João (Braga) 🎆 | Norte | Braga | 2026-06-23 → 2026-06-24 | not re-verified this pass (baseline only) |
| Noite São João (Porto) 🎆 | Norte | Porto | 2026-06-23 → 2026-06-24 | not re-verified this pass (baseline only) |
| Festival Jardins do Marquês 🎵 | Lisboa e Vale do Tejo | Jardins do Palácio Marquês de Pombal, Palácio do Marquês Pombal | 2026-06-26 → 2026-07-06 | ✅ high — Official Oeiras dates; single unified festival period (music+theatre merged) · applied to calendar 2026-08-31 |
| Festival Jardins do Marquês 🎭 | Lisboa e Vale do Tejo | Jardins do Palácio Marquês de Pombal, Palácio do Marquês Pombal | 2026-06-26 → 2026-07-06 | ✅ high — Official Oeiras dates; single unified festival period (music+theatre merged) |
| Festival Internacional Cavalo Lusitano 🐎 | Lisboa e Vale do Tejo | Hipódromo Manuel Possolo, Av. da República 371 | 2026-06-28 → 2026-07-01 | not re-verified this pass (baseline only) |
| LISB-ON 🎶 | Lisboa e Vale do Tejo | Alameda Keil do Amaral, Lisboa | 2026-06-28 → 2026-07-01 | not re-verified this pass (baseline only) |
| Feira de Sabores do Tejo 🍲 | Centro | Vila Velha de Ródão, 6030 Vila Velha de Ródão | 2026-06-28 → 2026-07-01 | not re-verified this pass (baseline only) |

## July

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Feira do Vinho Verde, do Lavrador, Gastronomia e Artesanato 🍷 | Norte | Castelo de Paiva, 4550 Castelo de Paiva | 2026-07-03 → 2026-07-05 | ✅ high — 27th edition, 3 days, per Castelo de Paiva municipality · applied to calendar 2026-08-31 |
| Festival Fora da Casca 🍲 | Alentejo | Castle of Alandroal, 7250-116 Alandroal | 2026-07-03 → 2026-07-05 | ✅ high — Held at Alandroal Castle, confirmed by local press · applied to calendar 2026-08-31 |
| Festa do Colete Encarnado 🐂 | Lisboa e Vale do Tejo | Vila Franca de Xira, 2600 Vila Franca de Xira | 2026-07-03 → 2026-07-05 | ✅ high — 94th edition, per official site · applied to calendar 2026-08-31 |
| Artbeerfest 🍺 | Norte | Caminha, 4910 Caminha | 2026-07-09 → 2026-07-12 | ✅ high — 13th edition, 4-day craft beer festival · applied to calendar 2026-08-31 |
| Festa Templária 🗡️ | Centro | Tomar, 2300 Tomar | 2026-07-09 → 2026-07-12 | ✅ high — Not cancelled/biennial; new Urban Park venue · applied to calendar 2026-08-31 |
| Festival Medieval de Óbidos 🗡️ | Centro | Óbidos, 2510 Óbidos | 2026-07-16 → 2026-07-26 | ✅ high — Official site: 11-day run, theme D. Fernando e Leonor Teles · applied to calendar 2026-08-31 |
| Festival Músicas do Mundo 🎵 | Alentejo | Sines | 2026-07-17 → 2026-07-25 | ✅ high — 26th edition; opens Porto Covo, main run Sines · applied to calendar 2026-08-31 |
| Estoril Summer Fest 🏎️ | Lisboa e Vale do Tejo | Autódromo Fernanda Pires da Silva, Av. Alfredo César Torres | 2026-07-18 → 2026-07-19 | 🟡 medium — Also called "Summer Party"; shortened to 2-day weekend · applied to calendar 2026-08-31 |
| Festival de Gastronomia Maranho 🍲 | Centro | Jardim da Alameda da Carvalha., Alameda Carvalha 4 | ~~2026-07-18 → 2026-07-22~~ **CANCELLED 2026** | 🔴 Cancelled for 2026 — storm Kristin damage in Sertã |
| Feira Raiana 🍲 | Centro | Idanha-A-Nova, 6060 Idanha-A-Nova | 2026-07-22 → 2026-07-26 | ✅ high — XXVI edition, 5 days, official site/FB · applied to calendar 2026-08-31 |
| Viagem Medieval Em Terra de Santa Maria 🗡️ | Norte | Santa Maria da Feira, 4520 Santa Maria da Feira | 2026-07-29 → 2026-08-09 | ✅ high — 30th anniversary edition; opening night Jul 28 · applied to calendar 2026-08-31 |

## August

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Feira de São Mateus 🎆 | Centro | Viseu | 2026-08-06 → 2026-09-06 | ✅ high — 634th edition, 31 days, Campo de Viriato · applied to calendar 2026-08-31 |
| Capeia Arraiana 🎆 | Centro | Sabugal, 6320 Sabugal | 2026-08-06 → 2026-08-25 | 🟡 medium — Multi-village series across Sabugal, per cm-sabugal calendar · applied to calendar 2026-08-31 |
| Festival Bons Sons 🎵 | Centro | Cem Soldos, 2305 Cem Soldos | 2026-08-06 → 2026-08-09 | ✅ high — Biennial, confirmed for 2026, official site |
| Romaria de Santa Marta 📿 | Norte | Viana do Castelo | 2026-08-07 → 2026-08-09 | ✅ high — Santa Marta de Portuzelo parish romaria · applied to calendar 2026-08-31 |
| Eclipse Solar🌞 | National (astronomical event, visible island-wide) | — | 2026-08-12 → 2026-08-12 | ✅ high — Partial from Lisbon: ~18:39–20:28 WEST, max 94.4% ~19:35 |
| Feira dos Petiscos 🍲 | Norte | Ponte de Lima, 4990 Ponte de Lima | 2026-08-13 → 2026-08-16 | ✅ high — XVIII edition, w/ Jogos Equestres, Expolima · applied to calendar 2026-08-31 |
| Festas em Honra de Nossa Senhora da Guia 📿 | Lisboa e Vale do Tejo | Golegã, 2150 Golegã | 2026-08-13 → 2026-08-16 | 🟡 medium — Bombeiros Golega program; some outlets cite through Aug 17 · applied to calendar 2026-08-31 |
| Festa da História 🗡️ | Norte | Bragança, 5300 Bragança | 2026-08-14 → 2026-08-17 | ✅ high — Castelo de Bragança medieval fair, 1 day earlier than baseline |
| Festa dos Povos 🎆 | Norte | Chaves, 5400 Chaves | 2026-08-14 → 2026-08-16 | ✅ high — Official chaves.pt: 3rd weekend of August · applied to calendar 2026-08-31 |
| Festas da Agonia 📿 | Norte | Viana do Castelo | 2026-08-15 → 2026-08-23 | ✅ high — Official program; pre-events (crafts fair) from Aug 7 · applied to calendar 2026-08-31 |
| Cortejo Etnográfico 🎆 | Lisboa e Vale do Tejo | Santa Cruz, 2560-498 Silveira | 2026-08-15 → 2026-08-15 | ✅ high — Single-day event (27th edition), confirmed Aug 15 only |
| Dia dos Idades 🎆 | Centro | Figueira de Castelo Rodrigo, 6440 Figueira de Castelo Rodrigo | 2026-08-15 → 2026-08-15 | ✅ high — Single-day, within Festas da Vila · applied to calendar 2026-08-31 |
| Banhos Santos 📿 | Norte | Esposende, 4740 Esposende | 2026-08-20 → 2026-08-24 | ✅ high — Romaria de São Bartolomeu do Mar; moved July→August · applied to calendar 2026-08-31 |
| Festas do Mar 🐟 | Lisboa e Vale do Tejo | Cascais, 2750 Cascais | 2026-08-20 → 2026-08-30 | ✅ high — Two weekends (20-23, 27-30 Aug), Baia de Cascais · applied to calendar 2026-08-31 |
| Festa da Nossa Senhora da Nazaré 📿 | Lisboa e Vale do Tejo | Fonte Grada, 2560 Torres Vedras | 2026-08-20 → 2026-08-24 | 🟡 medium — Confirmed town: Fonte Grada, Torres Vedras · applied to calendar 2026-08-31 |
| Festival da Sopa da Pedra 🍲 | Lisboa e Vale do Tejo | Almeirim, 2080 Almeirim | 2026-08-26 → 2026-08-30 | ✅ high — 12th edition, Parque das Tilias, Almeirim · applied to calendar 2026-08-31 |
| Festa da Nossa Senhora dos Remédios 📿 | Norte | Lamego, 5100 Lamego | 2026-08-27 → 2026-09-09 | ✅ high — Official cm-lamego.pt program; Procissao de Triunfo Sep 8 · applied to calendar 2026-08-31 |
| MEO Kalorama 🎶 | Lisboa e Vale do Tejo | Parque da Bela Vista, Av. Alm. Gago Coutinho | 2026-08-28 → 2026-08-30 | ✅ high — Official site: 5th edition, 3 days not 6 · applied to calendar 2026-08-31 |
| Aldeia Fundeira 🎆 | Centro | Aldeia Fundeira, 3320 Pampilhosa da Serra | 2026-08-30 → 2026-09-01 | ⚠️ low — No 2026/2025 date found online; kept baseline timing · applied to calendar 2026-08-31 |

## September

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Festa das Vindimas (Palmela) 🍇 | Lisboa e Vale do Tejo | Palmela | 2026-09-03 → 2026-09-08 | ✅ high — 63rd edition, official site/socials · applied to calendar 2026-08-31 |
| Festa do Avante ☭ | Lisboa e Vale do Tejo | Quinta da Atalaia, 2950 Palmela | 2026-09-04 → 2026-09-06 | ✅ high — Official site: golden 50th edition · applied to calendar 2026-08-31 |
| Caramulo Motorfestival 🏎️ | Centro | Museu do Caramulo, R. Jean Lurcat 42 | 2026-09-04 → 2026-09-06 | ✅ high — 21st edition, ~50,000 visitors expected · applied to calendar 2026-08-31 |
| Festa Nossa Senhora da Apresentação 📿 | Lisboa e Vale do Tejo | Pintéus, 2660-194 Santo Antão do Tojal | 2026-09-05 → 2026-09-08 | ⚠️ low — No 2026/2025 specific date found; kept baseline · applied to calendar 2026-08-31 |
| Festiva de Ópera de Óbidos 🎵 | Centro | Óbidos, 2510 Óbidos | 2026-09-05 → 2026-09-20 | ✅ high — Confirmed, theme "Luz e Trevas" · applied to calendar 2026-08-31 |
| Festas do Pescador 🐟 | Algarve | Albufeira, 8200 Albufeira | 2026-09-06 → 2026-09-08 | ✅ high — Sept-only (no June edition); official site confirms |
| Feiras Novas 🎆 | Norte | Ponte de Lima, 4990 Ponte de Lima | 2026-09-09 → 2026-09-14 | ✅ high — Official site: 200th anniversary edition · applied to calendar 2026-08-31 |
| Festival da Sapateira 🦀 | Lisboa e Vale do Tejo | Santa Cruz | 2026-09-12 → 2026-10-13 | 🟡 medium — Annual Sep-Oct window confirmed by pattern; exact 2026 dates unpublished · applied to calendar 2026-08-31 |
| Festa das Vindimas (Douro e Alentejo) 🍇 | Norte | Peso da Régua | 2026-09-18 → 2026-09-20 | 🟡 medium — Festa da Vindima do Douro confirmed by Municipio/IVDP · applied to calendar 2026-08-31 |
| Festa do Caldo de Quintadona 🍲 | Norte | Quintandona, 4560 Penafiel | 2026-09-18 → 2026-09-20 | ✅ high — Confirmed by municipal/local press, bracelets on sale · applied to calendar 2026-08-31 |
| Festas São Mateus 🎆 | Alentejo | Elvas, 7350 Elvas | 2026-09-18 → 2026-09-27 | ✅ high — Expo Sao Mateus 2026: 10 days of events · applied to calendar 2026-08-31 |
| Estoril Classics 🏎️ | Lisboa e Vale do Tejo | Autódromo Fernanda Pires da Silva, Av. Alfredo César Torres | 2026-09-18 → 2026-09-20 | ✅ high — 10th edition moved from Oct to Sept 18-20 · applied to calendar 2026-08-31 |
| Festa da Criança 🧒 | Lisboa e Vale do Tejo | Parque Urbano das Paivas, R. Luís de Camões | 2026-09-19 → 2026-09-19 | ⚠️ low — 2026 unpublished; single-day (2025 was Sept 20) · applied to calendar 2026-08-31 |
| Magic Valongo 🔮 | Norte | Valongo | 2026-09-25 → 2026-09-27 | ⚠️ low — 2026 dates unpublished; extrapolated from 2025 (Sept 26-28) · applied to calendar 2026-08-31 |
| Dias da Idade Média 🗡️ | Lisboa e Vale do Tejo | Castelo de São Jorge, R. de Santa Cruz do Castelo | 2026-09-27 → 2026-09-29 | ✅ high — Confirmed same dates as baseline |
| Festas das Vindimas 🍇 | Lisboa e Vale do Tejo | Cartaxo | 2026-09-27 → 2026-09-30 | ⚠️ low — No official 2026 date found; kept baseline · applied to calendar 2026-08-31 |
| Oeiras Air Show ✈️ | Lisboa e Vale do Tejo | Praia de Santo Amaro, 2780 Oeiras | 2026-09-28 → 2026-09-29 | ✅ high — Confirmed via nit.pt, same weekend as baseline |

## October

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Autoclássico 🚗 | Norte | Exponor - Porto International Fair, Av. Dr. António Macedo | 2026-10-02 → 2026-10-05 | ✅ high — Exponor official calendar: 23rd edition · applied to calendar 2026-08-31 |
| Festival Vapor 🎶 | Lisboa e Vale do Tejo | National Railway Museum, R. Ferreira de Mesquita 1-A | 2026-10-03 → 2026-10-04 | ✅ high — Confirmed moved to October ("Loucos Anos 20" theme) · applied to calendar 2026-08-31 |
| Festa do Animal 🐶 | Lisboa e Vale do Tejo | Parque Marechal Carmona, Praceta Domingos D’Avilez Av. da República | 2026-10-03 → 2026-10-04 | ⚠️ low — No 2026 date announced; varies around World Animal Day · applied to calendar 2026-08-31 |
| WSL Ericeira 🏄 | Lisboa e Vale do Tejo | Ericeira, 2655 Ericeira | 2026-10-06 → 2026-10-12 | 🟡 medium — WSL 2026 Challenger Series per official schedule · applied to calendar 2026-08-31 |
| Portugal Air Summit ✈️ | Alentejo | Aeródromo de Ponte de Sôr, N2 | 2026-10-10 → 2026-10-13 (baseline, unconfirmed) | 🟡 uncertain — Conflicting reports: some cite Oct 15-17, but Ponte de Sor council statement suggests paused/cancelled for 2026 -- confirm before relying on it |
| Amadora BD 🎨 | Lisboa e Vale do Tejo | Amadora | 2026-10-15 → 2026-10-25 | ✅ high — 37th edition confirmed by multiple sources · applied to calendar 2026-08-31 |
| Doc Lisboa 🎞️ | Lisboa e Vale do Tejo | Cinema São Jorge, Av. da Liberdade 175 | 2026-10-15 → 2026-10-25 | ✅ high — Official doclisboa.org: 24th edition · applied to calendar 2026-08-31 |
| Oktober Festa 🍻 | Unclear (no location given) | — | 2026-10-17 → 2026-10-18 | ⚠️ low — Marvila/Cabo Ruivo Lisbon beer fest; 2025 was single day |
| Rampa Santo António | Unclear (no location given — likely Caldas da Rainha area) | — | 2026-10-18 → 2026-10-18 | ⚠️ low — Possibly a cycling hillclimb in Sao Vicente, Lisbon, not Caldas motorsport -- unverified · applied to calendar 2026-08-31 |
| Feira de Antiguidades Caldas | Centro | Caldas da Rainha, 2500 Caldas da Rainha | 2026-10-23 → 2026-10-25 | ⚠️ low — November edition dropped; fair now runs Apr/Oct · applied to calendar 2026-08-31 |
| Feira do Tapete de Arraiolos 🎆 | Alentejo | Multipurpose Pavilion of Arraiolos, Av. 1º de Maio | 2026-10-28 → 2026-11-01 | ⚠️ low — 2026 unannounced; extrapolated from 2025 (Oct 29-Nov 2) · applied to calendar 2026-08-31 |
| Algarve Classics Festival 🏎️ | Algarve | Algarve International Circuit, Sítio do Escampadinho | 2026-10-30 → 2026-11-01 | ✅ high — Confirmed on official Autodromo do Algarve site · applied to calendar 2026-08-31 |
| Festa da Cabra e do Canhoto👹 | Norte | Cidões, 5320 Vinhais | 2026-10-31 → 2026-10-31 | 🟡 medium — Fixed Oct 31 Samhain-linked date · applied to calendar 2026-08-31 |

## November

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Feira da Castanha de Marmelete 🌰 | Algarve | Marmelete, 8550-145 Marmelete | 2026-11-01 → 2026-11-01 | 🟡 medium — Fixed single-day Nov 1 tradition, matches 2025 XXVIII ed. |
| Magusto de Alferce 🌰 | Algarve | Alferce, 8550 Alferce | 2026-11-01 → 2026-11-01 | 🟡 medium — Fixed single-day Nov 1 tradition (All Saints) |
| Rural Castanea 🌰 | Norte | Vinhais, 5320 Vinhais | 2026-11-06 → 2026-11-08 | ⚠️ low — 2026 undated; extrapolated from 2025's Nov 7-9 (20th ed.) · applied to calendar 2026-08-31 |
| Feira Nacional do Cavalo 🐎 | Lisboa e Vale do Tejo | Golegã, 2150 Golegã | 2026-11-06 → 2026-11-15 | ✅ high — Confirmed 50th edition dates · applied to calendar 2026-08-31 |
| Feira de São Martinho de Portimão 🎆 | Algarve | Parque de feiras e exposições de Portimão, 8500 Portimão | 2026-11-06 → 2026-11-15 | ⚠️ low — Not yet announced; extrapolated 10-day span from 2025 · applied to calendar 2026-08-31 |
| Feira de São Martinho em Penafiel 🎆 | Norte | Penafiel, 4560 Penafiel | 2026-11-08 → 2026-11-20 | 🟡 medium — Fixed Nov 8-20 fair confirmed 2024/2025 · applied to calendar 2026-08-31 |
| Feira da Castanha de Marvão 🌰 | Alentejo | Marvão, 7330 Marvão | 2026-11-14 → 2026-11-15 | ✅ high — Confirmed 42nd Festa do Castanheiro edition · applied to calendar 2026-08-31 |
| Mostra de Artes e Sabores da Maúnça 🍲 | Centro | Açor, 6230 Fundão | 2026-11-14 → 2026-11-15 | ⚠️ low — No 2026 date announced; extrapolated from prior years' pattern · applied to calendar 2026-08-31 |
| Festival Internacional Balões de Ar Quente 🎈 | Alentejo | Ponte de Sor, 7400 Ponte de Sor | 2026-11-14 → 2026-11-15 | ⚠️ low — 29th ed. unannounced; extrapolated 2nd-Saturday pattern · applied to calendar 2026-08-31 |
| Estoril Experience Day 🏁 | Lisboa e Vale do Tejo | Autódromo Fernanda Pires da Silva, Av. Alfredo César Torres | 2026-11-14 → 2026-11-15 | ⚠️ low — Not announced; extrapolated 3rd-Sunday-of-November pattern · applied to calendar 2026-08-31 |
| Lisboa Games Week 🕹️ | Lisboa e Vale do Tejo | Feira Internacional de Lisboa, R. do Bojador | 2026-11-19 → 2026-11-22 | ✅ high — Officially confirmed by organizers and PT news sources · applied to calendar 2026-08-31 |
| Leiria Sobre Rodas 🚗 | Centro | Leiria | 2026-11-20 → 2026-11-22 | ✅ high — Moved to November (Storm Kristin), merged with Rallye Vidreiro · applied to calendar 2026-08-31 |
| MotoGP Portugal 🏍️ | Algarve | Autódromo Internacional do Algarve, Sítio do Escampadinho | 2026-11-20 → 2026-11-22 | ✅ high — Confirmed on official motogp.com 2026 calendar -- moved 2 weeks later · applied to calendar 2026-08-31 |
| Feira do Mel e da Castanha 🌰🍯 | Centro | Lousã Exhibition Municipal Park, 40°06'40.0"N 8°14'58. | 2026-11-20 → 2026-11-22 | ⚠️ low — Not yet announced; extrapolated from 2025 (Nov 21-23) · applied to calendar 2026-08-31 |
| Festas Nicolinas 🎆 | Norte | Guimaraes | 2026-11-29 → 2026-12-07 | ✅ high — Traditional fixed annual dates (Pinheiro to Baile da Saudade) |

## December

| Event | Region | Location | 2026 dates | Verified? |
|---|---|---|---|---|
| Cabeça Aldeia Natal 🎄 | Centro | Cabeça, 6270 Cabeça | 2025-12-06 → 2026-01-02 | not re-verified this pass (baseline only) |
| Estoril Endurance Festival 🏁 | Lisboa e Vale do Tejo | Autódromo Fernanda Pires da Silva, Av. Alfredo César Torres | 2026-12-04 → 2026-12-05 | 🟡 medium — 250km Estoril season finale, 2026 Iberian Historic Endurance calendar · applied to calendar 2026-08-31 |
| Festa das Luzes 🕎 | Centro | Belmonte, 6250 Belmonte | 2026-12-04 → 2026-12-12 | 🟡 medium — Mirrors Hanukkah dates; official 2026 dates unconfirmed · applied to calendar 2026-08-31 |
| Cabeça Aldeia Natal 🎄 | Centro | Cabeça, 6270 Cabeça | 2026-12-06 → 2027-01-02 | ⚠️ low — 13th ed. ran Dec 6-Jan 1 2025/26; 2026/27 not yet announced · applied to calendar 2026-08-31 |
| Tribeca Festival Lisboa 🎞️ | Lisboa e Vale do Tejo | Avenida da Liberdade, Lisboa | 2026-12-10 → 2026-12-13 | ✅ high — Officially licensed European edition (Tribeca Enterprises + SIC + Lisbon City Council, through 2028); 3rd edition, 25th-anniversary special, Avenida da Liberdade -- moved from Oct baseline to Dec · applied to calendar 2026-08-31 |
| Festa do Pito 🍰 | Norte | Vila Real, 5000 Vila Real | 2026-12-13 → 2026-12-13 | ✅ high — Fixed to Dec 13 (Santa Luzia's day), single-day, not a range |
| Natal do Bananeiro 🍌 | Norte | Casa das Bananas, R. do Souto 26 | 2026-12-24 → 2026-12-25 | fixed calendar date (not re-verified, low drift risk) |
| Madeiro de Natal de Penamocor 🎄 | Centro | Penamacor, 6090 Penamacor | 2026-12-24 → 2026-12-25 | fixed calendar date (not re-verified, low drift risk) |
| Festa dos Rapazes / Caretos de Ousilhão 🎄 | Norte | Ousilhão, 5320 Ousilhão | 2026-12-25 → 2026-12-27 | fixed calendar date (not re-verified, low drift risk) |
| Festa dos Rapazes / Caretos de Varge 🎄 | Norte | Varge, 5300 Bragança | 2026-12-25 → 2026-12-27 | fixed calendar date (not re-verified, low drift risk) |
| Magusto da Velha 🌰 | Centro | Aldeia Viçosa, 6300 Aldeia Viçosa | 2026-12-26 → 2026-12-27 | fixed calendar date (not re-verified, low drift risk) |
| Enterro do Ano Velho 🎆 | Alentejo | Pias, 7830 Pias | 2026-12-31 → 2027-01-01 | fixed calendar date (not re-verified, low drift risk) |
