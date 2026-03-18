# Kunstbeurs App — Projectplan (reviewed)

## Status: IN UITVOERING — Fase 0-2 af, Fase 3 grotendeels klaar

### Voortgang (bijgewerkt 14 maart 2026)

| Fase | Status | Opmerkingen |
|------|--------|-------------|
| Fase 0 — Fundament | AFGEROND | Expo SDK 55, TypeScript strict, SQLite v4, tabs, basis componenten |
| Fase 1 — Voorraadbeheer | AFGEROND | Artwork CRUD, artists tabel, foto-opslag met compressie + thumbnails, filtering |
| Fase 2 — Verkoop bijhouden | AFGEROND | Beurs CRUD, artwork assignment, sales, expenses, beursdag-modus persistent |
| Home Hub | AFGEROND | Toegevoegd als eerste tab (niet in origineel plan) |
| Fase 2.5 — Beurscatalogus | NIET GESTART | Laag geprioriteerd |
| Fase 3 — Contacten | GROTENDEELS KLAAR | Editor, types, lijst, beurscontext. Ontbreekt: detailscherm, zoek/filter, contact-artwork interesse UI |
| Fase 4 — Kosten tracking | AFGEROND | Gebouwd als onderdeel van Fase 2 (expenses per fair per category) |
| Fase 5 — Rapporten | NIET GESTART | Volgende functionele fase |
| Fase 5.5 — GPU Artifact Service | NIET GESTART | Optioneel |
| Fase 6 — Standbouwer | NIET GESTART | Wacht op Module A voltooiing |

## Kernidee
Een app voor kunstenaars die naar (kunst)beurzen gaan.

## Modules

### Module A — Beursbeheer (praktisch)
1. **Voorraadbeheer** — Welke werken heb ik, welke neem ik mee?
2. **Verkoop bijhouden** — Wat is er verkocht, aan wie, voor hoeveel?
3. **Kosten/opbrengsten tracking** — Standhuur, reiskosten, materiaal vs. omzet per beurs
4. **Contacten/klanten verzamelen** — Geïnteresseerden, kopers, galeriehouders

