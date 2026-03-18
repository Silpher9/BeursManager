# Single-Fair Focused UX — Implementatieplan

## Context

De app voelt als een multi-beurs management tool, maar Ingmar werkt met 3-4 beurzen per jaar. Het draait altijd om "de ene beurs waar je nu mee bezig bent". Dit plan verschuift de UX naar een single-beurs cockpit, zonder de multi-beurs architectuur te breken.

Bronplan: `Plans/Running/single-fair-focus-ux.md`

---

## Stap 1: Types uitbreiden

**Bestand:** `src/domains/home/types.ts`

Nieuw type toevoegen:

```typescript
export type HomePrimaryFairExtended = HomePrimaryFair & {
  salesCount: number;
  salesTotal: number;
  expensesTotal: number;
  result: number; // salesTotal - expensesTotal
};
```

---

## Stap 2: Repository — `getPrimaryFairWithMetrics()`

**Bestand:** `src/domains/home/repository.ts`

Nieuwe functie die de bestaande `getPrimaryFair` hergebruikt en verrijkt met metrics:

```typescript
export async function getPrimaryFairWithMetrics(
  db: SQLiteDatabase,
  overrideFairId?: string | null
): Promise<HomePrimaryFairExtended | null>
```

**Logica:**
1. Als `overrideFairId` gegeven → haal fair op via `getFairById(db, overrideFairId)` uit `fairs/repository` en map naar `HomePrimaryFair` met `timing: 'active'`
2. Anders → gebruik bestaande `getPrimaryFair(db)`
3. Als geen fair gevonden → return `null`
4. Haal metrics op via SQL:

```sql
SELECT
  COALESCE((SELECT COUNT(artwork_id) FROM fair_artworks WHERE fair_id = ? AND included = 1), 0) AS assigned_count,
  COALESCE((SELECT COUNT(*) FROM sales WHERE fair_id = ?), 0) AS sales_count,
  COALESCE((SELECT SUM(sale_price) FROM sales WHERE fair_id = ?), 0) AS sales_total,
  COALESCE((SELECT SUM(amount) FROM expenses WHERE fair_id = ?), 0) AS expenses_total
```

5. Combineer fair + metrics, bereken `result = salesTotal - expensesTotal`

**Opmerking:** De assigned_count uit de metrics query vervangt de `assignedArtworkCount` die al op de fair zat (nu altijd consistent uit dezelfde bron).

---

## Stap 3: Unit tests

**Bestand:** `tests/unit/home.repository.test.ts`

Nieuwe tests toevoegen:

1. **`getPrimaryFairWithMetrics` retourneert metrics voor primary fair** — mock `listFairs` + mock `db.getFirstAsync` voor metrics query → verwacht extended object met salesCount, salesTotal, expensesTotal, result
2. **`getPrimaryFairWithMetrics` retourneert null als geen fair** — mock `listFairs` leeg → verwacht null
3. **`getPrimaryFairWithMetrics` handelt 0 verkopen/onkosten af** — metrics query retourneert nulls → verwacht alles 0
4. **`getPrimaryFairWithMetrics` gebruikt overrideFairId** — mock `getFairById` + metrics → verwacht dat die fair wordt gebruikt ipv primary fair logica

**Mocking strategie:** Check bestaande unit tests in `tests/unit/` voor het SQLite mock-patroon en volg dezelfde aanpak voor consistentie.

---

## Stap 4: Home Hub herstructureren

**Bestand:** `src/domains/home/HomeHubScreen.tsx`

### 4a. Data loading aanpassen

- Vervang `getPrimaryFair` door `getPrimaryFairWithMetrics(db, activeFair?.fairId)` in de Promise.all
- State type: `HomePrimaryFairExtended | null` ipv `HomePrimaryFair | null`
- Dit lost ook de beursdag-inconsistentie op (Option B): als beursdag actief is, toont de cockpit die beurs

### 4b. PrimaryFairCard uitbreiden — de cockpit

Props type wordt `HomePrimaryFairExtended | null`. Nieuwe structuur:

```
┌─────────────────────────────────────────┐
│  Actieve of eerstvolgende beurs  Actief │  (header: ongewijzigd)
│  Affordable Art Fair Amsterdam          │  (titel: ongewijzigd)
│  RAI, Amsterdam · 15 mrt – 18 mrt      │  (meta: ongewijzigd)
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │  (metrics: NIEUW)
│  │ 12   │ │ 3    │ │€4200 │ │ €1850  │ │
│  │werken│ │verk. │ │omzet │ │result. │ │
│  └──────┘ └──────┘ └──────┘ └────────┘ │
│                                         │
│  [Verkoop]  [Contact]  [Onkosten]       │  (inline actions: NIEUW)
│                                         │
│  Beurs beheren →                        │  (knop: hernoemd, variant secondary)
└─────────────────────────────────────────┘
```

**Metrics rij (4 tegels):**
- `assignedArtworkCount` → "werken"
- `salesCount` → "verkopen"
- `formatPrice(salesTotal)` → "omzet"
- `formatPrice(result)` → "resultaat"

**Inline acties (3 compacte knoppen):**
Verplaats uit QuickActionsCard naar hier — Verkoop, Contact, Onkosten. Gebruik `AppButton variant="secondary" compact` naast elkaar in een rij. Routes:
- Verkoop → `/fairs/${fairId}/sales/new`
- Contact → `/contacts/new?fairId=${fairId}`
- Onkosten → `/fairs/${fairId}/expenses/new`

**Knop:** "Open beurs" → "Beurs beheren", `variant="secondary"`

### 4c. QuickActionsCard vereenvoudigen

