# Refactorplan — Quality Round 3 (fairs + expenses + sales form cleanup + e2e stability)

## Samenvatting

De vorige ronde heeft sales, home en de gedeelde `ChoiceChip` al opgeruimd. De volgende logische hotspots zijn nu:

- `src/domains/fairs/FairDetailScreen.tsx`
- `src/domains/expenses/ExpenseEditorScreen.tsx`
- resterende dubbele sales-form mutatielogica
- de hangende volledige e2e-run door `tests/e2e/demo-seed.spec.ts`

Deze ronde focust daarom op:

- opsplitsing van `FairDetailScreen`
- migratie van `ExpenseEditorScreen` naar shared `ChoiceChip`
- beperkte harmonisatie van sales form state-updates
- stabiliseren of isoleren van de demo-seed e2e-flow als vroege testblocker

## Doel

1. `FairDetailScreen` kleiner en onderhoudbaarder maken zonder gedragswijziging.
2. Laatste lokale `ChoiceChip`-duplicatie verwijderen uit expenses.
3. Dubbele sales-form updatepaden verkleinen zonder repository- of validatiewijzigingen.
4. De volledige e2e-run weer bruikbaar maken door de demo-seed flow te repareren of expliciet te isoleren.

## Scope

Binnen scope:

- nieuwe fairs componenten in `src/domains/fairs/components/`
- refactor van `src/domains/fairs/FairDetailScreen.tsx`
- migratie van `src/domains/expenses/ExpenseEditorScreen.tsx` naar shared `ChoiceChip`
- optionele kleine shared helper voor sales form mutaties
- onderzoek en fix voor `tests/e2e/demo-seed.spec.ts`

Buiten scope:

- repository-wijzigingen voor fairs, expenses of sales tenzij strikt nodig voor teststabiliteit
- redesign
- aanpassing van database schema
- grote refactor van `ArtworkEditorScreen`
- nieuwe performance- of cachinglaag

## Publieke API's / interfaces

### Nieuwe fairs componenten

Map:
`src/domains/fairs/components/`

Voorgestelde bestanden:

- `FairHeaderCard.tsx`
- `FairMetricsCard.tsx`
- `FairExpensesCard.tsx`
- `FairSalesCard.tsx`
- `FairSelectionCard.tsx`
- `FairAssignmentCard.tsx`

Richtlijn:

- componenten krijgen alleen data en callbacks die ze echt renderen of gebruiken
- fetches, derived totals en screen-level navigatiebeslissingen blijven in `FairDetailScreen`

### Eventuele sales helper

Alleen als het tijdens implementatie echt helpt:

- `src/domains/sales/form-state.ts`

Gebruik:

- centraliseert alleen `setValue`, contact reset/select gedrag en eenvoudige mutatiehelpers
- geen side effects
- geen repository calls
- geen nieuwe state-owner of lifecycle-laag

## Ontwerpkeuzes

- `FairDetailScreen` houdt loading, refresh, totals, filtering en destructive actions in de root.
- Subcomponenten in fairs krijgen renderverantwoordelijkheid, geen data-loading.
- `ExpenseEditorScreen` gebruikt exact dezelfde shared `ChoiceChip` als contacts en sales.
- `FairDetailScreen`-werk is primair extractie van al bestaande lokale subcomponenten naar `src/domains/fairs/components/`, niet een nieuwe decompositie vanaf nul.
- Sales cleanup blijft klein: geen grote architectuurwissel, alleen duplicatie weghalen.
- Demo-seed e2e mag desnoods tijdelijk apart gemarkeerd of seriëler gemaakt worden als dat nodig is om de rest van de suite betrouwbaar te houden, maar alleen met duidelijke motivatie.

## Uitvoeringsplan

### Stap 1 — `ExpenseEditorScreen` naar shared `ChoiceChip`

Bestand:

- `src/domains/expenses/ExpenseEditorScreen.tsx`

Werk:

- vervang lokale `ChoiceChip` door `src/shared/components/ChoiceChip.tsx`
- verwijder lokale chip-styles en lokale implementatie
- behoud gedrag en styling exact

Acceptatiecriteria:

- geen lokale `ChoiceChip` meer in expenses
- bestaande expense-flow blijft intact

### Stap 2 — `FairDetailScreen` opsplitsen

Bestand:

- `src/domains/fairs/FairDetailScreen.tsx`

Nieuwe map:

- `src/domains/fairs/components/`

Lokale root behoudt:

- `useAsyncEffect`
- loading/error switch
- delete flow
- fair-day activeren/deactiveren
- totalen en filters
- repository calls

Werk:

- verplaats bestaande lokale subcomponenten uit `FairDetailScreen.tsx` naar losse bestanden in `src/domains/fairs/components/`
- geef alleen minimale props door
- behoud huidige copy, volgorde en navigatie

Acceptatiecriteria:

