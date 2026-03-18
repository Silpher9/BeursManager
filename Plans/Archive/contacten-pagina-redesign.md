# Plan: Contactenpagina redesign

## Context

De contactenpagina (`app/(tabs)/contacts/index.tsx`) wijkt qua opbouw af van het patroon dat bij Voorraadbeheer is neergezet. Er zijn drie losse eilanden bovenaan (ScreenHeader, uitlegtekst-kaart, stats-kaart) en er ontbreekt een beursfilter. Beurzen herhalen jaarlijks op dezelfde locatie, dus beursnamen zonder jaartal zijn ambigue.

## Ontwerpdoel

- Consistent met het Voorraadbeheer-patroon: één hero-Card met titel, stats en actie
- Overbodige uitlegtekst verwijderen
- Beursfilter toevoegen als dropdown (niet chips, want die schalen slecht over meerdere jaren)
- Beursnamen in de dropdown krijgen een jaartal-suffix

## Stap 1: Hero-Card consistent maken met Voorraadbeheer

**Bestand:** `app/(tabs)/contacts/index.tsx`

### Huidige situatie

Drie losse bovenste elementen:
1. `ScreenHeader` met titel "Contacten" + "Toevoegen" button
2. `Card` met uitlegtekst ("Sla snel kopers en geïnteresseerden op...")
3. `Card` met 4 stat-blokken (alleen zichtbaar als `contacts.length > 0`)

### Gewenste situatie

Eén `Card` (altijd zichtbaar, ook bij 0 contacten):
- `heroTitle`: "Contacten" (fontSize 28, fontWeight 700 — zelfde stijl als Voorraad)
- 4 stat-blokken: totaal, kopers, geïnteresseerd, galeriehouders
- `Toevoegen` button onderaan (Link naar `/contacts/new`, met `activeFair` fairId als beschikbaar)

### Consistente add-contact routes

**Alle** entry points voor "contact toevoegen" op deze pagina moeten dezelfde route-opbouw gebruiken:
- Hero-Card button: `activeFair ? /contacts/new?fairId=${activeFair.fairId} : /contacts/new`
- Empty-state actie ("Nieuw contact"): **zelfde route** met `activeFair` prefill
- Geen verschil in gedrag tussen hero en empty-state

### Wat verdwijnt

- `ScreenHeader` import en gebruik
- De uitlegtekst-Card ("Sla snel kopers en geïnteresseerden op...")
- De aparte stats-Card (opgenomen in hero)

### Wat verandert

- Stats worden altijd getoond (bij 0 contacten staan alle waarden op 0)
- De `statsRow` krijgt `flexWrap: 'wrap'` en `minWidth: 120` op `statBlock` (responsive 2x2 wrapping, consistent met Voorraad)

## Stap 2: Lokale FilterChip vervangen door gedeelde component

**Bestand:** `app/(tabs)/contacts/index.tsx`

### Huidige situatie

De contactenpagina definieert een eigen lokale `FilterChip` functie (regels 232-254) met eigen styles. Er bestaat al een gedeelde `FilterChip` component in `src/shared/components/FilterChip.tsx` met dezelfde functionaliteit.

### Gewenste situatie

- Verwijder de lokale `FilterChip` functie en bijbehorende styles (`filterChip`, `filterChipActive`, `filterChipPressed`, `filterChipLabel`, `filterChipLabelActive`)
- Importeer `FilterChip` uit `@/src/shared/components/FilterChip`
- Vervang de lokale `ScrollView`-wrapper door een `View` met `flexWrap: 'wrap'` (consistent met Voorraad)

## Stap 3: Beursfilter als dropdown toevoegen

### 3a: Repository — beurzenlijst ophalen

**Bestand:** `src/domains/contacts/repository.ts`

Nieuwe functie:

```ts
type FairFilterOption = {
  id: string;
  label: string;  // "Affordable Art Fair Amsterdam (2026)"
};

export async function listContactFairOptions(db: SQLiteDatabase): Promise<FairFilterOption[]>
```

Query:
```sql
SELECT DISTINCT fairs.id, fairs.name, fairs.start_date
FROM contacts
INNER JOIN fairs ON fairs.id = contacts.fair_id
ORDER BY fairs.start_date DESC
```

Alleen beurzen tonen waar daadwerkelijk contacten aan gekoppeld zijn. Zo blijft de dropdown relevant en compact.

Label-formattering:
- Met `start_date`: `${name} (${year})` — jaar extraheren via `start_date.slice(0, 4)`
- Zonder `start_date`: `${name}` (geen jaartal)

