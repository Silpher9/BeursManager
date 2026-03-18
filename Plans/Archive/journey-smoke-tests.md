# Plan: Journey Smoke Tests

## Context

We willen korte, single-purpose Playwright journey tests die cross-domein navigatie en context-retentie testen. Dit zijn flows die de bestaande domein-tests niet dekken.

## Bestaande e2e dekking

Er bestaan al uitgebreide tests in `tests/e2e/`:
- `smoke.spec.ts` — basis CRUD (artwork, contact) + fair day toggle
- `fair-day-workflow.spec.ts` — volledige beursdag flow (assign, activate, sell, contact, deactivate)
- `sales.spec.ts` — sale CRUD + correctie round-trip
- `fairs.spec.ts` — fair CRUD + assignment
- `inventory.spec.ts` — artwork CRUD + detail/edit round-trip
- `contacts.spec.ts` — contact CRUD
- `home.spec.ts` — home hub tests
- `reports.spec.ts` — rapportage
- `demo-seed.spec.ts` — seed flow (instabiel)

**Na analyse:** veel van de oorspronkelijk voorgestelde 10 journeys zijn al gedekt. We beperken ons tot wat echt ontbreekt.

## Wat ontbreekt

De bestaande tests dekken CRUD en basis-flows goed, maar missen:

1. **Beursdag context-retentie na sale** — `fair-day-workflow.spec.ts` checkt banner na sale, maar test niet of je vanuit beurs detail terug kunt naar beursdag zonder opnieuw te activeren
2. **Home Hub quick actions met fair-context** — niet gedekt door `home.spec.ts`
3. **Contact vanuit beurs-context → return path** — niet expliciet gedekt
4. **Sidebar navigatie + actieve tab state (tablet)** — niet gedekt

## Voorgestelde journeys (4 tests)

Nieuw bestand: `tests/e2e/journey-smoke.spec.ts`

Elke journey is kort, single-purpose, met assertions na elke significante navigatie-stap.

### Journey 1: Beursdag → verkoop → context behouden

```
describe('Journey: Fair day sale preserves context')
- Maak kunstwerk + beurs, koppel werk
- Activeer beursdag → assert /fairs/[id]/day
- Klik "Verkoop registreren" → assert /fairs/[id]/sales/new
- Sla verkoop op → land op /fairs/[id]
- Assert: beursdag-modus is nog actief (banner/sidebar zichtbaar)
- Navigeer terug naar beursdag via sidebar/banner → assert /fairs/[id]/day
- Assert: metrics bijgewerkt (1 verkoop zichtbaar)
```

**Dit test de `beforeRemove` bug hypothese.** Verschil met `fair-day-workflow.spec.ts`: die test checkt banner-aanwezigheid, maar navigeert niet expliciet terug naar het beursdag-scherm na de sale.

### Journey 2: Home Hub → verkoop registreren → juiste fair-context

```
describe('Journey: Home quick action to sale with fair context')
- Maak beurs (toekomstig) + kunstwerk, koppel werk
- Open Home → assert actieve/eerstvolgende beurs zichtbaar
- Klik "Verkoop registreren"
- Assert: op sale editor /fairs/[id]/sales/new met juiste fairId
- Assert: gekoppelde kunstwerken beschikbaar als kandidaat
```

### Journey 3: Beursdag → contact → return path + context behouden

```
describe('Journey: Fair day contact preserves context and returns correctly')
- Maak beurs, activeer beursdag → assert /fairs/[id]/day
- Klik "Contact toevoegen" → assert /contacts/new?fairId=[id]
- Vul contact in, sla op
- Assert: terug op /fairs/[id]/day (niet op contactenlijst)
- Assert: beursdag-modus nog actief
```

**Verschil met `fair-day-workflow.spec.ts`:** die test checkt het return-pad, maar niet expliciet dat beursdag actief blijft na de contact-save.

### Journey 4: Sidebar navigatie + actieve tab (tablet)

```
describe('Journey: Sidebar navigation and active state')
- Open Home → assert sidebar zichtbaar
- Navigeer naar Voorraad via sidebar → assert actieve tab = Voorraad
- Navigeer naar Beurzen → assert actieve tab = Beurzen
- Navigeer naar Contacten → assert actieve tab = Contacten
- Navigeer terug naar Home → assert actieve tab = Home
```

## Structuur

```
tests/e2e/journey-smoke.spec.ts
```

- Eén bestand, 4 `test.describe` blokken
- Elke journey heeft een duidelijke naam in gewone taal
- Hergebruikt bestaande helpers uit `tests/e2e/helpers.ts` (`createArtwork`, `createFair`, `assignArtworkToFair`)
- Nieuwe helpers alleen als echt nodig

## Relatie tot bestaande tests

- `journey-smoke.spec.ts` is **aanvullend**, niet vervangend
- Bestaande domein-tests dekken CRUD
- Journey tests dekken uitsluitend **cross-domein navigatie en context-retentie**
- Geen bewuste overlap met bestaande specs

## Verificatie

1. `npx playwright test tests/e2e/journey-smoke.spec.ts` — alle 4 journeys slagen
2. `npm run test:e2e` — volledige suite inclusief journeys
3. Bij failures: de journey-naam + assertion vertelt direct welke flow-stap breekt

## Prioritering

1. **Journey 1** (beursdag→verkoop→context) — test de gevonden bug-hypothese
2. **Journey 2** (Home→verkoop→fair-context) — kritiek pad
3. **Journey 3** (contact→beurs-context→return) — context-retentie
4. **Journey 4** (sidebar navigatie) — tablet-specifiek
