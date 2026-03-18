# Plan: Single-Fair Focused UX

## Doel

De app voelt nu als een multi-beurs management tool, maar in de praktijk werkt Ingmar met 3-4 Affordable Art Fairs per jaar. Het draait altijd om "de ene beurs waar je nu mee bezig bent". Dit plan verschuift de UX naar een single-beurs cockpit, zonder de multi-beurs architectuur te breken.

**Principe:** "Ik werk nu in deze beurs" — multi-fair data, single-fair gevoel.

## Huidige situatie

### Home Hub (`HomeHubScreen.tsx`)
Vier gelijkwaardige secties:
1. Primary Fair Card — actieve/eerstvolgende beurs (naam, locatie, datum, metrics)
2. Quick Actions Card — 4 tegels (nieuw kunstwerk, verkoop, contact, nieuwe beurs)
3. Summary Card — 3 globale metrics (beschikbaar, gereserveerd, aankomende beurzen)
4. Recent Fair Result Card — laatste afgeronde beurs (binnen 30 dagen)

### Beurzenlijst (`app/(tabs)/fairs/index.tsx`)
- Hero card met totaalstatistieken
- Zoek + filter (Alles/Aankomend/Afgelopen)
- Lijst met alle beurzen als gelijkwaardige items

### Fair context routing
Quick actions checken al `activeFair?.fairId ?? primaryFair?.id`:
- Verkoop → `/fairs/{id}/sales/new`
- Contact → `/contacts/new?fairId={id}`

Dit werkt al goed — de basis voor single-fair focus is er.

## Wijzigingen

### Stap 1: Home Hub herstructureren — beurs als cockpit

**Bestand:** `src/domains/home/HomeHubScreen.tsx`

**Wat verandert:**

De Primary Fair Card wordt het dominante element. De andere secties worden ondergeschikt.

#### 1a. Primary Fair Card uitbreiden

Huidige kaart toont: naam, locatie, datum, 2 metric tiles, "Open beurs" knop.

Uitbreiden met:
- **Inline metrics** uit FairDetailScreen overnemen: verkopen (aantal + bedrag), onkosten, resultaat
- **Snelle acties direct onder de beurskaart** (niet als aparte sectie)
- De "Open beurs" knop wordt "Beurs beheren" (secundair, onderaan)

```
┌─────────────────────────────────────────┐
│  Affordable Art Fair Amsterdam    Actief │
│  RAI, Amsterdam                         │
│  15 mrt – 18 mrt 2026                   │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐ │
│  │ 12   │ │ 3    │ │ €4200│ │ €1850  │ │
│  │werken│ │verk. │ │omzet │ │result. │ │
│  └──────┘ └──────┘ └──────┘ └────────┘ │
│                                         │
│  [Verkoop]  [Contact]  [Onkosten]       │
│                                         │
│  Beurs beheren →                        │
└─────────────────────────────────────────┘
```

#### 1b. Quick Actions Card vereenvoudigen

Huidige 4 tegels → verplaats 3 beurs-gerelateerde acties naar de beurskaart (stap 1a).

Wat overblijft als losse sectie:
- "Nieuw kunstwerk" (niet beurs-gebonden)
- "Nieuwe beurs" (alleen tonen als er geen actieve/aankomende beurs is)

#### 1c. Summary Card aanpassen

Huidige globale metrics (beschikbaar, gereserveerd, aankomende beurzen) → vervangen door:
- **Beschikbare werken** (niet gekoppeld aan een beurs) — blijft relevant
- **"Aankomende beurzen" teller verwijderen** — niet nodig bij 3-4 per jaar
- Eventueel: "Gereserveerde werken" behouden

Dit wordt een compactere "Atelier overzicht" sectie.

#### 1d. Recent Fair Result Card behouden

Geen wijziging. Deze is al goed: toont het resultaat van de laatste beurs als referentie.

### Stap 2: Beurzenlijst herpositioneren als archief

**Bestand:** `app/(tabs)/fairs/index.tsx`

**Wat verandert:**

De beurzenlijst blijft bestaan maar voelt meer als archief + planning.

#### 2a. Standaard filter op "Aankomend"

Huidige default: "Alles" (alle beurzen). Wijzig naar: **"Aankomend"** als standaard filter.

