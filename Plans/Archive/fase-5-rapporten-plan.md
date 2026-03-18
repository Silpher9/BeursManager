# Fase 5 — Rapportenscherm

**Status: Geïmplementeerd** (14 maart 2026)

## Context

De app heeft al 5 afgeronde fases (voorraad, beurzen, contacten, kosten, home hub). De rapportentab bestaat als placeholder (`app/(tabs)/reports.tsx`). Nu vullen we die in met echte rapportages: omzet en winst per beurs, totaaloverzicht, en best verkochte technieken/werken. Geen externe chart libraries — horizontale balken met `View` + percentage breedte.

## Nieuwe bestanden

| Bestand | Beschrijving |
|---------|-------------|
| `src/domains/reports/types.ts` | Types: ReportSummary, FairReportRow, TechniqueReportRow, TopArtworkRow, ReportData |
| `src/domains/reports/repository.ts` | SQL queries + facade `getReportData(db, year)` |
| `src/domains/reports/formatters.ts` | `barWidthPercent()` helper |
| `src/domains/reports/ReportsScreen.tsx` | Hoofdscherm met 4 secties |
| `tests/unit/reports.repository.test.ts` | Unit tests voor repository |
| `tests/e2e/reports.spec.ts` | E2E smoke test |

## Gewijzigd

| Bestand | Wijziging |
|---------|-----------|
| `app/(tabs)/reports.tsx` | Placeholder vervangen door `import { ReportsScreen }` |

## Schermontwerp

Eén scrollbaar scherm met 4 Card-secties + jaar-FilterChips bovenaan:

### Sectie 1: Totaaloverzicht
- 6 MetricTiles in een grid: beurzen, verkopen, omzet, kosten, resultaat, gem. omzet/beurs
- **Gem. omzet/beurs** = totale omzet / alle beurzen in filter (niet alleen beurzen met verkopen)
- Jaar-FilterChips als er meerdere jaren zijn ("Alle jaren", "2026", "2025", ...)

### Sectie 2: Per beurs
- Per beurs een klikbare rij (navigeert naar beursdetail)
- Horizontale balken voor omzet (accent) en kosten (danger), proportioneel
- Resultaat in tekst (groen positief, rood negatief)

### Sectie 3: Technieken
- Ranking op omzet (top 10), null techniek → "Onbekend"

### Sectie 4: Top verkopen
- Top 10 duurste werken met thumbnail

### Empty states
- Globale: 0 beurzen → "Ga naar beurzen"
- Per-sectie: "Nog geen verkopen geregistreerd" als geen data

### Tablet layout
- 2 kolommen: links Per beurs (flex 3), rechts Technieken + Top verkopen (flex 2)

## Repository queries

- Sales en expenses **nooit samen gejoind** (kruisproduct vermijden)
- Jaarfilter op `fairs.start_date`, niet op `sales.sold_at`
- 5 queries parallel via `Promise.all`

## Verificatie

- `npm run typecheck` — groen
- `npm run test:unit` — 32 tests groen
- `npm run test:e2e` — 27 tests groen (excl. pre-bestaand demo-seed timeout)
