# Plan: Kunstwerk-editor breadcrumb (gelijktrekken met beurzen)

## Context

De kunstwerk-editor (`/inventory/new` en `/inventory/[id]/edit`) gebruikt nog de native stack-header met een pijl-terug + titel. De beurzen-child-screens zijn al omgebouwd naar het `BreadcrumbHeader`-patroon met breadcrumbs en een "Annuleren"-actie. Dit plan trekt de kunstwerk-editor gelijk.

Huidige situatie:
- Native header: "Nieuw kunstwerk" (new) / "Kunstwerk bewerken" (edit)
- Eerste kaart bevat een intro-titel ("Voeg een kunstwerk toe" / "Bewerk kunstwerk") + uitlegbody
- Geen breadcrumbs, geen duidelijke navigatiecontext

## Ontwerpdoel

- Native stack-header verbergen voor de editor-routes
- Breadcrumb-header toevoegen met "Annuleren"-actie
- Intro-titel en body uit de `PhotoSection` verwijderen (wordt overbodig door de breadcrumb-header)
- Consistent met het patroon op expenses/new en sales/new

## Stap 0: FairChildHeader hernoemen naar BreadcrumbHeader

**Bestanden:**
- `src/shared/components/FairChildHeader.tsx` → hernoemen naar `src/shared/components/BreadcrumbHeader.tsx`
- Alle imports bijwerken (expenses, sales, en dit plan)

`FairChildHeader` wordt nu voor het eerst buiten het fair-domein gebruikt. De naam is misleidend — het is feitelijk een generieke breadcrumb/action-header voor editor- en child-screens. Hernoemen vóór uitbreiding voorkomt naming-schuld.

Concreet:
- Bestandsnaam: `FairChildHeader.tsx` → `BreadcrumbHeader.tsx`
- Componentnaam: `FairChildHeader` → `BreadcrumbHeader`
- Type: `FairChildHeaderProps` → `BreadcrumbHeaderProps`
- Alle bestaande imports in `ExpenseEditorScreen.tsx` en `SaleEditorScreen.tsx` bijwerken
- Eventuele plannen die naar `FairChildHeader` verwijzen gelden dan voor `BreadcrumbHeader`

## Stap 1: Native headers verbergen

**Bestand:** `app/(tabs)/inventory/_layout.tsx`

Voeg `headerShown: false` toe aan de `new` en `[id]/edit` routes:

```tsx
<Stack.Screen name="new" options={{ title: 'Nieuw kunstwerk', headerShown: false }} />
<Stack.Screen name="[id]/edit" options={{ title: 'Kunstwerk bewerken', headerShown: false }} />
```

## Stap 2: BreadcrumbHeader toevoegen aan ArtworkEditorScreen

**Bestand:** `src/domains/inventory/ArtworkEditorScreen.tsx`

Import `BreadcrumbHeader` en voeg breadcrumbs toe. Verwijder de `<Stack.Screen>` dynamische titel.

**Nieuw kunstwerk** (`artworkId` is `undefined`):
```
Voorraad › Nieuw kunstwerk
```
Met actie: "Annuleren" → navigeert naar `/inventory`

**Kunstwerk bewerken** (`artworkId` is aanwezig):
```
Voorraad › {artwork titel} › Bewerken
```
Met actie: "Annuleren" → navigeert naar `/inventory/{artworkId}`

De artwork-titel voor de breadcrumb is beschikbaar via `originalArtwork?.title` (al geladen in state).

Navigatie-helpers:
```tsx
const goToInventory = () => {
  router.replace('/inventory');
};

const goToArtworkDetail = () => {
  if (artworkId) {
    router.replace({ pathname: '/inventory/[id]', params: { id: artworkId } });
    return;
  }
  goToInventory();
};
```

