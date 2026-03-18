# Plan: Breadcrumb op fair detail pagina

## Context

De fair detail pagina (`/fairs/[id]`) heeft geen terugnavigatie naar de beurzenlijst. Als je via Home of een deep link op deze pagina komt, zit je vast. Dit plan voegt een klikbare breadcrumb toe met `FairChildHeader`, die al gebruikt wordt door de expense- en sale-editors.

## Huidige situatie

- `FairChildHeader` heeft al de `action: { label, onPress }` prop (niet `onCancel` zoals het oorspronkelijke plan vermeldt)
- Expense- en sale-editors gebruiken al het juiste patroon — geen wijzigingen nodig
- Alleen 2 bestanden moeten gewijzigd + 1 testbestand uitgebreid

## Wijzigingen

### 1. `app/(tabs)/fairs/_layout.tsx`
- `headerShown: false` toevoegen aan `[id]/index` route (zodat FairChildHeader de header overneemt)

### 2. `src/domains/fairs/FairDetailScreen.tsx`
- `Stack.Screen` met dynamische title + headerRight verwijderen
- `FairChildHeader` importeren en toevoegen boven de eerste Card:
  ```tsx
  <FairChildHeader
    breadcrumbs={[
      { label: 'Beurzen', onPress: () => router.replace('/fairs') },
      { label: fair?.name ?? 'Beurs' },
    ]}
    screenTitle={fair?.name ?? 'Beurs'}
    action={{ label: 'Bewerken', onPress: () => router.push(`/fairs/${fair.id}/edit`) }}
  />
  ```

### 3. `tests/e2e/fair-child-nav.spec.ts`
Tests toevoegen:
1. Breadcrumb "Beurzen" zichtbaar op fair detail
2. Klik op "Beurzen" navigeert naar `/fairs`
3. "Bewerken" knop navigeert naar `/fairs/{id}/edit`

## Bestanden die NIET wijzigen

- `FairChildHeader.tsx` — heeft al `action` prop
- `ExpenseEditorScreen.tsx` — gebruikt al `action` prop
- `SaleEditorScreen.tsx` — gebruikt al `action` prop

## Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/fair-child-nav.spec.ts`
3. Visuele check: breadcrumb "Beurzen › {naam}" zichtbaar, "Bewerken" rechts
