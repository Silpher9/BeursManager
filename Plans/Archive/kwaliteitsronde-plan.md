# Kwaliteitsronde — focus refresh fix + componenten opsplitsen

## Doel

Deze kwaliteitsronde heeft twee doelen:

1. Een concrete bug oplossen: `ArtworkDetailScreen` toont stale data na terugnavigeren vanuit bewerken.
2. Drie grote schermcomponenten kleiner en leesbaarder maken zonder gedrag of UI zichtbaar te veranderen.

## Scope

Binnen scope:

- `useIsFocused`-fix in `ArtworkDetailScreen`
- `FilterChip` centraliseren naar een shared component
- Grote renderblokken opsplitsen in lokale sub-componenten in hetzelfde bestand

Buiten scope:

- Nieuwe schermarchitectuur of mapstructuur
- Nieuwe state management patterns
- Visuele redesigns
- Functionele uitbreidingen

## Bestanden

### Nieuw bestand

| Bestand | Beschrijving |
|---------|-------------|
| `src/shared/components/FilterChip.tsx` | Gedeelde FilterChip voor beurzen, voorraad en rapporten |

### Te wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/domains/inventory/ArtworkDetailScreen.tsx` | `useIsFocused` toevoegen voor refresh bij terugkeer naar detail |
| `src/domains/fairs/FairDetailScreen.tsx` | Render opsplitsen in lokale sub-componenten + shared `FilterChip` gebruiken |
| `src/domains/inventory/ArtworkEditorScreen.tsx` | Render opsplitsen in lokale sub-componenten |
| `app/(tabs)/inventory/index.tsx` | Render opsplitsen in lokale sub-componenten + shared `FilterChip` gebruiken |
| `src/domains/reports/ReportsScreen.tsx` | Lokale `FilterChip` vervangen door shared import |

## Werkvolgorde

De volgorde hieronder houdt de risicovolste wijziging klein en controleerbaar:

1. Bugfix in `ArtworkDetailScreen`
2. `FilterChip` centraliseren
3. `FairDetailScreen` opsplitsen
4. `ArtworkEditorScreen` opsplitsen
5. `inventory/index` opsplitsen
6. Typecheck, unit tests, e2e en handmatige regressiechecks

## Stap 1 — `useIsFocused` in `ArtworkDetailScreen`

Bestand: `src/domains/inventory/ArtworkDetailScreen.tsx`

### Wijziging

- Import `useIsFocused` uit `@react-navigation/native`
- Hook toevoegen: `const isFocused = useIsFocused();`
- Vroegtijdige guard in de bestaande laad-`useEffect`: `if (!isFocused) return;`
- Dependency array aanpassen naar `[artworkId, db, isFocused]`
- Patroon spiegelen aan `FairDetailScreen`

### Acceptatiecriteria

- Bij openen van het detailscherm laadt het kunstwerk zoals nu
- Na navigeren naar bewerken en terugkeren naar detail wordt data opnieuw opgehaald
- Er is geen dubbele fout- of loading-state door focuswissels

### Handmatige check

- Open een bestaand kunstwerk
- Wijzig titel of prijs in de editor
- Ga terug naar detail
- De nieuwe waarde is direct zichtbaar zonder app refresh

## Stap 2 — `FilterChip` naar shared component

Nieuw bestand: `src/shared/components/FilterChip.tsx`

### Gewenste API

Start klein en bewust:

```tsx
type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};
```

Geen extra props toevoegen tenzij tijdens implementatie blijkt dat dit direct nodig is. Doel is duplicatie verwijderen, niet een generiek mini-design-system bouwen.

### Te vervangen lokale implementaties

- `src/domains/fairs/FairDetailScreen.tsx`
- `app/(tabs)/inventory/index.tsx`
- `src/domains/reports/ReportsScreen.tsx`

### Acceptatiecriteria

- Alle drie schermen gebruiken dezelfde shared component
- De bestaande styling blijft visueel gelijk
- Lokale `FilterChip` functies en bijbehorende stijlen zijn verwijderd uit de drie schermen

### Handmatige check

- Open beurzen detail, voorraad en rapporten
- Vergelijk chip states: default, active, pressed
- Er is geen zichtbaar verschil in spacing, kleur of typografie

## Stap 3 — `FairDetailScreen` opsplitsen

Bestand: `src/domains/fairs/FairDetailScreen.tsx`

Huidige grootte: 836 regels

### Doel

Alle state, data loading en handlers blijven in de root component. Alleen renderverantwoordelijkheid gaat naar lokale sub-componenten binnen hetzelfde bestand.

### Lokale sub-componenten

| Sub-component | Props | Rendert |
|---------------|-------|---------|
| `FairHeaderCard` | `fair: Fair` | Kicker, titel, locatie, datum, notities |
| `FairMetricsCard` | `assignedCount, salesCount, salesTotal, expensesTotal, fairResult, fair, fairDay callbacks` | Metrics + FairDay toggle |
| `FairExpensesCard` | `fairId, expenses[]` | Kostenlijst + knop voor nieuwe kostenpost |
| `FairSalesCard` | `fairId, sales[]` | Verkopenlijst met thumbnails |
| `FairSelectionCard` | `assignedItems[], assignedCount` | Overzicht gekoppelde werken |
| `FairAssignmentCard` | `assignments[], artistOptions, selectedArtist, savingArtworkId, callbacks` | Koppellijst + kunstenaarfilter |

