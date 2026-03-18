# Refactorplan — Quality Round 2 (sales + home + shared `ChoiceChip`)

## Samenvatting

Er is nog een gerichte kwaliteitsronde nodig. De vorige grote opsplitsing is al gedaan, maar deze hotspots blijven over:

- `src/domains/sales/SaleEditorScreen.tsx`
- `src/domains/sales/SaleDetailScreen.tsx`
- `src/domains/home/HomeHubScreen.tsx`
- `ChoiceChip` is lokaal gedupliceerd in sales en contacten

Deze ronde pakt daarom:

- een shared `ChoiceChip`
- gedeelde sales-secties voor editor + detail
- opsplitsing van `HomeHubScreen`
- expliciet geen performance- of schemawerk

## Doel

1. `SaleEditorScreen` en `SaleDetailScreen` structureel gelijk trekken.
2. `ChoiceChip`-duplicatie verwijderen.
3. `HomeHubScreen` kleiner en leesbaarder maken zonder UI- of gedragswijziging.
4. Regressierisico laag houden door business logic en data flows intact te laten.

## Scope

Binnen scope:

- nieuwe shared `ChoiceChip`
- nieuwe gedeelde sales UI-secties in `src/domains/sales/components/`
- refactor van `SaleEditorScreen`
- refactor van `SaleDetailScreen`
- refactor van `HomeHubScreen`
- migratie van `ContactEditorScreen` naar shared `ChoiceChip`
- fix van de dode empty-state actie in `SaleDetailScreen`

Buiten scope:

- `ContactDetailScreen`
- inventory paginering / `FlatList`
- error boundaries
- repository- of schemawijzigingen
- redesign
- vervanging van `useAsyncEffect`

## Publieke API's / interfaces

### Nieuwe shared component

Bestand:
`src/shared/components/ChoiceChip.tsx`

```tsx
type ChoiceChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};
```

Defaults:

- zelfde gedrag als de huidige lokale `ChoiceChip`
- zelfde styling als nu
- geen extra props zoals `style`, `textStyle`, `disabled` of variants

### Nieuwe sales componenten

Map:
`src/domains/sales/components/`

Bestanden:

- `SalePricingCard.tsx`
- `SalePaymentStatusCard.tsx`
- `SalePaymentMethodCard.tsx`
- `SaleContactCard.tsx`

Voorgestelde props:

```tsx
type SalePricingCardProps = {
  askingPrice: string;
  discount: string;
  salePrice: number;
  summaryLabel: string;
  onChangeAskingPrice: (value: string) => void;
  onChangeDiscount: (value: string) => void;
};

type SalePaymentStatusCardProps = {
  value: PaymentStatus;
  onChange: (value: PaymentStatus) => void;
};

type SalePaymentMethodCardProps = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  hintText?: string;
};

type SaleContactCardProps = {
  contacts: Contact[];
  selectedContactId: string;
  newContactName: string;
  newContactEmail: string;
  newContactPhone: string;
  selectedContact: Contact | null;
  selectedContactHint?: string | null;
  noContactLabel?: string;
  nameLabel: string;
  onSelectNoContact: () => void;
  onSelectExistingContact: (contactId: string) => void;
  onChangeName: (value: string) => void;
  onChangeEmail: (value: string) => void;
  onChangePhone: (value: string) => void;
};
```

Geen wijziging aan:

- routes
- repositories
- database schema
- `SaleEditorValues`
- `ContactEditorValues`

## Ontwerpkeuzes

- `FilterChip` en `ChoiceChip` blijven aparte shared componenten.
- Sales-secties worden gedeeld als domeincomponenten in losse bestanden.
- `SaleContactCard` krijgt alleen contact-gerelateerde velden en callbacks, niet het hele `SaleEditorValues` object.
- `HomeHubScreen` wordt in eerste instantie opgesplitst in lokale sub-componenten; als dat bestand alsnog onrustig blijft, mag dit alsnog naar `src/domains/home/components/`.
- `useAsyncEffect` blijft in gebruik.
- `StyleSheet.create()` blijft per bestand het patroon.

## Uitvoeringsplan

### Stap 1 — Shared `ChoiceChip`

Nieuw bestand:

- `src/shared/components/ChoiceChip.tsx`

Migreren:

- `src/domains/sales/SaleEditorScreen.tsx`
- `src/domains/sales/SaleDetailScreen.tsx`
- `src/domains/contacts/ContactEditorScreen.tsx`

Werk:

