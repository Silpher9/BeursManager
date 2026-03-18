# Template: Smoke / Journey Test Plan

Gebruik dit template voor nieuwe Playwright smoke- of journey-testplannen.

Doel:
- alleen **echte gaten** in de bestaande e2e-dekking vullen
- geen duplicate testplannen maken
- journeys klein, single-purpose en onderhoudbaar houden

## 1. Context

Beschrijf kort:
- welk flowprobleem of risico je wilt afdekken
- waarom dit een smoke/journey-test moet zijn en geen gewone domein-test

Voorbeeld:
- context-retentie tussen schermen
- return-path na save
- tablet-specifieke navigatiestatus
- cross-domein flow tussen `fairs`, `sales`, `contacts`, `home`

## 2. Bestaande Dekking Eerst Controleren

Voordat je nieuwe tests voorstelt, **moet** je de bestaande specs in `tests/e2e/` nalopen.

Huidige referenties:
- `tests/e2e/smoke.spec.ts`
- `tests/e2e/fair-day-workflow.spec.ts`
- `tests/e2e/home.spec.ts`
- `tests/e2e/inventory.spec.ts`
- `tests/e2e/fairs.spec.ts`
- `tests/e2e/sales.spec.ts`
- `tests/e2e/contacts.spec.ts`
- `tests/e2e/reports.spec.ts`
- `tests/e2e/demo-seed.spec.ts`

Vul deze overlap-check altijd in:

| Bestaande spec | Relevante bestaande test(s) | Waarom onvoldoende / waarom geen overlap |
|---|---|---|
| `tests/e2e/...` | `test('...')` | ... |
| `tests/e2e/...` | `test('...')` | ... |

Regel:
- als een bestaande test het flowrisico al voldoende dekt, **geen nieuwe journey voorstellen**

## 3. Bestaande Smoke-Testplannen Ook Controleren

Controleer niet alleen bestaande testcode, maar ook al geschreven plannen die mogelijk nog niet geïmplementeerd zijn.

Te controleren mappen:
- `Plans/Smoke tests/`
- `Plans/Running/`

Vul deze check altijd in:

| Bestaand plan | Status | Relevante overlap | Waarom dit nieuwe plan toch nodig is |
|---|---|---|---|
| `Plans/...` | gepland / deels uitgevoerd / onbekend | ... | ... |

Regel:
- als een bestaand plan hetzelfde flowgat al scherp beschrijft, **geen tweede plan maken**
- werk het bestaande plan liever bij dan een nieuw duplicaat te starten

## 4. Naamconventie Voor Planbestanden

Sla nieuwe plannen op in:
- `Plans/Smoke tests/`

Gebruik bestandsnamen zoals:
- `<korte-naam>-smoke-tests.md`
- `<domein>-journey-smoke.md`

Voorbeelden:
- `fairday-smoke-tests.md`
- `home-quick-actions-smoke-tests.md`
- `sidebar-navigation-journey-smoke.md`

Regel:
- kies een naam die het **flowrisico** benoemt, niet alleen het domein

## 5. Scopegrenzen

Vul expliciet in:

- maximaal aantal nieuwe journeys in deze ronde: `3-5`
- voorgestelde bestandsnaam:
  - bij voorkeur `tests/e2e/<korte-naam>-smoke.spec.ts`
  - of toevoegen aan bestaande spec als dat logischer is
- wel binnen scope:
  - cross-domein navigatie
  - context-retentie
  - return paths
  - actieve UI-state na navigatie
- buiten scope:
  - volledige CRUD herhaling die al elders getest wordt
  - grote megaflows van 20+ stappen
  - visuele polish zonder functioneel risico

## 6. Voorgestelde Journeys

Per journey invullen:

### Journey X: [Korte naam]

```text
describe('Journey: ...')
- Startpunt:
- Kritieke overgang:
- Verwachte bestemming:
- Welke context moet behouden blijven:
- Welke zichtbare assertion bewijst dat:
```

Verplicht per journey:
- 1 duidelijk doel
- 1 duidelijk flowrisico
- assertions na elke significante navigatiestap

Niet doen:
- meerdere losse productvragen in 1 test proppen
- een flow toevoegen “omdat het wel handig is”

## 7. Waarom Deze Journey Nog Niet Gedekt Is

Per journey invullen:

| Journey | Niet gedekt door | Concrete reden |
|---|---|---|
| Journey 1 | `tests/e2e/...` | ... |
| Journey 2 | `tests/e2e/...` | ... |

Dit onderdeel is verplicht.
Zonder dit onderdeel is het plan niet scherp genoeg.

## 8. Testontwerpregels

Gebruik deze regels standaard:
- houd tests **kort en single-purpose**
- gebruik waar mogelijk bestaande helpers uit `tests/e2e/helpers.ts`
- voeg alleen nieuwe helpers toe als minstens 2 tests ze hergebruiken
- assert na elke save of navigate:
  - juiste URL of route
  - juiste primaire content zichtbaar
  - juiste context behouden
- gebruik gewone taal in testnamen

Aanbevolen patroon:
- `describe('Journey smoke: ...')`
- `test('preserves fair context after ...', async ({ page }) => { ... })`

## 9. Verificatie

Minimaal opnemen:

1. `npx playwright test tests/e2e/<bestand>.spec.ts`
2. `npm run test:e2e`
3. Bij failure moet direct duidelijk zijn:
   - welke journey faalde
   - welke overgang brak
   - welke context verloren ging

## 10. Definition Of Done

Een smoke/journey-testplan is pas goed als:
- overlap met bestaande specs expliciet is onderzocht
- overlap met bestaande smoke-testplannen expliciet is onderzocht
- er geen bewuste duplicaten worden toegevoegd
- de set klein blijft
- elke journey een concreet flowgat afdekt
- de journeys later als leesbare “living documentation” kunnen dienen

## Invulsjabloon

```md
# Plan: [Naam]

## Context
[Kort probleem]

## Bestaande Dekking Eerst Controleren
| Bestaande spec | Relevante bestaande test(s) | Waarom onvoldoende / waarom geen overlap |
|---|---|---|
| `tests/e2e/...` | `test('...')` | ... |

## Bestaande Smoke-Testplannen Ook Controleren
| Bestaand plan | Status | Relevante overlap | Waarom dit nieuwe plan toch nodig is |
|---|---|---|---|
| `Plans/...` | gepland / deels uitgevoerd / onbekend | ... | ... |

## Naamconventie Voor Planbestanden
- map: `Plans/Smoke tests/`
- bestandsnaam: `<korte-naam>-smoke-tests.md`

## Scopegrenzen
- maximaal aantal nieuwe journeys: ...
- bestandsnaam: ...
- binnen scope: ...
- buiten scope: ...

## Voorgestelde Journeys
### Journey 1: ...
```text
describe('Journey: ...')
- Startpunt:
- Kritieke overgang:
- Verwachte bestemming:
- Welke context moet behouden blijven:
- Welke zichtbare assertion bewijst dat:
```

## Waarom Deze Journey Nog Niet Gedekt Is
| Journey | Niet gedekt door | Concrete reden |
|---|---|---|
| Journey 1 | `tests/e2e/...` | ... |

## Verificatie
1. ...
2. ...
```
