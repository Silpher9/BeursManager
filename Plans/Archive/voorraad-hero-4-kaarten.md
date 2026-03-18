# Plan: Voorraad Hero Card — 4 KPI-kaarten

*Geconsolideerd uit plannen van Claude en Codex.*

## Context

In `app/(tabs)/inventory/index.tsx` staat de voorraad-hero nu uit:
- 3 KPI-kaarten: `werken totaal`, `beschikbaar`, `gereserveerd`
- daarna een losse tekstregel: `Totaal vraagprijs: € ...`
- daarna de `Toevoegen` knop

Die losse vraagprijsregel voelt visueel ondergewaardeerd. De metric is even belangrijk als de andere drie maar wordt gedevalueerd door de afwijkende opmaak.

**Oplossing:** Promoveer "Totaal vraagprijs" naar een 4e KPI-kaart in dezelfde rij.

## Wijziging

### Stap 1: `InventoryStatsCard` — 4e kaart toevoegen

**Bestand:** `app/(tabs)/inventory/index.tsx`, component `InventoryStatsCard`

Voeg een 4e `statBlock` toe aan de `statsRow`. Nieuwe volgorde:

```
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│ 40     │ │ 18     │ │ 6      │ │ € 59.630 │
│ werken │ │ beschik│ │ gereser│ │ vraag-   │
│ totaal │ │ baar   │ │ veerd  │ │ prijs    │
└────────┘ └────────┘ └────────┘ └──────────┘
[           Toevoegen            ]
```

De 4e kaart:
```tsx
<View style={styles.statBlock}>
  <Text style={styles.statValue}>{euroFormatter.format(askingPriceTotal)}</Text>
  <Text style={styles.statLabel}>vraagprijs</Text>
</View>
```

### Stap 2: Losse tekstregel verwijderen

Verwijder:
- De `<Text style={styles.totalLabel}>Totaal vraagprijs: ...</Text>` regel
- De `totalLabel` style uit `StyleSheet.create`

De `Toevoegen` knop blijft onder de KPI-rij staan als eigen CTA-zone.

### Stap 3: Responsiviteit

Met 4 kaarten in een `flexDirection: 'row'` rij met `flex: 1` per kaart kunnen kaarten op smalle schermen te smal worden voor het bedrag (bijv. "€ 59.630").

Voeg `flexWrap` en `minWidth` toe:

```typescript
statsRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',   // NIEUW
  gap: 12,
  marginTop: 18,
},
statBlock: {
  flex: 1,
  minWidth: 120,      // NIEUW — voorkomt te smalle kaarten
  minHeight: 86,
  // ... rest ongewijzigd
},
```

Op tablet passen 4 kaarten in één rij. Op smalle schermen vallen ze naar 2x2.

### Stap 4: Eenvoud bewaken

Niet toevoegen in deze iteratie:
- Gemiddelde vraagprijs (sublabel of extra kaart)
- Extra geldmetrics
- Tweede tekstregel in de 4e kaart
- Kaart-specifieke responsieve uitzonderingslogica

Als later meer context wenselijk is, hoort dat in een aparte iteratie.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/inventory/index.tsx` | 4e statBlock, verwijder totalLabel tekst + style, flexWrap + minWidth |
| `tests/e2e/inventory.spec.ts` | Regressiecheck: `vraagprijs` label zichtbaar in hero |

## Testaanpassing

### `tests/e2e/inventory.spec.ts`

Breid de bestaande inventory-test licht uit:
- Controleer dat `vraagprijs` zichtbaar is als KPI-label op de hoofdpagina
- Geen pixel- of layoutasserties; alleen functionele aanwezigheid

## Verificatie

1. `npm run typecheck` — geen fouten
2. `npx playwright test tests/e2e/inventory.spec.ts` — regressiecheck slaagt
3. `npm run test:e2e` — volledige suite blijft groen
4. `npm run web` — visueel controleren:
   - Tablet: 4 evenwichtige KPI-kaarten in één rij
   - Smal venster: kaarten wrappen naar 2x2
   - Bedrag correct geformatteerd
   - Geen losse vraagprijstekst meer
   - `Toevoegen` blijft een duidelijke aparte actie onder de metrics