- verplaats de huidige lokale implementatie naar één shared component
- verwijder lokale `ChoiceChip` functies en chip-styles uit de drie schermen
- behoud styling exact

Acceptatiecriteria:

- alle drie schermen gebruiken shared `ChoiceChip`
- geen lokale `ChoiceChip` meer in deze bestanden
- visueel en functioneel gedrag blijft gelijk

### Stap 2 — Gedeelde sales-secties

Nieuwe bestanden:

- `src/domains/sales/components/SalePricingCard.tsx`
- `src/domains/sales/components/SalePaymentStatusCard.tsx`
- `src/domains/sales/components/SalePaymentMethodCard.tsx`
- `src/domains/sales/components/SaleContactCard.tsx`

Werk:

- verplaats alleen renderverantwoordelijkheid
- laat validatie, state, save, load en derived values in de screens
- gebruik shared `ChoiceChip` in de nieuwe componenten
- gebruik bestaande `Card`, `Field`, `formatPrice`
- geef aan `SaleContactCard` alleen de contactvelden door die het echt rendert

Inhoud:

- `SalePricingCard`: vraagprijs, korting, samenvattingsstrip
- `SalePaymentStatusCard`: chips voor `paymentStatuses`
- `SalePaymentMethodCard`: chips voor `paymentMethods` + optionele hint
- `SaleContactCard`: geen-contact chip, bestaande contacten, naam/e-mail/telefoon

Acceptatiecriteria:

- beide sales-schermen gebruiken dezelfde vier secties
- geen fetches of side effects in de nieuwe componenten
- geen wijziging in validatie of navigatie
- `SaleContactCard` hangt niet direct aan het volledige `SaleEditorValues` model

### Stap 3 — `SaleEditorScreen`

Bestand:

- `src/domains/sales/SaleEditorScreen.tsx`

Lokale sub-componenten:

- `SaleEditorIntroCard`
- `SaleCandidateSelectionCard`

Root behoudt:

- `useAsyncEffect`
- `selectedCandidate`
- `selectedContact`
- `computedSalePrice`
- `setValue`
- `handleSelectCandidate`
- `handleSelectExistingContact`
- `handleSave`

Werk:

- introkaart lokaal maken
- kandidaatselectie lokaal maken
- overige kaarten vervangen door shared sales-secties

Acceptatiecriteria:

- flow blijft gelijk
- redirect blijft naar `/fairs/${fairId}`
- validatiefouten blijven op dezelfde plek zichtbaar

### Stap 4 — `SaleDetailScreen`

Bestand:

- `src/domains/sales/SaleDetailScreen.tsx`

Lokale sub-componenten:

- `SaleDetailHeroCard`
- `SaleSummaryCard`
- `SaleCorrectionCard`

Root behoudt:

- `useIsFocused`
- `useAsyncEffect`
- `sale`, `contacts`, `values`
- `editing`, `saving`, `error`
- `computedSalePrice`
- `selectedContact`
- `setValue`
- `handleSave`

Werk:

- read-only detailblokken lokaal houden
- editing mode laten renderen via dezelfde shared sales-secties als `SaleEditorScreen`
- lege verkoop-state krijgt een werkende terugnavigatie of wordt expliciet als deferred bug gedocumenteerd

Defaults:

- `summaryLabel` in pricing-card: `Nieuwe verkoopprijs`
- `nameLabel` in contact-card: `Of maak nieuwe koper aan`

Acceptatiecriteria:

- niet-editing mode blijft ongewijzigd
- editing mode gebruikt dezelfde invoersecties als `SaleEditorScreen`
- na save blijft huidige refresh-flow intact
- de empty-state actie bij “Verkoop niet gevonden” doet niet langer niets

### Stap 5 — `HomeHubScreen`

Bestand:

- `src/domains/home/HomeHubScreen.tsx`

Lokale sub-componenten:

- `HomeIntroCard`
- `PrimaryFairCard`
- `QuickActionsCard`
- `QuickActionTile`
- `SummaryCard`
- `RecentFairResultCard`
- bestaande `MetricTile` blijft

Root behoudt:

- data loading
- `actionTiles`
- responsive branching
- loading/error/content switch

Props:

- `PrimaryFairCard`: `primaryFair`, `onOpenFair`
- `QuickActionsCard`: `tiles`, `isTablet`, `compactActions`
- `QuickActionTile`: `label`, `description`, `icon`, `accentColor`, `surfaceColor`, `onPress`, `fullWidth`
- `SummaryCard`: `summary`
- `RecentFairResultCard`: `recentFairResult`, `onOpenFair`