Gebruiker ziet primair de geplande beurzen. "Afgelopen" beurzen zijn één klik verwijderd.

#### 2b. Sectie-koppen toevoegen

In plaats van een platte lijst, groepeer in secties:
- **"Aankomende beurzen"** — bovenaan
- **"Afgeronde beurzen"** — daaronder, visueel gedempt (lichtere tekst of ingeklapt)

#### 2c. Hero card vereenvoudigen

Huidige hero toont: totaal beurzen, actief/gepland, totaal werken. Dit is multi-beurs denken.

Wijzig naar:
- **Volgende beurs:** naam + datum (of "Geen beurzen gepland")
- **Totaal afgerond:** X beurzen

### Stap 3: Sidebar fair-context versterken (tablet) — OPTIONEEL / LATER

**Status:** Uitgesteld tot na stap 1+2+4. Vereist een datasourcing-beslissing.

**Bestand:** `src/shared/components/FloatingSidebar.tsx`

**Wat verandert:**

Wanneer er een actieve/eerstvolgende beurs is (ook zonder beursdag-modus), toon een subtiele context-indicator in de sidebar.

#### 3a. "Huidige beurs" indicator

Onder het "BeursManager" logo, boven de tabs:
- Toon de naam van de actieve/eerstvolgende beurs als kleine subtitel
- Klikbaar → navigeert naar beurs detail
- Alleen zichtbaar als er een primaire beurs is

**Verschil met FairDaySidebarCard:** die kaart verschijnt alleen wanneer beursdag-modus actief is (met toggle + overzicht-knop). De nieuwe indicator is altijd zichtbaar en is puur informatief.

```
┌──────────────────┐
│  BeursManager     │
│  ──────────────── │
│  AAF Amsterdam →  │  ← NIEUW: altijd zichtbaar
│  ──────────────── │
│  ┌──────────────┐ │
│  │ Beursdag     │ │  ← Alleen bij beursdag-modus
│  │ actief       │ │
│  └──────────────┘ │
│  ──────────────── │
│  Home             │
│  Voorraad         │
│  ...              │
└──────────────────┘
```

#### Datasourcing-probleem

`FloatingSidebar` heeft nu alleen toegang tot `useFairDayMode()` context — geen `primaryFair`. Om de "huidige beurs" altijd te tonen zijn er twee opties:

- **Optie A:** Extra DB-query in de sidebar zelf (simpel, maar duplicate fair-selectielogica naast Home Hub)
- **Optie B:** Gedeelde `PrimaryFairProvider` context hoger in de component tree (schoner, maar meer refactor)

**Aanbeveling:** Optie B als dit wordt opgepakt, maar dit hoeft niet in de eerste ronde. Stap 1+2+4 leveren al het gewenste "single-fair gevoel" op.

### Stap 4: Home Hub repository uitbreiden

**Bestand:** `src/domains/home/repository.ts`

**Wat verandert:**

`getPrimaryFair()` retourneert nu alleen `id`, `name`, `location`, `startDate`, `endDate`, `timing`. Uitbreiden met beurs-metrics zodat de Home Hub cockpit ze kan tonen.

#### 4a. `getPrimaryFairWithMetrics(db)` toevoegen

Nieuw type:
```typescript
type HomePrimaryFairExtended = HomePrimaryFair & {
  assignedCount: number;
  salesCount: number;
  salesTotal: number;
  expensesTotal: number;
  result: number; // salesTotal - expensesTotal
};
```

**Implementatie:** schrijf een nieuwe gecombineerde SQL-query direct in `src/domains/home/repository.ts`. De benodigde helpers (`getFairAssignmentCount`, `getFairSalesTotal`, etc.) bestaan niet als losse functies in `fairs/repository.ts` — die metrics worden daar inline berekend. Dus: nieuwe query schrijven, niet hergebruiken.

```sql
SELECT
  COUNT(fa.artwork_id) AS assigned_count,
  COALESCE((SELECT COUNT(*) FROM sales WHERE fair_id = ?), 0) AS sales_count,
  COALESCE((SELECT SUM(sale_price) FROM sales WHERE fair_id = ?), 0) AS sales_total,
  COALESCE((SELECT SUM(amount) FROM expenses WHERE fair_id = ?), 0) AS expenses_total
FROM fair_artworks fa
WHERE fa.fair_id = ?
```