### Acceptatiecriteria

- Het root return-blok wordt substantieel korter en blijft leesbaar
- Root behoudt state, `useEffect`s, `useMemo`s en side effects
- Geen sub-component voert eigen data fetching uit
- `selectedArtist` filtering werkt identiek aan nu
- FairDay toggle werkt ongewijzigd

### Handmatige regressiechecks

- Open beursdetail met gekoppelde werken
- Filter op kunstenaar en controleer selectie- en assignment-secties
- Open een verkoop vanuit het overzicht
- Open een kostenpostflow
- Zet FairDay aan en uit

## Stap 4 — `ArtworkEditorScreen` opsplitsen

Bestand: `src/domains/inventory/ArtworkEditorScreen.tsx`

Huidige grootte: 646 regels

### Doel

Render opdelen zonder save-flow, photo-flow of validatiegedrag te wijzigen.

### Lokale sub-componenten

| Sub-component | Props | Rendert |
|---------------|-------|---------|
| `PhotoSection` | `photoPath, onTake, onPick, onRemove` | Foto-preview + drie acties |
| `ArtistSection` | `artistName, artists[], pickerOpen, callbacks` | Dropdown, chips en invoerveld |
| `BasicInfoSection` | `values (title/technique/series/year), onChangeValue` | Basisvelden |
| `DimensionsSection` | `values (h/w/d/price), onChangeValue` | Afmetingen en prijs |
| `StatusSection` | `status, onChangeStatus` | Statuschips |

### Acceptatiecriteria

- `handleSave` blijft in de root component
- Image picker en camera flows blijven in de root component
- Validatiefouten worden nog steeds op dezelfde plek getoond
- Bestaande statusselectie blijft werken

### Handmatige regressiechecks

- Open bestaand kunstwerk en sla zonder wijziging op
- Wijzig foto, verwijder foto en controleer preview
- Wijzig kunstenaar via suggestie en via vrije invoer
- Maak een validatiefout en controleer foutmelding

## Stap 5 — `inventory/index` opsplitsen

Bestand: `app/(tabs)/inventory/index.tsx`

Huidige grootte: 537 regels

### Lokale sub-componenten

| Sub-component | Props | Rendert |
|---------------|-------|---------|
| `InventoryStatsCard` | `totalCount, available, reserved, askingPriceTotal` | Hero card met kernstatistieken |
| `InventoryFilterCard` | `searchQuery, selectedStatus, selectedSeries, selectedArtist, options[], callbacks` | Zoekveld en drie filtergroepen |
| `ArtworkGridItem` | `artwork, cardWidth` | Enkele artworkkaart in de grid |

### Acceptatiecriteria

- Filtergedrag blijft identiek
- Zoekgedrag blijft identiek
- Gridlayout blijft identiek op telefoon en tablet
- Shared `FilterChip` is in gebruik

### Handmatige regressiechecks

- Wissel status-, serie- en kunstenaarfilters
- Combineer filters met een zoekterm
- Open een kunstwerkkaart vanuit de grid
- Controleer layout op smalle en brede viewport

## Implementatierichtlijnen

- Sub-componenten blijven lokaal in hetzelfde bestand
- Styles blijven per bestand in één `StyleSheet.create()`
- Props zijn expliciet; geen implicit state sharing
- Geen nieuwe context, hooks of abstractions tenzij nodig om regressie te voorkomen
- Als een sub-component te veel props krijgt, eerst groeperen op semantiek, niet direct externaliseren

## Risico's en mitigatie

### Risico 1 — stille UI-regressie door render-splitsing

Mitigatie:

- Alleen render verplaatsen, geen logica herschrijven zonder noodzaak
- Na elke stap handmatig controleren voordat de volgende begint

### Risico 2 — `FilterChip` wordt te generiek of juist te beperkt

Mitigatie:

- Start met de minimale huidige API
- Alleen uitbreiden als een bestaand scherm anders niet zonder afwijking kan migreren

### Risico 3 — focus-fix veroorzaakt extra fetches of stateflikkering

Mitigatie:

- Alleen refetch bij actieve focus
- Bestaande loading/error-flow behouden

## Verificatie

### Technisch

1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run test:e2e`

### Handmatig

1. `ArtworkDetailScreen`: edit -> terug naar detail -> nieuwe data direct zichtbaar
2. `FairDetailScreen`: kunstenaarfilter, verkopen, kosten en FairDay werken ongewijzigd
3. `ArtworkEditorScreen`: save, validatie en photo actions werken ongewijzigd
4. `inventory/index`: zoeken, filters en gridnavigatie werken ongewijzigd
5. `ReportsScreen`: jaarchips werken visueel en functioneel hetzelfde

## Definition of Done

De kwaliteitsronde is klaar als:

- De stale-data bug aantoonbaar weg is
- `FilterChip` nog maar op één plek gedefinieerd is
- De drie grote schermen merkbaar kleiner en leesbaarder zijn
- Typecheck, unit tests en e2e slagen
- Handmatige regressiechecks zonder afwijkingen zijn doorlopen
