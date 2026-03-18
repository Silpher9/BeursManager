# Plan: Rapporten — extra inzichten toevoegen

## Context

De rapporten-pagina heeft een solide basis: totaaloverzicht (6 KPI-tiles), per-beurs vergelijking, technieken, en top verkopen. Wat ontbreekt is **beslisinformatie** — inzichten die de kunstenaar helpen bij keuzes (welke beurs herhalen? hoe presteert mijn prijsstelling?).

## Ontwerpdoel

Drie toevoegingen die puur afleidbaar zijn uit bestaande data (geen nieuwe repository-queries nodig):
1. **Gemiddelde verkoopprijs** als extra KPI-tile
2. **Beste & slechtste beurs** highlight-blok
3. **Verkoopaantal** zichtbaar in de "Per beurs"-sectie

## Stap 1: Gemiddelde verkoopprijs KPI-tile

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

Voeg een 7e `MetricTile` toe aan het `metricsGrid`:

```tsx
<MetricTile
  value={formatPrice(
    data.summary.salesCount > 0
      ? Math.round(data.summary.totalRevenue / data.summary.salesCount)
      : 0,
    'EUR 0'
  ) ?? 'EUR 0'}
  label="gem. verkoopprijs"
/>
```

Dit is puur afgeleid: `totalRevenue / salesCount`. Geen type- of repository-wijziging nodig.

**Overwegingen:**
- Het `metricsGrid` gebruikt `flexWrap` met `minWidth: 120` — een 7e tile past in het bestaande grid
- De label "gem. verkoopprijs" is consistent met "gem. omzet/beurs"

## Stap 2: Beste & slechtste beurs highlight

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

Voeg een nieuw `Card`-blok toe **tussen** de summary-sectie en de "Per beurs"-sectie. Dit blok toont de beurs met het hoogste en laagste resultaat (profit).

```tsx
const bestFair = data.fairRows.reduce((best, row) =>
  row.profit > best.profit ? row : best, data.fairRows[0]);
const worstFair = data.fairRows.reduce((worst, row) =>
  row.profit < worst.profit ? row : worst, data.fairRows[0]);
```

UI-structuur:
```tsx
<Card>
  <Text style={styles.sectionTitle}>Highlights</Text>
  <View style={styles.highlightRow}>
    <View style={styles.highlightItem}>
      <Text style={styles.highlightLabel}>Beste resultaat</Text>
      <Text style={styles.highlightFairName}>{bestFair.fairName}</Text>
      <Text style={styles.highlightValue}>
        {formatPrice(bestFair.profit, 'EUR 0')}
      </Text>
    </View>
    <View style={styles.highlightItem}>
      <Text style={styles.highlightLabel}>Zwakste resultaat</Text>
      <Text style={styles.highlightFairName}>{worstFair.fairName}</Text>
      <Text style={styles.highlightValue}>
        {formatPrice(worstFair.profit, 'EUR 0')}
      </Text>
    </View>
  </View>
</Card>
```

**Overwegingen:**
- Alleen tonen als `bestFair.fairId !== worstFair.fairId` — dit vangt zowel het geval van 1 beurs als meerdere beurzen met exact dezelfde profit op
- Stijlen: `highlightRow` als `flexDirection: 'row'` met twee gelijke kolommen
- `highlightValue` krijgt conditioneel `color: POSITIVE_COLOR` (positief) of `palette.danger` (negatief)

**Tablet-layout:**
- Dit blok komt vóór de `tabletColumns` view, op volle breedte (net als de summary-kaart)

## Stap 3: Verkoopaantal in "Per beurs"-rijen

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

`salesCount` zit al in `FairReportRow` maar wordt niet getoond. Voeg het toe als **aparte tweede meta-regel** onder de beursnaam, niet in dezelfde regel als de datum (die string is al lang genoeg op smallere breedtes):

```tsx
<View style={styles.fairRowHeader}>
  <Text style={styles.fairRowName} numberOfLines={1}>
    {fair.fairName}
  </Text>
  <Text style={styles.fairRowDate}>
    {formatFairDateRange(fair.startDate ?? undefined, fair.endDate ?? undefined)}
  </Text>
</View>
<Text style={styles.fairRowMeta}>
  {fair.salesCount} {fair.salesCount === 1 ? 'verkoop' : 'verkopen'}
</Text>
```

Nieuwe stijl:
```tsx
fairRowMeta: {
  fontSize: 13,
  color: palette.mutedText,
  marginTop: 2,
},
```

**Overwegingen:**
- De datum-string kan al lang zijn (bijv. "23 sep 2026 t/m 28 sep 2026") — een aparte regel voorkomt afkapping
- `fairRowMeta` hergebruikt dezelfde `fontSize`/`color` als `fairRowDate` voor visuele consistentie

## Stap 4: Stijlen toevoegen

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

Nieuwe stijlen in `StyleSheet.create()`:

```tsx
highlightRow: {
  flexDirection: 'row',
  gap: 12,
},
highlightItem: {
  flex: 1,
  borderRadius: 18,
  backgroundColor: palette.softAccent,
  padding: 14,
  gap: 4,
},
highlightLabel: {
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  color: palette.mutedText,
},
highlightFairName: {
  fontSize: 16,
  fontWeight: '700',
  color: palette.text,
},
highlightValue: {
  fontSize: 20,
  fontWeight: '700',
  color: POSITIVE_COLOR,
},
highlightValueNegative: {
  color: palette.danger,
},
```

## Stap 5: Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/reports.spec.ts`
3. Visuele check in `npm run web`:
   - 7 KPI-tiles in het overzicht (inclusief gem. verkoopprijs)
   - Highlights-kaart met beste en slechtste beurs (alleen als ze verschillen)
   - Verkoopaantal zichtbaar bij elke beurs-rij
   - Tablet two-column layout nog intact
4. Edge-case check: pagina met slechts 1 beurs of beurzen met gelijk resultaat — highlights-kaart mag niet verschijnen

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/domains/reports/ReportsScreen.tsx` | KPI-tile, highlights-blok, verkoopaantal in beurs-rijen, stijlen |

## Wat niet wijzigt

- `types.ts` — alle data is al beschikbaar in bestaande types
- `repository.ts` — geen nieuwe queries nodig
- `formatters.ts` — bestaande `formatPrice` en `barWidthPercent` volstaan

## Niet doen in deze iteratie

- Conversiepercentage (vereist extra query: gekoppelde werken per beurs)
- Trend over tijd / seizoenspatroon (vereist nieuwe aggregatie-laag)
- Terugkerende kopers (vereist contact-analyse query)
- Redesign van bestaande secties