Verwijder de 3 beurs-gebonden tiles (Verkoop, Contact, Nieuwe beurs). Wat overblijft:
- **"Nieuw kunstwerk"** — altijd zichtbaar
- **"Nieuwe beurs"** — altijd zichtbaar, maar visueel minder prominent wanneer er al een beurs is (muted kleur / outline variant). Reden: de gebruiker wil soms een nieuwe beurs plannen terwijl de huidige nog loopt. De beurzen-tab is er ook voor, maar een snelle actie op Home is handiger.

De sectie heet nog steeds "Snelle acties". Tiles worden altijd full-width (1-2 items).

### 4d. SummaryCard vereenvoudigen

- Hernoem "Kernoverzicht" → "Atelier overzicht"
- Verwijder "komende beurzen" metric
- Behoud: "beschikbaar" + "gereserveerd" (2 tegels)

### 4e. RecentFairResultCard — ongewijzigd

### 4f. Tablet layout aanpassen

QuickActionsCard is nu veel kleiner (1-2 tiles). Pas flex ratio aan:
- `tabletHeroColumn: { flex: 3 }` → blijft
- `tabletActionColumn: { flex: 2 }` → `{ flex: 1 }` (smaller)

### 4g. actionTiles memo verwijderen

De `actionTiles` useMemo met 4 tiles kan weg — de resterende tiles (Nieuw kunstwerk + Nieuwe beurs, waarbij Nieuwe beurs minder prominent bij bestaande beurs) worden direct in de component gedefinieerd.

---

## Stap 5: Beurzenlijst herpositioneren

**Bestand:** `app/(tabs)/fairs/index.tsx`

### 5a. Default filter naar "Aankomend"

```typescript
// Was: useState<FairPeriod>('all')
const [selectedPeriod, setSelectedPeriod] = useState<FairPeriod>('upcoming');
```

### 5b. Sectie-koppen toevoegen

**Let op:** Omdat de default filter in stap 5a naar "Aankomend" gaat, ziet de gebruiker de sectie-koppen niet standaard. De splitsing is alleen zichtbaar wanneer de gebruiker expliciet op "Alles" klikt. Dit is bewust — de default view toont alleen aankomende beurzen.

Wanneer filter op "Alles" staat, groepeer de lijst:
- Bereken `upcomingFairs` en `pastFairs` uit `visibleFairs` via useMemo
- Render sectie-header "Aankomende beurzen" boven upcoming
- Render sectie-header "Afgeronde beurzen" boven past (visueel gedempt via `palette.mutedText`)
- Bij andere filters: geen headers (alles is al gefilterd)

Extract de bestaande fair-rij naar een `FairListRow` sub-component voor hergebruik. Houd het simpel: props = `{ fair, onPress }`, geen overengineering.

### 5c. Hero card vereenvoudigen

Huidige hero: 3 stats (totaal, actief/gepland, werken toegewezen).

Nieuw:
- **Met aankomende beurs:** "Volgende beurs: {naam}" + locatie/datum
- **Zonder aankomende beurs:** "Geen beurzen gepland"
- **Enkele metric:** "{X} afgeronde beurzen"

---

## Stap 6: E2E tests bijwerken

### 6a. `tests/e2e/home.spec.ts`

1. Test 1 ("quick action") — "Snelle acties" tekst en "Nieuw kunstwerk" knop blijven bestaan → **geen wijziging nodig**
2. Test 2 ("open fair") — "Open beurs" knop is hernoemd → wijzig naar `'Beurs beheren'`

### 6b. `tests/e2e/journey-smoke.spec.ts` — regressie-check

De journey smoke tests hoeven waarschijnlijk niet aangepast te worden (ze gebruiken geen Home Hub quick action tiles die verplaatst worden, behalve Journey 2). Maar draai ze expliciet mee als regressie-check:
- **Journey 2** (Home Hub → verkoop) — de "Verkoop registreren" knop verhuist van een losse QuickActionsCard-tile naar een inline actie in de beurskaart. Als de selector (`getByRole('button', { name: 'Verkoop registreren' })`) nog werkt, is er geen wijziging nodig. Als niet: selector aanpassen.
- **Journey 1, 3, 4** — geen impact verwacht, maar mee laten lopen in `npm run test:e2e`.

---

## Betrokken bestanden (volgorde)

| # | Bestand | Wijziging |
|---|---------|-----------|
| 1 | `src/domains/home/types.ts` | `HomePrimaryFairExtended` type toevoegen |
| 2 | `src/domains/home/repository.ts` | `getPrimaryFairWithMetrics()` toevoegen, import `getFairById` |
| 3 | `tests/unit/home.repository.test.ts` | 4 nieuwe test cases |
| 4 | `src/domains/home/HomeHubScreen.tsx` | Cockpit-herstructurering (metrics, inline acties, vereenvoudigde sections) |
| 5 | `app/(tabs)/fairs/index.tsx` | Default filter, sectie-koppen, hero vereenvoudigen |
| 6a | `tests/e2e/home.spec.ts` | "Open beurs" → "Beurs beheren" |
| 6b | `tests/e2e/journey-smoke.spec.ts` | Regressie-check: Journey 2 selector evt. aanpassen |

**Niet gewijzigd:** FloatingSidebar (stap 3 uit bronplan — uitgesteld), FairDetailScreen, FairDayMode, rapportages, navigatiestructuur.

---

## Verificatie

1. `npm run typecheck` — geen TypeScript fouten
2. `npm run test:unit` — alle tests slagen (inclusief 4 nieuwe)
3. `npm run test:e2e` — alle E2E tests slagen
4. `npm run web` — visueel controleren:
   - Home Hub cockpit toont beurs met metrics + inline acties
   - Geen beurs → "Plan je volgende beurs" fallback
   - Beurzenlijst standaard op "Aankomend" met sectie-koppen bij "Alles"
   - Tablet layout: grote cockpit links, kleine snelle acties rechts
