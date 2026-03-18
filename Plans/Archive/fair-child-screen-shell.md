# Plan: Fair child screen shell — breadcrumbs, annuleren, header-in-card

## Context

Fair-child schermen (`/fairs/[id]/expenses/new`, `/fairs/[id]/sales/new`) worden vaak bereikt via Home-snelacties (cross-tab deep link). Daardoor:
- geen back-button zichtbaar (geen vorige route in de Beurzen-stack)
- geen context welke beurs je bewerkt
- gebruiker zit vast zonder expliciete terug-actie

## Ontwerpdoel

Elk fair-child scherm moet:
- direct tonen bij welke beurs je bent (breadcrumb)
- een expliciete "Annuleren" actie bieden, onafhankelijk van de native stack
- visueel consistent zijn met de Card-first richting (geen losse stack header)

Niet in deze iteratie:
- `/fairs/new` (geen beurs-context, heeft werkende back-arrow)
- `/fairs/[id]/edit` (idem, eigen context)
- Andere tabs (contacten, voorraad editors)
- Stack-state reset bij tab-wissel (laten bestaan)

## Stap 1: Native header verbergen voor fair-child routes

**Bestand:** `app/(tabs)/fairs/_layout.tsx`

Voeg `headerShown: false` toe aan de twee fair-child editor routes:

```tsx
<Stack.Screen name="[id]/expenses/new" options={{ title: 'Nieuwe kostenpost', headerShown: false }} />
<Stack.Screen name="[id]/sales/new" options={{ title: 'Verkoop registreren', headerShown: false }} />
```

De titel blijft als fallback voor accessibility, maar de visuele header verdwijnt.

## Stap 2: Fair naam beschikbaar maken in editors

**Bestanden:**
- `src/domains/expenses/ExpenseEditorScreen.tsx`
- `src/domains/sales/SaleEditorScreen.tsx`

Beide schermen ontvangen nu alleen `fairId`. Ze laden de beursnaam niet.

### Aanpak

Laad de beursnaam via de bestaande `getFairById()` uit `src/domains/fairs/repository.ts` in de `useAsyncEffect` van elk scherm:

```ts
const [fairName, setFairName] = useState<string | null>(null);

// In useAsyncEffect:
const fair = fairId ? await getFairById(db, fairId) : null;
if (!isMounted()) return;
setFairName(fair?.name ?? null);
```

De SaleEditorScreen heeft al een `useAsyncEffect` met async loads (candidates, contacts). De fair-naam kan daar parallel aan mee.

De ExpenseEditorScreen heeft nog geen `useAsyncEffect`. Voeg een minimale toe voor alleen de fair-naam.

### Loading-gedrag fair-naam (beide schermen)

Render `FairChildHeader` altijd direct, ook als de fair-naam nog niet geladen is:
- Gebruik `fairName ?? 'Beurs'` als fallback-label in de breadcrumb
- Zodra de naam geladen is, update de state en toont de breadcrumb de echte naam
- Zo kan de gebruiker altijd direct annuleren, zonder te wachten op de fetch

## Stap 3: Gedeelde FairChildHeader component

**Bestand:** `src/shared/components/FairChildHeader.tsx` (nieuw)

Compacte component die bovenaan elk fair-child scherm komt:

```tsx
type BreadcrumbSegment = {
  label: string;
  onPress?: () => void;  // geen onPress = niet klikbaar (huidige pagina)
};

type FairChildHeaderProps = {
  breadcrumbs: BreadcrumbSegment[];
  screenTitle: string;
  action: {
    label: string;    // bijv. 'Annuleren' (editors) of 'Bewerken' (detail)
    onPress: () => void;
  };
};

function FairChildHeader({ breadcrumbs, screenTitle, action }: FairChildHeaderProps)
```

De component is puur presentational — alle navigatie-callbacks komen van de aanroeper. Geen routekennis in de component zelf. De `action` prop is generiek: editors gebruiken `label: 'Annuleren'`, de fair detail pagina gebruikt `label: 'Bewerken'` (zie vervolgplan `fair-detail-breadcrumb.md`).

Aanroep-voorbeeld (editor):
```tsx
<FairChildHeader
  breadcrumbs={[
    { label: 'Beurzen', onPress: () => router.replace('/fairs') },
    { label: fairName ?? 'Beurs', onPress: () => router.replace(`/fairs/${fairId}`) },
    { label: 'Nieuwe kostenpost' },
  ]}
  screenTitle="Nieuwe kostenpost"
  action={{ label: 'Annuleren', onPress: () => router.replace(`/fairs/${fairId}`) }}
/>
```

### Inhoud

1. **Breadcrumb-rij** (bovenaan, klein):
   `Beurzen › {fairName ?? 'Beurs'} › Nieuwe kostenpost`
   - Segmenten met `onPress` zijn klikbaar (stijl: `palette.accent`)
   - Laatste segment zonder `onPress` is niet klikbaar (stijl: `palette.mutedText`)
   - Stijl: `fontSize: 13`, separator ` › ` als tekst