Acceptatiecriteria:

- home blijft default landing page
- quick actions werken hetzelfde
- tablet/mobile layout blijft gelijk
- inhoud/copy blijft gelijk

## Bestandenoverzicht

Nieuwe bestanden:

- `src/shared/components/ChoiceChip.tsx`
- `src/domains/sales/components/SalePricingCard.tsx`
- `src/domains/sales/components/SalePaymentStatusCard.tsx`
- `src/domains/sales/components/SalePaymentMethodCard.tsx`
- `src/domains/sales/components/SaleContactCard.tsx`

Te wijzigen:

- `src/domains/sales/SaleEditorScreen.tsx`
- `src/domains/sales/SaleDetailScreen.tsx`
- `src/domains/home/HomeHubScreen.tsx`
- `src/domains/contacts/ContactEditorScreen.tsx`

Niet wijzigen:

- `src/domains/contacts/ContactDetailScreen.tsx`
- inventory schermen
- repositories
- db migraties

## Testplan

### Technisch

1. `npm run typecheck`
2. `npm run test:unit`
3. Gerichte e2e:
   - `npx playwright test tests/e2e/sales.spec.ts`
   - `npx playwright test tests/e2e/home.spec.ts`
   - `npx playwright test tests/e2e/contacts.spec.ts`
4. Volledige e2e:
   - `npm run test:e2e`

### Nieuwe of aangescherpte tests

#### `tests/e2e/sales.spec.ts`

Voeg scenario toe:

- maak kunstwerk + beurs + sale
- open sale detail
- klik `Bewerken`
- wijzig korting of betaalstatus
- sla op
- controleer dat read-only detail de nieuwe waarden toont

Voeg scenario toe:

- maak kunstwerk + beurs
- open verkoop-editor
- kies bestaand contact
- schakel daarna over naar nieuwe koper
- sla op
- controleer dat de verkoop correct is opgeslagen met de verwachte contact-uitkomst

#### `tests/e2e/home.spec.ts`

Voeg scenario toe:

- maak beurs aan
- open `/`
- controleer “Actieve of eerstvolgende beurs”
- klik `Open beurs`
- controleer navigatie naar `/fairs/:id`

#### `tests/e2e/contacts.spec.ts`

Geen nieuwe test nodig; bestaande typechip-flow dekt `ChoiceChip`-migratie al af.

### Handmatige regressiechecks

1. `SaleEditorScreen`
- kandidaat wisselen
- bestaand contact kiezen
- `Geen contact` kiezen
- nieuwe koper invullen
- verkoop opslaan

2. `SaleDetailScreen`
- detail openen
- correctiemodus openen
- contact wisselen
- betaalstatus en methode aanpassen
- opslaan en read-only detail verifiëren

3. `HomeHubScreen`
- mobiel controleren
- tablet/brede viewport controleren
- quick actions klikken
- recente beursresultaten met en zonder data controleren

4. `ContactEditorScreen`
- typechip kiezen
- formulier opslaan
- visueel geen verschil

## Risico's en mitigatie

### Risico 1 — editor en detail gaan alsnog uiteenlopen

Mitigatie:

- gedeelde sales-secties
- extra sales e2e voor correctieflow

### Risico 2 — `ChoiceChip` wordt te generiek

Mitigatie:

- minimale huidige API houden
- geen style overrides of varianten

### Risico 3 — home-layout wijzigt ongemerkt

Mitigatie:

- responsive branching in root laten
- alleen JSX verplaatsen
- handmatige viewport-check verplicht

### Risico 4 — renderrefactor raakt business logic

Mitigatie:

- state, side effects en repositories in root screens laten
- nieuwe componenten render-only houden

## Definition of Done

De ronde is klaar als:

- `ChoiceChip` nog maar op één plek bestaat
- `SaleEditorScreen` en `SaleDetailScreen` dezelfde gedeelde sales-secties gebruiken
- `HomeHubScreen` opgesplitst is in lokale sub-componenten
- er geen route-, schema- of repositorywijzigingen nodig waren
- typecheck, unit tests en e2e slagen
- handmatige regressiechecks geen afwijkingen tonen

## Aannames en defaults

- Dit is een quality round, geen performance round.
- `ContactDetailScreen` blijft buiten scope.
- `FilterChip` blijft ongewijzigd.
- Sales-secties worden gedeeld via `src/domains/sales/components/`.
- Het beoogde bestandsdoel is:
  `/home/damonbot/Documents/GitRepos/BeursManager/Plans/Running/refactor-quality-round-2-plan.md`
