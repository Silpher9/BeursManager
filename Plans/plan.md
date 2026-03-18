# Kunstbeurs App — Projectplan

## Status: AFGESLOTEN — Zie plan-reviewed.md voor het gevalideerde plan

> Dit document was de originele ontdekkingsfase. Het gereviewed plan (`plan-reviewed.md`) is de actuele referentie. De bouw is actief: Fase 0-2 zijn af, Home Hub is af, Fase 3 is grotendeels klaar, Fase 4 (kosten) is onderdeel van Fase 2 geworden.

## Kernidee
Een app voor kunstenaars die naar (kunst)beurzen gaan.

## Modules

### Module A — Beursbeheer (praktisch)
1. **Voorraadbeheer** — Welke werken heb ik, welke neem ik mee?
2. **Verkoop bijhouden** — Wat is er verkocht, aan wie, voor hoeveel?
3. **Kosten/opbrengsten tracking** — Standhuur, reiskosten, materiaal vs. omzet per beurs
4. **Contacten/klanten verzamelen** — Geïnteresseerden, kopers, galeriehouders

### Module B — Standbouwer (3D)
- Aparte module binnen dezelfde app (Babylon.js in WebView)
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

### Parkeerlijst — Kunstwerk → 3D asset pipeline

**2D werken → texture voor 3D wand:**
- Foto maken van schilderij/print
- AI-segmentatie knipt het werk automatisch uit (achtergrond verwijderen)
- Afmetingen worden uit de database gelezen
- Werk verschijnt in een menu en kan op een wand gesleept worden in de 3D-scene
- Technologie: on-device segmentatie (Core ML / Vision framework)

**3D werken (sculpturen) → 3D model via photogrammetry:**
- Kunstenaar maakt 20+ foto's rondom het sculptuur
- Model wordt gereconstrueerd via photogrammetry
- Opties (nader te evalueren):
  1. **Apple Object Capture API** — draait lokaal op Apple-hardware, USDZ output, snelste integratie
  2. **Cloud API** (Reali3, Beholder) — REST API, upload foto's, krijg GLB/OBJ terug
  3. **Self-hosted** (Meshroom/AliceVision) — headless server, volledige controle, gratis
- Output: GLB/GLTF model dat in Babylon.js scene geplaatst kan worden
- Wildcard: kwaliteit en gebruiksgemak moeten getest worden met echte sculpturen

## Beslissingen

| Onderwerp | Beslissing |
|-----------|-----------|
| Doelgroep | Breed — alle soorten kunstenaars |
| Platform | iPad app (primair) |
| 3D engine | Three.js of Babylon.js (nader te bepalen) |
| Offline | Ja, essentieel — app moet volledig werken zonder internet |
| Gebruikers | Solo (één kunstenaar) |
| Cloud sync | Optioneel, geen prioriteit |
| Invoer kunstwerken | Camera-first (foto maken vanuit de app) |
| Bestaand systeem | Nee — greenfield, geen migratie nodig |
| Portfolio/catalogus | Nee — puur eigen beheer, niet klantgericht |

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

### Kunstwerk
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | Auto-generated |
| foto | Blob/pad | Hoofdfoto (camera) |
| extra_fotos | Array<Blob/pad> | Optionele extra foto's |
| titel | Text | Verplicht |
| afmetingen_h | Number | Hoogte (cm) |
| afmetingen_b | Number | Breedte (cm) |
| afmetingen_d | Number | Diepte (cm) |
| vraagprijs | Number | In euro's |
| techniek | Text | Bijv. "olieverf op doek" |
| jaar | Number | Jaar van creatie |
| serie | Text | Optioneel, groepering |
| status | Enum | beschikbaar / ingepakt / op_beurs / verkocht |
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
| bon_foto | Blob/pad | Optioneel — foto van kassabon/factuur |

### Verkoop
| Veld | Type | Notities |
|------|------|----------|
| id | UUID | |
| beurs_id | FK | |
| kunstwerk_id | FK | |
| vraagprijs | Number | Originele vraagprijs (overgenomen uit kunstwerk) |
| korting | Number | Korting in euro's (0 = geen korting) |
| verkoopprijs | Number | Uiteindelijke prijs (vraagprijs - korting) |
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

- **Beursdag-modus**: Ja — vereenvoudigd scherm voor snel werken tijdens de beurs
  - Snelle verkoop-registratie
  - Snel contact toevoegen
  - Overzicht meegebrachte werken
  - Minimale afleiding

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

### Fase 1 — Voorraadbeheer (nodig als basis voor alles)
- Kunstwerk toevoegen (camera + formulier)
- Kunstwerkenlijst met foto-thumbnails
- Detail-/bewerkscherm
- Serie/collectie groepering
- Status beheer (beschikbaar / verkocht)

### Fase 2 — Verkoop bijhouden ⭐ (hoogste prioriteit)
- Beurs aanmaken
- Werken toewijzen aan beurs
- Verkoop registreren (werk → prijs → koper)
- **Beursdag-modus** met vereenvoudigde interface
- Verkoopoverzicht per beurs

### Fase 3 — Contacten ⭐
- Contact toevoegen (naam, email, telefoon, type)
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

### Fase 6 — Standbouwer (3D) 🔮
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
├── 📦 Voorraad        (kunstwerkenlijst + toevoegen)
├── 🎪 Beurzen         (beurslijst + beurs-detail)
│   ├── Beursdag-modus (vereenvoudigd, snel werken)
│   └── 🏗️ Standbouwer  (3D editor per beurs)
├── 👥 Contacten       (contactenlijst + detail)
├── 📊 Rapporten       (overzichten + grafieken)
└── ⚙️ Instellingen    (profiel, backup, voorkeuren)
```

## Status: AFGESLOTEN

Dit plan is gereviewed (zie `plan-reviewed.md`) en de bouw is ver gevorderd. Fase 0-2, Home Hub, en het grootste deel van Fase 3 zijn afgerond. Zie `backlog.md` voor de actuele status.

---

*Laatst bijgewerkt: maart 2026*