### 3b: Types uitbreiden

**Bestand:** `src/domains/contacts/types.ts`

```ts
export type FairFilterOption = {
  id: string;
  label: string;
};
```

### 3c: UI — dropdown in filterkaart

**Bestand:** `app/(tabs)/contacts/index.tsx`

Nieuwe state:
```ts
const [selectedFairId, setSelectedFairId] = useState<string | 'all'>('all');
const [fairOptions, setFairOptions] = useState<FairFilterOption[]>([]);
```

`fairOptions` ophalen in de bestaande `useAsyncEffect` naast `listContacts`.

#### Dropdown-component

Lokale component `FairDropdown` in hetzelfde bestand.

**Belangrijk:** geen absolute-positioned overlay gebruiken. Het contactenscherm draait in een `ScrollView`, en een lokale overlay geeft problemen met layering, clipping en buiten-klik-detectie. In plaats daarvan: **Modal-based picker**, consistent met het bestaande `ArtworkInterestPicker.tsx` patroon in het contacts-domein.

Trigger-element (altijd zichtbaar in de filterkaart):
- `Pressable` die de huidige selectie toont
- Gestyled als een form-achtig veld: `borderRadius: 16`, `borderWidth: 1`, `borderColor: palette.border`, `backgroundColor: '#FCFAF6'` (zelfde als searchInput)
- Tekst: geselecteerde beursnaam of "Alle beurzen"
- Chevron-icoon rechts (▼ via tekst, geen icon-library)
- Bij press: open een `Modal` met de optielijst

#### Modal-opties

- React Native `Modal` (transparent, animationType 'fade' of 'slide')
- Lijst van `FairFilterOption` items + "Alle beurzen" bovenaan
- Elke optie is een `Pressable` met tekst
- Actieve optie: `accent` achtergrondkleur + witte tekst (consistent met FilterChip)
- Bij selectie: sluit modal, update `selectedFairId`
- Modal sluit ook bij press op achtergrond-overlay

#### Plaatsing in filterkaart

```
Zoekveld
Type   [chips]
Beurs  [dropdown]
```

Label "Beurs" met dezelfde `filterLabel` stijl als "Type".

### 3d: Client-side filtering

In de bestaande `visibleContacts` useMemo, voeg beurs-filter toe:

```ts
if (selectedFairId !== 'all') {
  filtered = filtered.filter((contact) => contact.fairId === selectedFairId);
}
```

Volgorde: type → beurs → zoekterm.

### 3e: Filters wissen

De bestaande "Filters wissen" knop (in de lege-treffers EmptyState) moet ook `selectedFairId` resetten:

```ts
setSelectedFairId('all');
```

## Stap 4: Testen

### E2E

**Bestand:** `tests/e2e/contacts.spec.ts` (nieuw)

Minimale regressie-checks:

1. **Hero-card zichtbaar**: navigeer naar `/contacts`, check dat "Contacten" heading en "Toevoegen" button zichtbaar zijn
2. **Stats zichtbaar**: check dat "totaal", "kopers", "geïnteresseerd", "galeriehouders" labels zichtbaar zijn
3. **Beursfilter zichtbaar**: maak een beurs + contact met fairId, navigeer naar contacten, check dat dropdown "Alle beurzen" toont
4. **Filtering werkt**: selecteer een beurs in de dropdown, verify dat alleen contacten van die beurs zichtbaar zijn

### Typecheck

`npm run typecheck` moet slagen na alle wijzigingen.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/contacts/index.tsx` | Hero-Card, lokale FilterChip weg, gedeelde FilterChip import, beursfilter dropdown, responsive stats |
| `src/domains/contacts/repository.ts` | `listContactFairOptions()` toevoegen |
| `src/domains/contacts/types.ts` | `FairFilterOption` type toevoegen |
| `tests/e2e/contacts.spec.ts` | Nieuw: regressie-checks voor hero en beursfilter |

## Niet doen in deze iteratie

- Geen externe picker/dropdown library toevoegen
- Geen redesign van individuele contact-detail pagina
- Geen wijziging aan contact-rij layout (alleen bovenste sectie + filter verandert)
- Geen server-side filtering (contactenlijst is klein genoeg voor client-side)
- Geen tablet-specifieke layout (contacten is een lijstpagina, geen dashboard)

## Verificatie

1. `npm run typecheck`
2. `npm run test:unit`
3. `npx playwright test tests/e2e/contacts.spec.ts`
4. `npx playwright test tests/e2e/journey-smoke.spec.ts`
5. Visuele check in `npm run web`
