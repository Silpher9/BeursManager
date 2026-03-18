# Plan: Rapporten-header verwijderen

## Context

De rapporten-pagina toont in de eerste hero-kaart drie titelniveaus:
1. `pageTitle` — "Rapporten" (28px bold)
2. `kicker` — "RAPPORTEN" (12px uppercase, accent kleur)
3. `heroTitle` — "Overzicht" (28px bold)

Dit is dubbelop: de paginanaam "Rapporten" verschijnt twee keer (als `pageTitle` én als `kicker`). De native tab-header is al verborgen (`headerShown: false` in `_layout.tsx`), dus de redundantie zit puur in de hero-kaart zelf.

## Ontwerpdoel

- De dubbele "Rapporten"-vermelding wegwerken
- De `pageTitle` verwijderen, zodat de kaart begint met de `kicker` + `heroTitle` (consistent met de hero-patronen op andere pagina's)
- De empty-state variant meenemen
- Geen inhoudelijke rapportagewijzigingen

## Stap 1: pageTitle verwijderen uit de summary-sectie

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

Verwijder regel 83:
```tsx
// Verwijder:
<Text style={styles.pageTitle}>Rapporten</Text>
```

De kaart begint dan met:
```tsx
<Card>
  <Text style={styles.kicker}>Rapporten</Text>
  <Text style={styles.heroTitle}>Overzicht</Text>
  ...
</Card>
```

## Stap 2: pageTitle verwijderen uit de empty-state

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

Verwijder regel 61 (empty-state variant):
```tsx
// Verwijder:
<Text style={styles.pageTitle}>Rapporten</Text>
```

## Stap 3: Ongebruikte pageTitle-stijl opruimen

**Bestand:** `src/domains/reports/ReportsScreen.tsx`

Verwijder de `pageTitle`-stijl uit `StyleSheet.create()` (regels 286–290):
```tsx
// Verwijder:
pageTitle: {
  fontSize: 28,
  fontWeight: '700',
  color: palette.text,
},
```

## Stap 4: Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/reports.spec.ts` — bestaande tests voor lege én gevulde variant
3. Visuele check in `npm run web`: rapporten-pagina begint met kicker "RAPPORTEN" + heroTitle "Overzicht", geen dubbele paginanaam meer
4. Empty-state check: zelfde hiërarchie als de gevulde variant

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/domains/reports/ReportsScreen.tsx` | `pageTitle` JSX (2×) en stijl verwijderen |

## Niet doen in deze iteratie

- Geen redesign van metric tiles of balk-grafieken
- Geen nieuwe header-component (rapporten is een top-level tab, geen fair-child)
- Geen wijzigingen aan de tablet two-column layout