#### 4b. Unit tests toevoegen

Voeg unit tests toe voor:
- `getPrimaryFairWithMetrics()` — correcte metrics bij 0/1/meerdere sales
- Actieve vs. aankomende fair selectie (bestaande `getPrimaryFair` logica)

## Wat NIET verandert

- **Multi-beurs datamodel** — `fairs` tabel blijft ongewijzigd
- **Beurs CRUD** — aanmaken, bewerken, verwijderen werkt hetzelfde
- **Beurs detail scherm** — `FairDetailScreen` blijft het volledige beheerscherm
- **Beursdag-modus** — `FairDayModeProvider` + `FairDayScreen` ongewijzigd
- **Rapportages** — multi-beurs vergelijking blijft werken
- **Fair assignment flow** — kunstwerken koppelen aan beurs ongewijzigd
- **Navigatie structuur** — alle routes blijven bestaan, geen tabs verwijderen

## Betrokken bestanden

| Bestand | Wijziging |
|---|---|
| `src/domains/home/HomeHubScreen.tsx` | Herstructureren: beurs cockpit centraal |
| `src/domains/home/repository.ts` | `getPrimaryFairWithMetrics()` toevoegen |
| `src/domains/home/types.ts` | `HomePrimaryFairExtended` type |
| `app/(tabs)/fairs/index.tsx` | Default filter, sectie-koppen, hero vereenvoudigen |
| `src/shared/components/FloatingSidebar.tsx` | "Huidige beurs" indicator toevoegen *(optioneel/later — stap 3)* |

## Volgorde van implementatie

1. **Stap 4** eerst — repository uitbreiden (data-laag, geen UI-risico)
2. **Stap 1** — Home Hub herstructureren (grootste visuele impact)
3. **Stap 2** — Beurzenlijst herpositioneren (kleine wijziging)
4. **Stap 3** — Sidebar indicator (nice-to-have, kan apart)

## Risico's en aandachtspunten

1. **Geen actieve/aankomende beurs:** Home Hub moet graceful degraderen. Als er geen primaire beurs is, toon een "Plan je volgende beurs" kaart met link naar `/fairs/new`. Dit werkt nu al zo.

2. **Metrics query performance:** `getPrimaryFairWithMetrics` voegt extra queries toe bij elke Home Hub load. Aangezien het om kleine datasets gaat (3-4 beurzen, <100 werken) is dit geen probleem.

3. **Beursdag-modus vs. primaire beurs:** Als beursdag actief is voor beurs A, maar beurs B is "de eerstvolgende", welke toont Home?

   **Huidige situatie:** `activeFair?.fairId` heeft nu alleen voorrang bij quick-action **routing** (welke beurs-URL wordt geopend). De Primary Fair Card zelf komt altijd uit `getPrimaryFair(db)` en negeert de beursdag-context. Dit betekent dat Home beurs B kan tonen terwijl beursdag actief is voor beurs A.

   **Beslissing nodig:** Moet de Home Hub cockpit ook visueel de beursdag-beurs tonen? Twee opties:
   - **Optie A:** Home toont altijd de repository-`primaryFair`. Beursdag beïnvloedt alleen acties (huidige gedrag, eenvoudigst).
   - **Optie B:** Home toont de beursdag-beurs wanneer actief, valt terug op repository-`primaryFair`. Dit is consistenter met het "ik werk in deze beurs" principe, maar vereist dat `getPrimaryFairWithMetrics` ook op een willekeurige fairId kan draaien.

   **Aanbeveling:** Optie B — het is inconsistent om acties naar beurs A te sturen maar beurs B te tonen. Implementatie: `getPrimaryFairWithMetrics(db, overrideFairId?)` waarbij `overrideFairId = activeFair?.fairId`.

## Verificatie

1. **Visueel:** Home Hub voelt als "mijn beurs dashboard", niet als "beurzen overzicht"
2. **Navigatie:** Snelle acties vanuit Home werken direct in de beurscontext
3. **Edge case:** Geen beurzen → "Plan je volgende beurs" kaart
4. **Bestaande tests:** `tests/e2e/home.spec.ts` aanpassen aan nieuwe structuur
5. **Beursdag flow:** Journey smoke test 1 (beursdag→sale→context) blijft slagen