2. **Titel + annuleer-rij** (eronder):
   - Links: `screenTitle` als grote titel (fontSize 20, fontWeight 700)
   - Rechts: "Annuleren" als tekst-button (geen AppButton, gewoon `Pressable` + `Text` in `palette.accent`)

### Styling

- Geen Card-wrapper — dit is een losse header die boven de eerste Card van het scherm zit
- Past visueel bij de aarde-tonen van de app
- Breadcrumb-separator: ` › ` (tekst, geen icoon)

## Stap 4: FairChildHeader integreren in ExpenseEditorScreen

**Bestand:** `src/domains/expenses/ExpenseEditorScreen.tsx`

### Wijzigingen

1. Verwijder `<Stack.Screen options={{ title: 'Nieuwe kostenpost' }} />`
2. Voeg `FairChildHeader` toe boven de eerste Card (altijd gerenderd, ook voor fair-naam geladen is):
   ```tsx
   <FairChildHeader
     breadcrumbs={[
       { label: 'Beurzen', onPress: () => router.replace('/fairs') },
       { label: fairName ?? 'Beurs', onPress: () => router.replace(`/fairs/${fairId}`) },
       { label: 'Nieuwe kostenpost' },
     ]}
     screenTitle="Nieuwe kostenpost"
     action={{ label: 'Annuleren', onPress: () => router.replace(`/fairs/${fairId}`) }}
   />
   ```
3. Verwijder de uitlegtekst-Card ("Voeg een kostenpost toe...Leg kosten direct vast op de beurs...") — de breadcrumb geeft voldoende context

## Stap 5: FairChildHeader integreren in SaleEditorScreen

**Bestand:** `src/domains/sales/SaleEditorScreen.tsx`

### Wijzigingen

1. Verwijder `<Stack.Screen options={{ title: 'Verkoop registreren' }} />`
2. Voeg `FairChildHeader` toe boven de eerste Card (altijd gerenderd, ook tijdens laden):
   ```tsx
   <FairChildHeader
     breadcrumbs={[
       { label: 'Beurzen', onPress: () => router.replace('/fairs') },
       { label: fairName ?? 'Beurs', onPress: () => router.replace(`/fairs/${fairId}`) },
       { label: 'Verkoop registreren' },
     ]}
     screenTitle="Verkoop registreren"
     action={{ label: 'Annuleren', onPress: () => router.replace(`/fairs/${fairId}`) }}
   />
   ```
3. Verwijder de uitlegtekst-Card ("Registreer een verkoop...") — breadcrumb biedt context

### Loading state

De SaleEditorScreen heeft een loading state. Toon de `FairChildHeader` altijd, ook tijdens laden. Zo kan de gebruiker direct annuleren zonder te wachten.

## Stap 6: Testen

### E2E

**Bestand:** `tests/e2e/fair-child-nav.spec.ts` (nieuw)

1. **Breadcrumb zichtbaar op expenses/new**: maak beurs, navigeer naar `/fairs/{id}/expenses/new`, check dat beursnaam en "Nieuwe kostenpost" in breadcrumb staan
2. **Annuleren werkt**: klik "Annuleren", verify navigatie naar `/fairs/{id}`
3. **Breadcrumb link werkt**: klik op beursnaam in breadcrumb, verify navigatie naar `/fairs/{id}`
4. **Cross-tab navigatie**: navigeer vanuit Home snelactie "Onkosten" → expenses/new, verify dat breadcrumb en annuleren werken

### Typecheck

`npm run typecheck` moet slagen.

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/fairs/_layout.tsx` | `headerShown: false` op expenses/new en sales/new |
| `src/domains/expenses/ExpenseEditorScreen.tsx` | FairChildHeader, fair naam laden, Stack.Screen + uitlegtekst weg |
| `src/domains/sales/SaleEditorScreen.tsx` | FairChildHeader, fair naam laden, Stack.Screen + uitlegtekst weg |
| `src/shared/components/FairChildHeader.tsx` | Nieuw: breadcrumb + titel + annuleren |
| `tests/e2e/fair-child-nav.spec.ts` | Nieuw: navigatie en breadcrumb checks |

## Niet doen in deze iteratie

- Geen stack-state reset bij tab-wissel
- Geen wijziging aan `/fairs/new` of `/fairs/[id]/edit`
- Geen brede editor-unificatie over alle tabs
- Geen wijziging aan de fair detail pagina zelf
- Geen wijziging aan de sale detail pagina (`/fairs/[id]/sales/[saleId]`)

## Verificatie

1. `npm run typecheck`
2. `npm run test:unit`
3. `npx playwright test tests/e2e/fair-child-nav.spec.ts`
4. `npx playwright test tests/e2e/journey-smoke.spec.ts`
5. Visuele check in `npm run web`: navigeer via Home snelacties naar expenses/new en sales/new
