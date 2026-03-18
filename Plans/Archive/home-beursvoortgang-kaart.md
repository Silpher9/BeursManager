# Plan: Home beursvoortgang-kaart en compactere compositie

## Context

De huidige `HomeHubScreen` voelt op tablet als twee losse eilanden:
- boven: beurs-cockpit + snelle acties
- onder: `Atelier overzicht` + `Laatste beursresultaat`

Daartussen zit te veel lege verticale ruimte. Daardoor oogt de pagina niet als een samenhangende cockpit.

Daarnaast mist Home nog een compacte visuele status van de **huidige beurs zelf**. De bestaande metrics bovenin geven totalen, maar geen snel voortgangsbeeld van de beursselectie.

## Ontwerpdoel

Home moet voelen als:
- één compacte, samenhangende beurs-cockpit
- visueel rustiger
- informatiever over de **actieve of eerstvolgende beurs**

Niet als:
- een mini-rapportenscherm
- een pagina met meerdere losstaande dashboard-eilanden

## Consensusrichting

Twee ingrepen, in deze volgorde:

1. **Compositie aanscherpen**
   - verklein de lege verticale ruimte tussen boven- en ondersectie
   - laat de hele pagina als één ritmisch dashboard lezen

2. **Eén centrale `Beursvoortgang` kaart toevoegen**
   - tussen de beurs-cockpit en de onderste rij
   - met een eenvoudige voortgangsvisual, niet met volledige analytics

## Stap 1: Tablet-compositie compacter maken

**Bestand:** `src/domains/home/HomeHubScreen.tsx`

### Wat verandert

De verticale afstand tussen:
- `tabletTopRow`
- de nieuwe middenkaart
- `tabletBottomRow`

wordt duidelijk kleiner dan nu.

### Ontwerprichtlijnen

- Verminder de grote lege middenzone; behoud wel lucht tussen kaarten
- Houd de visuele hiërarchie: beurs-cockpit blijft het sterkste element
- De onderrij moet optisch aanhaken op de hero erboven, niet los onderaan hangen

### Praktisch

Pas alleen spacing / row-structuur aan:
- `tabletFillWrapper`
- `tabletTopRow`
- `tabletBottomRow`
- eventuele nieuwe tussenrij voor de voortgangskaart

Geen extra decoratieve elementen toevoegen.

## Stap 2: `Beursvoortgang` kaart toevoegen

**Bestand:** `src/domains/home/HomeHubScreen.tsx`

Voeg op tablet en mobiel één nieuwe kaart toe tussen:
- `PrimaryFairCard`
- en de bestaande ondersecties

Werknaam: `FairProgressCard`

### Inhoud van de kaart

De kaart moet snel antwoord geven op:
- hoe staat de beursselectie ervoor?
- hoe ver zijn we financieel?

### Lay-outrichting

Gebruik één rustige kaart met 2 zones:

1. **Selectie-status**
   - compacte donut/ring visual
   - tekst zoals `1 van 6 werken verkocht`
   - subtiele tweede regel zoals `17% van beursselectie`

2. **Financiële voortgang**
   - eenvoudige horizontale progress bar
   - label zoals `break-even`
   - tekst zoals `€ 1.500 omzet / € 1.455 onkosten`

### Belangrijke ontwerpgrenzen

- Geen rapporten-component kopiëren
- Geen staafgrafiek per dag
- Geen tweede analyticskaart
- Geen externe chart library

Het moet voelen als een **statuskaart**, niet als een dashboardmodule uit de rapporten-tab.

## Stap 3: Data uitbreiden voor beursvoortgang

**Bestand:** `src/domains/home/repository.ts`

De huidige `getPrimaryFairWithMetrics()` levert al:
- `assignedArtworkCount`
- `salesCount`
- `salesTotal`
- `expensesTotal`
- `result`

Voor de gewenste selectie-visual mist nog fair-specifieke statusverdeling.

### Benodigde extra velden

Voeg toe aan `HomePrimaryFairExtended`:

```ts
reservedCount: number;
availableCount: number;
soldCount: number;
breakEvenProgress: number | null;
```

Waarbij:
- `soldCount` = `salesCount` (leidende teller, geen aparte berekening)
- `reservedCount` = gekoppelde werken binnen deze beurs met `artworks.status = 'gereserveerd'` en niet verkocht
- `availableCount` = gekoppelde werken binnen deze beurs die niet verkocht en niet gereserveerd zijn
- `breakEvenProgress` = ratio `salesTotal / expensesTotal`, begrensd voor UI-gebruik

