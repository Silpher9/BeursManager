> **STATUS: VOLLEDIG GEÏMPLEMENTEERD** (maart 2026)
> Alle onderdelen van V1 zijn gebouwd: actieve beursblok, snelle acties, kernoverzicht, en laatste beursresultaat. Zie `src/domains/home/HomeHubScreen.tsx` en `src/domains/home/repository.ts`.

---

# BeursManager — Home Hub Plan

## Doel

Voeg een lichte, taakgerichte startpagina toe aan BeursManager zodat de app niet meer direct opent in `Voorraad`, maar in een praktische `Home`-laag die:

- overzicht geeft
- de gebruiker naar de juiste volgende stap brengt
- de rest van de app niet vervuilt met extra domeincomplexiteit

## Waarom dit nodig is

De huidige tabstructuur opent functioneel direct in `Voorraad`. Daardoor voelt de app meteen als een lijst/database, terwijl een reguliere gebruiker eerst behoefte heeft aan:

- context
- status
- snelle acties

De Home Hub moet dat oplossen zonder een zwaar management-dashboard te worden.

## Wat Home wel is

Een **aggregatielaag** bovenop bestaande domeinen:

- `inventory`
- `fairs`
- later eventueel kleine stukjes `sales`

Home leest en combineert bestaande gegevens, maar introduceert geen nieuw domein.

## Wat Home niet is

- geen analytics-dashboard
- geen duplicaat van `Rapporten`
- geen nieuw persistent domein
- geen plek voor complexe filters, grafieken of instellingen

## Informatiearchitectuur

Nieuwe tabvolgorde:

1. `Home`
2. `Voorraad`
3. `Beurzen`
4. `Contacten`
5. `Rapporten`
6. `Instellingen`

`Home` wordt de nieuwe default landingsplek.

## Inhoud van V1

### Blok 1 — Actieve of eerstvolgende beurs

Het belangrijkste blok bovenaan.

Toont:

- naam beurs
- datum / locatie
- aantal gekoppelde werken
- primaire actie: `Open beurs`

Lege staat:

- tekst: geen aankomende beurzen
- actie: `Maak eerste beurs aan`

### Blok 2 — Snelle acties

Drie primaire acties:

- `Nieuw kunstwerk`
- `Verkoop registreren`
- `Contact toevoegen`

Optioneel vierde actie:

- `Nieuwe beurs`

Regel:

- grote tap targets
- weinig tekst
- direct naar concrete flow

### Blok 3 — Kernoverzicht

Compacte statuskaarten met:

- aantal beschikbare werken
- aantal gereserveerde werken
- aantal komende beurzen

Dit zijn lichte statusblokken, geen rapportagekaarten.

### Blok 4 — Laatste beurs resultaat

Alleen tonen als de laatst afgelopen beurs recent genoeg is, bijvoorbeeld binnen 30 dagen.

Toont:

- naam van de laatst afgelopen beurs
- omzet
- aantal verkopen

Doel:

- positieve terugkoppeling
- gevoel van voortgang
- warmere start van de app

Als deze data nog niet eenvoudig of betrouwbaar genoeg is op te halen: niet in V1 bouwen.

## UX-principes

- licht en rustig
- gallery-/studio-gevoel behouden
- één duidelijke visuele hiërarchie
- geen druk rapportenscherm op de homepage
- elke sectie moet naar een volgende stap leiden

## Architectuur

### Nieuwe route

Voeg een nieuwe tab-route toe:

- `app/(tabs)/index.tsx`

Deze route rendert de Home Hub.

### Aanbevolen schermstructuur

```text
app/(tabs)/
├── index.tsx
├── inventory/
├── fairs/
├── contacts/
├── reports.tsx
└── settings.tsx

src/domains/home/
├── HomeHubScreen.tsx
├── repository.ts
└── types.ts
```

### Data-aanpak

Home moet alleen lezen uit bestaande tabellen/queries.

Aanbevolen read helpers:

- `getHomeSummary(db)`
- `getPrimaryFair(db)`
- `getRecentFairResult(db)`

Belangrijke grens:

- Home mag geen nieuwe business rules bezitten
- Home mag geen eigen opslaglaag of tabellen krijgen
- Home is consumer van bestaande domeinen

## Datamodel-impact

Geen verplichte schemawijziging voor V1.

Optioneel later:

- metadata voor “verder waar je was”

Maar dat hoort niet in de eerste versie.

## Implementatievolgorde

### Stap 1

Nieuwe `Home` tab-route toevoegen en als eerste tab zetten.

### Stap 2

Actieve/eerstvolgende beursblok bouwen inclusief empty state.

### Stap 3

Snelle acties toevoegen.

### Stap 4

Kernoverzicht met 3 statuskaarten toevoegen.

### Stap 5

Alleen als het simpel genoeg blijft:

- `Laatste beurs resultaat`

## Wat niet in V1 hoort

- grafieken
- omzetblokken uit `Rapporten` dupliceren
- “verder waar je was”
- notificatiecentrum
- widget-achtige personalisatie
- beursdag-modus embedden in Home

## Succescriteria

De Home Hub is geslaagd als:

- de app niet meer abrupt in `Voorraad` opent
- de gebruiker in één blik ziet wat nu belangrijk is
- snelle acties echt tijd besparen
- Home rustiger voelt dan `Rapporten`
- de gebruiker sneller in beurs/verkoop/nieuw kunstwerk komt dan in de huidige structuur

## Conclusie

Voor BeursManager is een Home Hub een logische volgende stap.

Niet als “nog een dashboard”, maar als een kleine, taakgerichte startlaag die de bestaande app beter ontsluit.

Dus:

**ja tegen een Home Hub, nee tegen een zwaar management-dashboard.**
