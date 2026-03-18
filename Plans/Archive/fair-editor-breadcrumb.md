# Plan: FairEditorScreen naar breadcrumb-standaard

## Context

De "Nieuwe beurs" en "Beurs bewerken" pagina's (`/fairs/new`, `/fairs/[id]/edit`) gebruiken nog de oude stijl: native stack header (← pijl + titel) en een aparte Card met uitlegtekst. De onkostenpost- en verkooppagina's zijn al omgebouwd naar de nieuwe standaard met `FairChildHeader` (breadcrumbs + actie-button).

`FairEditorScreen` wordt voor beide routes gebruikt (`fairId` is optional).

## Ontwerpdoel

Visuele consistentie met de rest van de fair-schermen: breadcrumbs, titel + "Annuleren", geen native header, geen uitlegtekst-eiland.

## Stap 1: Native header verbergen

**Bestand:** `app/(tabs)/fairs/_layout.tsx`

```tsx
<Stack.Screen name="new" options={{ title: 'Nieuwe beurs', headerShown: false }} />
<Stack.Screen name="[id]/edit" options={{ title: 'Beurs bewerken', headerShown: false }} />
```

## Stap 2: FairChildHeader integreren in FairEditorScreen

**Bestand:** `src/domains/fairs/FairEditorScreen.tsx`

### Wijzigingen

1. Verwijder `<Stack.Screen options={{ title: fairId ? 'Beurs bewerken' : 'Nieuwe beurs' }} />`

2. Voeg `FairChildHeader` toe boven de eerste Card, met twee varianten:

   **Nieuwe beurs** (`fairId` is undefined):
   ```tsx
   <FairChildHeader
     breadcrumbs={[
       { label: 'Beurzen', onPress: () => router.replace('/fairs') },
       { label: 'Nieuwe beurs' },
     ]}
     screenTitle="Nieuwe beurs"
     action={{ label: 'Annuleren', onPress: () => router.replace('/fairs') }}
   />
   ```

   **Beurs bewerken** (`fairId` is set):
   ```tsx
   <FairChildHeader
     breadcrumbs={[
       { label: 'Beurzen', onPress: () => router.replace('/fairs') },
       { label: values.name || 'Beurs', onPress: () => router.replace(`/fairs/${fairId}`) },
       { label: 'Bewerken' },
     ]}
     screenTitle="Beurs bewerken"
     action={{ label: 'Annuleren', onPress: () => router.replace(`/fairs/${fairId}`) }}
   />
   ```

   Bij bewerken is de beursnaam al beschikbaar via `values.name` (geladen in useAsyncEffect). Geen extra fetch nodig.

3. Voeg een route-helper toe voor het return-pad (consistent met expenses/sales patroon):
   ```tsx
   const goBack = () => {
     if (fairId) {
       router.replace({ pathname: '/fairs/[id]', params: { id: fairId } });
       return;
     }
     router.replace('/fairs');
   };
   ```
   Gebruik `goBack` in zowel de `action.onPress` als eventuele error/fallback paden. Voorkomt verstrooide inline route-strings.

4. Verwijder de uitlegtekst-Card:
   ```tsx
   // WEG:
   <Card>
     <Text style={styles.title}>Maak een beurs aan / Werk beursgegevens bij</Text>
     <Text style={styles.body}>Vul de kerngegevens in...</Text>
   </Card>
   ```
   De breadcrumb biedt voldoende context.

4. Verwijder ongebruikte styles: `title`, `body`

### Loading state

Bij bewerken toont het scherm nu een centered loading spinner zonder header. Wijzig dit zodat de `FairChildHeader` altijd zichtbaar is, ook tijdens laden:

```tsx
if (loading) {
  return (
    <Screen scroll>
      <FairChildHeader
        breadcrumbs={[
          { label: 'Beurzen', onPress: () => router.replace('/fairs') },
          { label: 'Beurs', onPress: fairId ? () => router.replace(`/fairs/${fairId}`) : undefined },
          { label: 'Bewerken' },
        ]}
        screenTitle="Beurs bewerken"
        action={{ label: 'Annuleren', onPress: () => router.replace(fairId ? `/fairs/${fairId}` : '/fairs') }}
      />
      <View style={styles.centeredState}>
        <ActivityIndicator ... />
      </View>
    </Screen>
  );
}
```

## Stap 3: Testen

**Bestand:** `tests/e2e/fair-child-nav.spec.ts` (uitbreiden)

Toevoegen:

1. **Nieuwe beurs breadcrumb**: navigeer naar `/fairs/new`, check dat breadcrumb "Beurzen › Nieuwe beurs" zichtbaar is
2. **Annuleren op nieuwe beurs**: klik "Annuleren", verify navigatie naar `/fairs`
3. **Beurs bewerken breadcrumb**: maak beurs, ga naar edit, check dat beursnaam in breadcrumb staat
4. **Annuleren op beurs bewerken**: klik "Annuleren", verify navigatie naar `/fairs/{id}` (fair detail, niet de beurzenlijst)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/fairs/_layout.tsx` | `headerShown: false` op `new` en `[id]/edit` |
| `src/domains/fairs/FairEditorScreen.tsx` | FairChildHeader, Stack.Screen weg, uitlegtekst-Card weg, loading state met header |
| `tests/e2e/fair-child-nav.spec.ts` | Breadcrumb + annuleer checks voor nieuwe beurs en bewerken |

## Afhankelijkheid

Vereist dat `FairChildHeader` de generieke `action: { label, onPress }` prop heeft (zie `fair-child-screen-shell.md` en `fair-detail-breadcrumb.md`). Als die API-wijziging nog niet is doorgevoerd, moet dat eerst gebeuren.

## Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/fair-child-nav.spec.ts`
3. Visuele check: `/fairs/new` en `/fairs/{id}/edit` matchen de onkostenpost-stijl