- `FairDetailScreen` wordt substantieel kleiner
- bestaande sales-, expenses- en assignment-acties werken hetzelfde
- geen functionele wijziging in filtering of delete-flow

### Stap 3 — Demo-seed e2e diagnose en fix

Bestand:

- `tests/e2e/demo-seed.spec.ts`

Werk:

- vaststellen waarom de flow hangt
- selector- of timingprobleem repareren
- indien nodig lange seedstap explicieter synchroniseren
- alleen als laatste redmiddel: test apart markeren of runstrategie aanpassen

Acceptatiecriteria:

- `npx playwright test tests/e2e/demo-seed.spec.ts` eindigt weer betrouwbaar
- `npm run test:e2e` loopt door zonder onverklaarde hang

### Stap 4 — Kleine sales form harmonisatie

Bestanden:

- `src/domains/sales/SaleEditorScreen.tsx`
- `src/domains/sales/SaleDetailScreen.tsx`
- optioneel nieuw helperbestand `src/domains/sales/form-state.ts`

Werk:

- trek dubbele contactmutaties en `setValue`-achtige helpers gelijk
- verminder inline object-updates waar dat de leesbaarheid vergroot
- laat validatie en save-flow ongewijzigd

Acceptatiecriteria:

- minder duplicatie tussen editor en detail
- geen wijziging in validatieberichten, save-flow of navigatie

## Bestandenoverzicht

Nieuwe bestanden:

- `src/domains/fairs/components/FairHeaderCard.tsx`
- `src/domains/fairs/components/FairMetricsCard.tsx`
- `src/domains/fairs/components/FairExpensesCard.tsx`
- `src/domains/fairs/components/FairSalesCard.tsx`
- `src/domains/fairs/components/FairSelectionCard.tsx`
- `src/domains/fairs/components/FairAssignmentCard.tsx`
- optioneel: `src/domains/sales/form-state.ts`

Te wijzigen:

- `src/domains/fairs/FairDetailScreen.tsx`
- `src/domains/expenses/ExpenseEditorScreen.tsx`
- `src/domains/sales/SaleEditorScreen.tsx`
- `src/domains/sales/SaleDetailScreen.tsx`
- `tests/e2e/demo-seed.spec.ts`

Waarschijnlijk niet wijzigen:

- repositories
- db migraties
- inventory schermen
- contact detail

## Testplan

### Technisch

1. `npm run typecheck`
2. `npm run test:unit`
3. Gerichte e2e:
   - `npx playwright test tests/e2e/fairs.spec.ts`
   - `npx playwright test tests/e2e/sales.spec.ts`
   - `npx playwright test tests/e2e/demo-seed.spec.ts`
4. Volledige e2e:
   - `npm run test:e2e`

### Nieuwe of aangescherpte tests

#### `tests/e2e/fairs.spec.ts`

Controleer extra scenario's als bestaande dekking onvoldoende blijkt:

- open beursdetail
- open verkoop uit sales-lijst
- open expense-flow
- toggle gekoppeld kunstwerk

Doel:

- bevestigen dat opgesplitste fair-cards dezelfde acties blijven uitvoeren

#### `tests/e2e/demo-seed.spec.ts`

Geen extra functioneel scenario nodig als de bestaande test stabiel gemaakt kan worden.

Wel aanscherpen:

- expliciete synchronisatie rond seed-start en seed-klaar status
- duidelijke timeout per stap in plaats van stille hang

## Handmatige regressiechecks

1. `FairDetailScreen`
- beurs openen
- sales-lijst openen
- expense toevoegen
- kunstwerk koppelen/ontkoppelen
- fair day activeren
- beurs verwijderen alleen visueel/flowmatig controleren in veilige testdata

2. `ExpenseEditorScreen`
- categoriekeuze wijzigen
- expense opslaan

3. Sales correctieflow
- contact wisselen
- nieuwe koper invullen
- save en detailcontrole

4. Demo seed
- settings openen
- seed starten
- voorraad openen
- testdataset zichtbaar

## Risico's en mitigatie

### Risico 1 — `FairDetailScreen`-splitsing breekt callbacks of navigatie

Mitigatie:

- render-only subcomponenten
- root houdt callbacks en router-acties
- gerichte fairs e2e

### Risico 2 — sales cleanup wordt te abstract

Mitigatie:

- alleen kleine helper introduceren
- geen generiek form framework bouwen

### Risico 3 — demo-seed probleem zit buiten de test zelf

Mitigatie:

- eerst vaststellen of de hang in UI, netwerk of seed-script zit
- fix minimaal houden en oorzaak documenteren

## Aanbevolen volgorde

1. `ExpenseEditorScreen`
2. `FairDetailScreen`
3. demo-seed e2e fix
4. sales form cleanup

Reden:

- eerst veilige UI-duplicatie opruimen
- daarna grootste maintainability-winst pakken
- daarna suite-blocker herstellen zodat volledige validatie weer bruikbaar is
- pas daarna kleine harmonisatie op sales
