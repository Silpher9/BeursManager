# Plan: Breadcrumb op fair detail pagina

## Context

De fair detail pagina (`/fairs/[id]`) heeft geen terugnavigatie naar de beurzenlijst. Als je via Home of een deep link op deze pagina komt, zit je vast — de Beurzen-stack heeft geen history, dus geen native back-button.

Dit is een vervolguitbreiding op `fair-child-screen-shell.md` dat dezelfde `FairChildHeader` component hergebruikt.

## Ontwerpdoel

- Klikbare breadcrumb bovenaan de fair detail pagina: `Beurzen › {beursnaam}`
- Consistente navigatie-ervaring met de fair-child editors

## Stap 1: Native header verbergen

**Bestand:** `app/(tabs)/fairs/_layout.tsx`

Voeg `headerShown: false` toe aan de fair detail route:

```tsx
<Stack.Screen name="[id]/index" options={{ title: 'Beurs', headerShown: false }} />
```

## Stap 2: FairChildHeader integreren in FairDetailScreen

**Bestand:** `src/domains/fairs/FairDetailScreen.tsx`

### Wijzigingen

1. Verwijder `<Stack.Screen options={{ title: fair.name, headerRight: ... }} />`
2. Voeg `FairChildHeader` toe boven de eerste Card:
   ```tsx
   <FairChildHeader
     breadcrumbs={[
       { label: 'Beurzen', onPress: () => router.replace('/fairs') },
       { label: fair?.name ?? 'Beurs' },
     ]}
     screenTitle={fair?.name ?? 'Beurs'}
     onCancel={() => router.replace('/fairs')}
   />
   ```
3. De "Bewerken" button die nu in `headerRight` zit moet verplaatst worden. Twee opties:
   - **A)** Naast de titel in de FairChildHeader (rechts van de titel, waar nu "Annuleren" staat)
   - **B)** Als aparte knop in de eerste Card

### Voorkeur: optie A — "Bewerken" vervangt "Annuleren"

Op de detail pagina is "Annuleren" niet logisch (je annuleert niets). In plaats daarvan:
- Rechts van de titel: "Bewerken" tekst-button (zelfde stijl als "Annuleren" in de editors)
- `onPress: () => router.push(`/fairs/${fairId}/edit`)`

Dit betekent dat `FairChildHeader` een generieke rechter-actie nodig heeft in plaats van een hardcoded "Annuleren" label. Pas de component aan:

```tsx
type FairChildHeaderProps = {
  breadcrumbs: BreadcrumbSegment[];
  screenTitle: string;
  action: {
    label: string;
    onPress: () => void;
  };
};
```

De editors gebruiken `action: { label: 'Annuleren', onPress: ... }`, de detail pagina gebruikt `action: { label: 'Bewerken', onPress: ... }`.

## Stap 3: Testen

**Bestand:** `tests/e2e/fair-child-nav.spec.ts` (uitbreiden, aangemaakt door het fair-child-screen-shell plan)

Toevoegen:

1. **Breadcrumb op fair detail**: navigeer naar `/fairs/{id}`, check dat "Beurzen" klikbaar is
2. **Terug naar beurzenlijst**: klik op "Beurzen" in breadcrumb, verify URL `/fairs`
3. **Bewerken-knop werkt**: check dat "Bewerken" naar `/fairs/{id}/edit` navigeert

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/fairs/_layout.tsx` | `headerShown: false` op `[id]/index` |
| `src/domains/fairs/FairDetailScreen.tsx` | FairChildHeader met breadcrumb + "Bewerken", Stack.Screen weg |
| `src/shared/components/FairChildHeader.tsx` | `onCancel` → generieke `action: { label, onPress }` prop |
| `src/domains/expenses/ExpenseEditorScreen.tsx` | `onCancel` → `action: { label: 'Annuleren', onPress: ... }` |
| `src/domains/sales/SaleEditorScreen.tsx` | `onCancel` → `action: { label: 'Annuleren', onPress: ... }` |
| `tests/e2e/fair-child-nav.spec.ts` | Fair detail breadcrumb checks toevoegen |

## Afhankelijkheid

Dit plan hangt af van `fair-child-screen-shell.md` — de `FairChildHeader` component moet eerst bestaan. De prop-aanpassing (`onCancel` → `action`) kan tegelijk met de eerste implementatie of als directe follow-up.

## Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/fair-child-nav.spec.ts`
3. Visuele check: navigeer via Home naar een beurs, check dat breadcrumb "Beurzen" klikbaar is