### Module B — Standbouwer (3D) — geïsoleerde module
- **Architectonisch geïsoleerd** van Module A: eigen UI-state, eigen rendering-laag
- Koppelt alleen via kunstwerkdata uit Module A (leest voorraad, gebruikt afmetingen/foto's)
- Geen blokkade voor Fase 0–5: Module B wordt pas gebouwd wanneer Module A bruikbaar is
- Technologie: Babylon.js in WebView
- 3D-omgeving om je stand te ontwerpen en in te richten

**B1 — Standbouw (eerste versie):**
- Wanden vrij plaatsen en verwijderen (drag start→eindpunt)
  - Snap-to-grid optioneel aan/uit
  - Magnetisch snappen aan andere wanden (hoeken, T-stukken)
  - Wandhoogte en -dikte instelbaar
- Deuropeningen in wanden uitsnijden
  - Positie en breedte instelbaar
- Verlichting
  - Spotlights plaatsen aan plafond/wand
  - Richting en hoek instellen (drag om te richten)
  - Lichtkleur en intensiteit aanpassen
  - Realtime schaduwpreview
- Kunst ophangen aan wanden
  - Drag & drop vanuit voorraad (gekoppeld aan Module A)
  - 2D werken worden als texture op schaal getoond
  - Hoogte instelbaar (drag up/down)
  - Automatisch op schaal op basis van afmetingen uit database

**B2 — Assets & catalogus:**
- Mix van pre-made assets (door jou als 3D-modeller) en procedurele basisvormen
- Pre-made assets: sokkels, lampen, specifieke standmeubels (GLB/GLTF)
- Procedureel: wanden, vloer, basale blokvormen
- Asset-formaat: GLB/GLTF voor compatibiliteit met Babylon.js

**B3 — Camera & navigatie:**
- Orbit camera (draaien rond de stand)
- Top-down plattegrond-view
- Optioneel: first-person walkthrough

**Standbouwer — later toevoegen:**
- Sculpturen plaatsen (op sokkels, vrij in ruimte)
- Objecten catalogus uitbreiden (tafels, vitrines, etc.)
- Materialen op wanden (hout, beton, wit gestuukt)
- First-person walkthrough modus
- Export/delen (screenshot, PDF bovenaanzicht, link)
- Undo/redo

### Niet in scope (voor nu)
- Beurzen ontdekken en plannen

### Parkeerlijst (later toevoegen)
- BTW-berekening en factuur genereren
- Fysieke locatie-tracking per werk (atelier → auto → stand → koper)
- Beurs kopiëren als template voor terugkerende beurzen
- Data export (CSV) voor boekhouding/belasting
- Meerdere prijsniveaus (galerie vs. direct)
- Notities/leermomenten per beurs
- **AI Assist: Fair Enrichment** — LLM-gebaseerde autocomplete voor beursdetails (datum, locatie). *Altijd als suggestie met human confirmation.*
- **AI Assist: Fair Cover Art** — Generatieve sfeerbeelden voor beurzen via lokale GPU (nice-to-have visual upgrade).

### Parkeerlijst — Kunstwerk → 3D asset pipeline

**2D werken → texture voor 3D wand:**
- Foto maken van schilderij/print
- AI-segmentatie knipt het werk automatisch uit (achtergrond verwijderen)
- Afmetingen worden uit de database gelezen
- Werk verschijnt in een menu en kan op een wand gesleept worden in de 3D-scene
- Technologie: on-device segmentatie (Core ML / Vision framework)

**3D werken (sculpturen) → 3D model via photogrammetry:**
- Kunstenaar maakt 20+ foto's rondom het sculptuur op de iPad
- App stuurt de foto's als een asynchrone "job" naar de lokale GPU Artifact Service (RTX 3090 server)
- De server draait **Meshroom/AliceVision via CUDA** voor razendsnelle verwerking
- Zodra de job klaar is, downloadt de app het `.glb` artifact en slaat deze lokaal op
- *Voordeel:* iPad wordt ontlast, gratis via eigen hardware, en behoudt offline-first (app functioneert gewoon door terwijl de job in queue staat of uploadt zodra er wifi is).

## Beslissingen

| Onderwerp | Beslissing |
|-----------|-----------|
| Doelgroep | Breed — alle soorten kunstenaars |
| Platform | iPad app (primair) |
| 3D engine | Babylon.js (besloten) — betere touch-support, ingebouwde editor-tooling, inspector |
| Offline | Ja, essentieel — app moet volledig werken zonder internet |
| Gebruikers | Solo (één kunstenaar) |
| Cloud sync | Optioneel, geen prioriteit |
| Invoer kunstwerken | Camera-first (foto maken vanuit de app) |
| Bestaand systeem | Nee — greenfield, geen migratie nodig |
| Portfolio/catalogus | Nee — puur eigen beheer, niet klantgericht |
| GPU server | RTX 3090 op lokaal netwerk — optionele accelerator voor photogrammetry, segmentatie, baked lighting |
| GPU-service tech | FastAPI (Python) — job-based artifact service, async verwerking |

## Tech Stack — Aanbeveling

### Advies: **React Native (Expo) + Babylon.js via WebView**

**Waarom deze combinatie:**

1. **React Native (Expo)** voor de hoofdapp
   - Module A (voorraadbeheer, verkoop, kosten, contacten) draait native
   - Goede iPad-ondersteuning
   - Grote community, veel libraries
   - AI-assistenten (Claude Code, Copilot) zijn sterk in React/TypeScript
   - Eventueel later uit te breiden naar iPhone of Android

2. **Babylon.js in WebView** voor Module B (3D standinrichting)
   - Babylon.js heeft betere ingebouwde tooling voor interactieve 3D editors dan Three.js
   - Inspector, GUI-systeem, physics engine out of the box
   - Sterke iPad/touch-support
   - WebView isoleert de 3D-module netjes van de rest

3. **SQLite (via expo-sqlite)** voor lokale opslag
   - Lichtgewicht, betrouwbaar, offline-first
   - Later eventueel sync toevoegen (bijv. via Cloudflare D1 of Supabase)

4. **TypeScript** doorheen het hele project
   - Één taal voor alles (app + 3D)

**Alternatieven overwogen:**
- *Swift/SwiftUI + SceneKit*: Beter native performance, maar minder flexibel, moeilijker met AI-tooling, iPad-only
- *Capacitor*: Vergelijkbaar met RN maar kleiner ecosysteem
- *Flutter*: Goede optie maar minder sterke 3D-integratie

## Datamodel (concept)

> **Opslagprincipe:** Afbeeldingen worden opgeslagen als bestanden in file storage. SQLite bevat alleen paden/referenties, geen blobs. Dit is beter voor performance, thumbnails, backups en latere migratie.

### Kunstwerk
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | Auto-generated |
| foto_pad | Text | Pad naar hoofdfoto in file storage (camera) |
| extra_foto_paden | Array<Text> | Paden naar optionele extra foto's |
| titel | Text | Verplicht |
| afmetingen_h | Number | Hoogte (cm) |
| afmetingen_b | Number | Breedte (cm) |
| afmetingen_d | Number | Diepte (cm) |
| vraagprijs | Number | In euro's |
| kunstenaar_id | FK | Verwijst naar kunstenaar/collectief |
| techniek | Text | Bijv. "olieverf op doek" |
| jaar | Number | Jaar van creatie |
| serie | Text | Optioneel, groepering |
| status | Enum | beschikbaar / gereserveerd / ingepakt / op_beurs / verkocht |
| created_at | DateTime | |

### Kunstenaar
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | |
| naam | Text | Uniek binnen de app voor snelle herselectie |
| created_at | DateTime | |

### Beurs
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | |
| naam | Text | Bijv. "Art The Hague 2026" |
| locatie | Text | |
| datum_start | Date | |
| datum_eind | Date | |
| notities | Text | |

### Beurs_Kunstwerk (koppeltabel)
| Veld | Type | Notities |
|------|------|----------|
| beurs_id | FK | |
| kunstwerk_id | FK | |
| meegenomen | Boolean | Ingepakt voor deze beurs? |
| verkocht | Boolean | Verkocht op deze beurs? |
| verkoopprijs | Number | Kan afwijken van vraagprijs |

### Kosten
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | |
| beurs_id | FK | |
| categorie | Enum | standhuur / reiskosten / verblijf / materiaal_stand / eten_drinken |
| bedrag | Number | In euro's |
| omschrijving | Text | Optioneel |
| bon_foto_pad | Text | Optioneel — pad naar foto van kassabon/factuur in file storage |

### Verkoop
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | |
| beurs_id | FK | |
| kunstwerk_id | FK | |
| vraagprijs | Number | Originele vraagprijs (overgenomen uit kunstwerk) |
| korting | Number | Korting in euro's (0 = geen korting) |
| verkoopprijs | Number | Uiteindelijke prijs — bij invoer automatisch berekend uit `vraagprijs - korting`, maar opgeslagen als historisch transactieveld |
| betaalstatus | Enum | betaald / nog_niet_betaald / deels_betaald |
| betaalmethode | Enum | contant / pin / overschrijving / anders |
| datum | DateTime | Exacte timestamp: datum + uur + minuut (automatisch ingevuld bij registratie) |
| contact_id | FK | Optioneel — koppeling met koper |

### Contact
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | |
| naam | Text | |
| email | Text | |
| telefoon | Text | |
| type | Enum | koper / geïnteresseerde / galeriehouder / overig |
| beurs_id | FK | Op welke beurs is dit contact aangemaakt/ontstaan |
| notities | Text | |

### Contact_Kunstwerk (interesse-koppeling)
| Veld | Type | Notities |
|------|------|----------|
| contact_id | FK | |
| kunstwerk_id | FK | |
| beurs_id | FK | Optioneel — op welke beurs was de interesse? |
| notities | Text | Bijv. "wil foto ontvangen", "twijfelt over prijs" |

### Rapporten (berekend, niet opgeslagen)
- Omzet per beurs (som verkopen)
- Winst per beurs (omzet - kosten)
- Totaaloverzicht alle beurzen
- Best verkochte werken / technieken
- Trends over tijd

## UX Beslissingen

- **Beursdag-modus**: Ja — taakgericht startscherm voor snel werken tijdens de beurs
  - **Startscherm**: drie grote knoppen — `Verkoop registreren` | `Contact toevoegen` | `Overzicht`
  - Geen tabbar in deze modus — puur taakgericht, minimale navigatie
  - Grote tap targets voor gebruik met één hand
  - Zo min mogelijk invoervelden per actie
  - Minimale afleiding
  - Modus is persistent via een aan/uit toggle: zolang actief blijft de geselecteerde beurscontext behouden
  - Duidelijke "Beursdag afsluiten" actie om terug te gaan naar de normale appnavigatie

- **Visuele richting**: Clean & minimalistisch
  - Default licht thema, dark mode als optie
  - Wit/lichte achtergronden — kunst moet centraal staan
  - Veel witruimte, rustige typografie
  - Subtiele grijstinten voor structuur, één accentkleur voor interactie
  - Scandinavisch/galerie-gevoel: de app voelt als een witte tentoonstellingsruimte
  - Geen neon, geen donkere UI als basis
  - Inspiratie: galerie-apps, Apple Notes, Things 3

## Bouwvolgorde (fasen)

### Fase 0 — Fundament
- Project setup (Expo + TypeScript)
- SQLite database schema
- Navigatiestructuur (tab-based)
- Basis UI-componenten
- **Domeinscheiding vanaf dag 1:** `inventory`, `fairs`, `sales`, `contacts`, `expenses`
- **Foto-opslag:** file storage voor afbeeldingen, paden/refs in SQLite (geen blobs)

### Fase 1 — Voorraadbeheer (nodig als basis voor alles)
- Kunstwerk toevoegen (camera + formulier)
- Kunstwerkenlijst met foto-thumbnails
- Detail-/bewerkscherm
- Serie/collectie groepering
- Kunstenaar toevoegen/selecteren via herbruikbare dropdown
- Filteren op kunstenaar
- Status beheer (beschikbaar / verkocht)

### Fase 2 — Verkoop bijhouden (hoogste prioriteit)
- Beurs aanmaken
- Werken toewijzen aan beurs
- Verkoop registreren (werk → prijs → koper)
- **Beursdag-modus** met vereenvoudigde interface
- **Beursdag-modus persistent maken** via toggle met actieve beurscontext
- Verkoopoverzicht per beurs

### Fase 2.5 — Beurscatalogus (AAF Presets / Curated reference)
- **Doel:** Aanmaken van bekende beurzen versnellen via een interne catalogus.
- **Implementatie:** Een bewerkbare SQLite tabel (`fair_catalog`) die eenmalig geseed wordt met actuele AAF edities (2026+).
- **Datum-filter:** App toont standaard alleen beurzen in de toekomst (`datum_eind >= date('now')`).
- Gebruiker kan uit deze catalogus kiezen om direct een beurs-record aan te maken in `mijn beurzen`.
- Gebruiker kan handmatig verouderde/irrelevante entries uit de catalogus verwijderen of aanpassen.
- **Architecturale grenzen:**
  - Catalogusdata (referentie) ≠ Gebruikersdata (actieve beurzen).
  - De catalogus bevat uitsluitend unieke edities (met exacte datums/locaties), geen abstracte series of templates.
  - Elk catalogus-item moet transparant zijn over de bron (inclusief `source_url`, `verified_at` en `status`). Deze metadata wordt in de UI getoond ter referentie.

### Fase 3 — Contacten
- Contact toevoegen (naam, email, telefoon, type)
- Contact opslaan met beurscontext (waar is het contact ontstaan)
- Contacten koppelen aan kunstwerken (interesse)
- Snel contact toevoegen vanuit beursdag-modus
- Contactlijst met zoek/filter

### Fase 4 — Kosten tracking
- Kosten invoeren per beurs per categorie
- Kostenoverzicht per beurs

### Fase 5 — Rapporten
- Omzet per beurs
- Winst per beurs (omzet - kosten)
- Totaaloverzicht alle beurzen
- Best verkochte werken / technieken
- Trends over tijd (grafieken)

### Fase 5.5 — GPU Artifact Service (optioneel)

> **Vereiste:** RTX 3090 server beschikbaar op lokaal netwerk. De app werkt volledig zonder deze service — het is een opt-in verrijking, geen afhankelijkheid.

**Technologie:** FastAPI (Python) op de GPU-server

**Architectuur: job-based artifact service**
De GPU-service is geen live request/response API waar de app op wacht, maar een asynchrone job-queue:
1. App maakt een job aan (upload foto's/data)
2. Server verwerkt async op de GPU
3. Resultaat wordt een artefact (`.glb` model, segmentatiemasker, lightmap)
4. App pollt of synct status
5. Gebruiker kan gewoon verder in de hoofdapp

**Voordelen:**
- Offline-first blijft intact — als server onbereikbaar is, mislukt alleen de verrijking
- Grote GPU-taken (minuten) blokkeren de app-flow niet
- Artefacten zijn herbruikbaar — eenmaal berekend, niet opnieuw nodig

**REST endpoints:**
- `POST /jobs/photogrammetry` — sculptuur foto's → 3D model (GLB)
- `POST /jobs/segment` — kunstwerk foto → uitgeknipt masker
- `POST /jobs/bake-lighting` — standinrichting → lichtmaps (later, Fase 6+)
- `GET /jobs/{id}/status` — poll job status + voortgang
- `GET /artifacts/{id}` — download resultaat-artefact

**UX voor async verwerking:**
- Status-badge in de app: "Sculptuur 'Zomerbries' wordt verwerkt (45%)..."
- Subtiele notificatie wanneer klaar: "3D-model is gereed!"
- Als server onbereikbaar: job wordt lokaal in een persistente SQLite queue gezet ("Wachtend op upload")
- Zodra iPad weer op het netwerk is: automatische achtergrond-sync en verwerking

### GPU-taken (in prioriteitsvolgorde):

1. **Photogrammetry** (Meshroom/AliceVision + CUDA)
   - Kunstenaar maakt 20+ foto's van sculptuur op iPad
   - Foto's worden geüpload naar server wanneer op het netwerk
   - 3090 rekent 3D-model uit (dramatisch sneller dan CPU)
   - GLB wordt teruggestuurd naar de app voor gebruik in standbouwer
   - Primaire fallback: handmatige 3D-model (GLB) import
   - Cloud API alleen als latere optionele alternatieve backend

2. **AI-segmentatie** (SAM 2 / Segment Anything)
   - Schilderij/print foto → automatisch uitknippen (achtergrond verwijderen)
   - Betere kwaliteit dan on-device Core ML/Vision
   - Fallback: on-device segmentatie of handmatige crop
   - Enhanced mode: alleen als server bereikbaar is

3. **Baked lighting** (pas na Fase 6d)
   - Standinrichting → realistische lichtmaps berekenen
   - Lichtmaps als textures terugladen in Babylon.js scene
   - Scheelt enorm in real-time rendering performance op iPad
   - Fallback: real-time lighting in Babylon.js (minder realistisch, meer GPU-belasting)

### Fase 6 — Standbouwer (3D)
- Babylon.js WebView integratie in de app
- Fase 6a: Wanden plaatsen/verwijderen (vrij + snap)
- Fase 6b: Deuropeningen uitsnijden
- Fase 6c: Kunst ophangen (drag & drop vanuit voorraad, op schaal)
- Fase 6d: Verlichting (spots plaatsen, richten, kleur/intensiteit)
- Fase 6e: Pre-made + procedurele assets laden
- Fase 6f: Camera (orbit + top-down plattegrond)

## Schermstructuur (concept)

```
Tab Bar:
├── Voorraad        (kunstwerkenlijst + toevoegen)
├── Beurzen         (beurslijst + beurs-detail)
│   ├── Beursdag-modus (vereenvoudigd, snel werken)
│   └── Standbouwer  (3D editor per beurs)
├── Contacten       (contactenlijst + detail)
├── Rapporten       (overzichten + grafieken)
└── Instellingen    (profiel, backup, voorkeuren)
```

## Wijzigingen na review (maart 2026)

Gereviewed door Claude, Codex en Gemini. De volgende aanpassingen zijn doorgevoerd t.o.v. het originele plan (`plan.md`):

1. **Module B geïsoleerd** — eigen state en rendering-laag, geen blokkade voor Module A
2. **Foto-opslag** — van blobs naar file paths in SQLite
3. **Babylon.js expliciet gekozen** — was "nader te bepalen"
4. **Beursdag-modus UX** — taakgericht startscherm met 3 grote knoppen
5. **`gereserveerd` status** — toegevoegd aan Kunstwerk.status enum
6. **`verkoopprijs` als historisch veld** — berekend bij invoer, opgeslagen als feit
7. **Domeinscheiding** — `inventory`, `fairs`, `sales`, `contacts`, `expenses` vanaf Fase 0
8. **Lokale GPU Server (RTX 3090)** — toegevoegd als asynchrone "GPU Artifact Service" in Fase 5.5 voor zware AI- en render-taken zonder de offline-first of UI-performance te schaden.

**Volgende stap:** Fase 3 (Contacten) afronden, daarna Fase 5 (Rapporten). Fase 4 is al klaar.

---

*Laatst bijgewerkt: maart 2026*