### Queryrichting

Breid de bestaande home-metrics query uit met een join op:
- `fair_artworks`
- `artworks`

zodat fair-specifieke verdeling bepaald kan worden zonder extra scherm-query’s.

### Belangrijke guardrail

Als `expensesTotal` `0` is:
- toon geen “100% gehaald”-misleiding
- gebruik een neutrale tekstvariant, bijvoorbeeld:
  - `Nog geen onkosten geregistreerd`
  - of verberg alleen de progress-fill en toon enkel omzet

## Stap 4: FairProgressCard UI-uitwerking

**Bestand:** `src/domains/home/HomeHubScreen.tsx`

Maak een lokale component:

```tsx
function FairProgressCard({ primaryFair }: { primaryFair: HomePrimaryFairExtended | null })
```

### Gedrag

- Alleen tonen als `primaryFair` bestaat
- Bij geen primaire beurs: kaart niet tonen

### Donut-visual

**Primaire doelvorm: segmented donut/ring.** Afmetingen: ~120x120px ring met witte center. Technische implementatie (CSS gradient, SVG, of view-compositie) vrijlaten aan uitvoering, zolang het zonder externe library blijft en visueel rustig blijft.

**Fallback:** als een donut/ring technisch te fragiel blijkt, vervang door een horizontale segmented bar. Dit is alleen een noodoplossing, niet een gelijkwaardige ontwerpoptie.

Ontwerpprioriteit:
- **duidelijkheid boven grafische perfectie**

### Kleurgebruik

Gebruik bestaande app-taal:
- verkocht: accent / warme donkere tint
- gereserveerd: zachte amber/neutrale highlight
- beschikbaar: bleke neutrale tint

Geen felle rapportkleuren introduceren.

### Teksthiërarchie

Voorbeeld:
- Titel: `Beursvoortgang`
- Hoofdtekst: `1 van 6 werken verkocht`
- Subtekst: `1 gereserveerd, 4 nog beschikbaar`
- Financiële regel: `€ 1.500 omzet / € 1.455 onkosten`

## Stap 5: Mobiel gedrag

**Bestand:** `src/domains/home/HomeHubScreen.tsx`

Op mobiel blijft dezelfde kaart bestaan, maar eenvoudiger gestapeld:
- eerst titel + voortgangstekst
- dan compacte visual
- dan break-even balk

Geen geforceerde zij-aan-zij layout op smalle schermen.

## Stap 6: Testen en verificatie

### Functioneel

Bestanden:
- `tests/unit/home.repository.test.ts`
- `tests/e2e/home.spec.ts`

### Toevoegen

1. Unit tests voor nieuwe repository-velden:
   - fair met 0 sales / 0 expenses
   - fair met reserved + available verdeling
   - break-even progress met en zonder onkosten

2. Home e2e of gerichte smoke-check:
   - `Beursvoortgang` zichtbaar wanneer een primaire beurs bestaat
   - voortgangstekst zichtbaar
   - pagina blijft navigabel

### Visuele verificatie

Controleer in web:
- tablet: duidelijk minder lege middenruimte
- nieuwe middenkaart vult de compositie logisch op
- Home voelt nog steeds rustig
- progress component domineert de pagina niet

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/domains/home/types.ts` | nieuwe voortgangsvelden op `HomePrimaryFairExtended` |
| `src/domains/home/repository.ts` | fair-specifieke reserved/available/progress metrics toevoegen |
| `src/domains/home/HomeHubScreen.tsx` | compactere tablet-compositie + nieuwe `FairProgressCard` |
| `tests/unit/home.repository.test.ts` | metrics-tests uitbreiden |
| `tests/e2e/home.spec.ts` | Home-check uitbreiden voor `Beursvoortgang` |

## Niet doen in deze iteratie

- geen mini-rapporten op Home
- geen dagelijkse verkoopgrafiek
- geen externe chart package
- geen extra vierde of vijfde home-rij
- geen redesign van `Atelier overzicht` of `Laatste beursresultaat` buiten spacing-aanpassingen

## Verificatie

1. `npm run typecheck`
2. `npm run test:unit`
3. `npx playwright test tests/e2e/home.spec.ts`
4. `npx playwright test tests/e2e/journey-smoke.spec.ts`
5. Visuele check in `npm run web`