Header:
```tsx
<BreadcrumbHeader
  breadcrumbs={[
    { label: 'Voorraad', onPress: goToInventory },
    ...(artworkId && originalArtwork
      ? [
          { label: originalArtwork.title || 'Kunstwerk', onPress: goToArtworkDetail },
          { label: 'Bewerken' },
        ]
      : [{ label: 'Nieuw kunstwerk' }]),
  ]}
  screenTitle={artworkId ? 'Kunstwerk bewerken' : 'Nieuw kunstwerk'}
  action={{ label: 'Annuleren', onPress: artworkId ? goToArtworkDetail : goToInventory }}
/>
```

## Stap 3: Intro-titel en body verwijderen uit PhotoSection

**Bestand:** `src/domains/inventory/ArtworkEditorScreen.tsx`

De `PhotoSection` bevat nu:
```tsx
<Text style={styles.title}>{artworkId ? 'Bewerk kunstwerk' : 'Voeg een kunstwerk toe'}</Text>
<Text style={styles.body}>Sla titel, afmetingen, status en foto lokaal op...</Text>
```

Dit wordt overbodig: de breadcrumb-header geeft al de paginacontext. Verwijder beide `<Text>`-elementen uit `PhotoSection`.

Verwijder ook de ongebruikte stijlen `title` en `body` uit `StyleSheet.create()`.

Update de `PhotoSectionProps` — verwijder `artworkId` als prop (niet meer nodig voor de titel).

## Stap 4: Stack.Screen dynamische titel verwijderen

**Bestand:** `src/domains/inventory/ArtworkEditorScreen.tsx`

Verwijder regel 224:
```tsx
// Verwijder:
<Stack.Screen options={{ title: artworkId ? 'Kunstwerk bewerken' : 'Nieuw kunstwerk' }} />
```

En verwijder de `Stack` import uit `expo-router` (alleen `router` behouden).

De `<>...</>` fragment wrapper kan dan ook weg — vervang door direct de `<Screen>` component.

## Stap 5: Loading-state header toevoegen

**Bestand:** `src/domains/inventory/ArtworkEditorScreen.tsx`

De loading-state (regel 213–220) toont nu alleen een spinner zonder navigatie. Wrap dit in een `<Screen>` met de header (zoals bij `SaleEditorScreen`):

```tsx
if (loading) {
  return (
    <Screen scroll>
      {header}
      <View style={styles.loadingState}>
        <ActivityIndicator color={palette.accent} />
        <Text style={styles.loadingText}>Kunstwerk laden...</Text>
      </View>
    </Screen>
  );
}
```

Pas `loadingState` stijl aan: verwijder `flex: 1` en `backgroundColor` (wordt door `Screen` afgehandeld).

## Stap 6: Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/smoke.spec.ts` — raakt de `/inventory/new` flow
3. Visuele check in `npm run web`:
   - `/inventory/new`: breadcrumb "Voorraad › Nieuw kunstwerk", geen native header, geen intro-titel in kaart
   - `/inventory/[id]/edit`: breadcrumb "Voorraad › {titel} › Bewerken", "Annuleren" gaat naar detail
   - Loading-state toont header met breadcrumbs
4. Controleer dat "Annuleren" correct navigeert in beide varianten
5. Controleer dat expenses/new en sales/new nog correct werken na de rename

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/shared/components/FairChildHeader.tsx` | Hernoemen naar `BreadcrumbHeader.tsx`, component + type hernoemen |
| `src/domains/expenses/ExpenseEditorScreen.tsx` | Import bijwerken naar `BreadcrumbHeader` |
| `src/domains/sales/SaleEditorScreen.tsx` | Import bijwerken naar `BreadcrumbHeader` |
| `app/(tabs)/inventory/_layout.tsx` | `headerShown: false` op `new` en `[id]/edit` |
| `src/domains/inventory/ArtworkEditorScreen.tsx` | BreadcrumbHeader, intro verwijderen, Stack.Screen verwijderen, loading-state header |

## Niet doen in deze iteratie

- Artwork detail-pagina (`/inventory/[id]`) breadcrumbs — apart plan als gewenst
- Inventory index-pagina header aanpassen
- Inhoudelijke wijzigingen aan de editor-formuliervelden
