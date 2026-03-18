# Plan: Breadcrumb-header op alle child-screens

## Context

Een deel van de child-screens gebruikt al `BreadcrumbHeader` (breadcrumbs + actie-knop, geen native stack-header):
- ✅ `FairDetailScreen` — Beurzen › {naam}
- ✅ `FairEditorScreen` — Beurzen › Nieuwe beurs / Beurzen › {naam} › Bewerken
- ✅ `ArtworkEditorScreen` — Voorraad › Nieuw kunstwerk / Voorraad › {titel} › Bewerken
- ✅ `SaleEditorScreen` — Beurzen › {beurs} › Verkoop registreren
- ✅ `ExpenseEditorScreen` — Beurzen › {beurs} › Nieuwe kostenpost

De volgende 6 routes gebruiken nog de **native stack-header** met pijl-terug. Dit plan brengt ze allemaal naar het breadcrumb-patroon.

## Te converteren routes

| # | Route | Component | Breadcrumbs | Actie |
|---|---|---|---|---|
| 1 | `/fairs/[id]/day` | `FairDayScreen` | Beurzen › {beurs} › Beursdag | Terug naar beurs |
| 2 | `/fairs/[id]/sales/[saleId]` | `SaleDetailScreen` | Beurzen › {beurs} › Verkoop | Terug naar beurs |
| 3 | `/inventory/[id]` | `ArtworkDetailScreen` | Voorraad › {titel} | Bewerken |
| 4 | `/contacts/new` | `ContactEditorScreen` | Contacten › Nieuw contact | Annuleren |
| 5 | `/contacts/[id]` | `ContactDetailScreen` | Contacten › {naam} | Bewerken |
| 6 | `/contacts/[id]/edit` | `ContactEditorScreen` | Contacten › {naam} › Bewerken | Annuleren |

## Stap 1: Layout-bestanden — headerShown: false

### `app/(tabs)/fairs/_layout.tsx`

Voeg `headerShown: false` toe aan:
```tsx
<Stack.Screen name="[id]/day" options={{ title: 'Beursdag-modus', headerShown: false }} />
<Stack.Screen name="[id]/sales/[saleId]" options={{ title: 'Verkoop', headerShown: false }} />
```

### `app/(tabs)/inventory/_layout.tsx`

Voeg `headerShown: false` toe aan:
```tsx
<Stack.Screen name="[id]/index" options={{ title: 'Kunstwerk', headerShown: false }} />
```

### `app/(tabs)/contacts/_layout.tsx`

Voeg `headerShown: false` toe aan alle child-routes:
```tsx
<Stack.Screen name="new" options={{ title: 'Nieuw contact', headerShown: false }} />
<Stack.Screen name="[id]/index" options={{ title: 'Contact', headerShown: false }} />
<Stack.Screen name="[id]/edit" options={{ title: 'Contact bewerken', headerShown: false }} />
```

## Stap 2: FairDayScreen — breadcrumb toevoegen

**Bestand:** `src/domains/fairs/FairDayScreen.tsx`

- Verwijder `<Stack.Screen options={{ title: ... }} />`
- Verwijder `Stack` uit imports
- Voeg `BreadcrumbHeader` toe boven de eerste `<Card>`:

```tsx
<BreadcrumbHeader
  breadcrumbs={[
    { label: 'Beurzen', onPress: () => router.replace('/fairs') },
    { label: fair.name, onPress: () => router.replace({ pathname: '/fairs/[id]', params: { id: fair.id } }) },
    { label: 'Beursdag' },
  ]}
  action={{ label: 'Terug naar beurs', onPress: () => router.replace({ pathname: '/fairs/[id]', params: { id: fair.id } }) }}
/>
```

**Let op:** Geen `screenTitle` nodig — het scherm heeft al een prominente hero-kaart met kicker + titel. De actie "Terug naar beurs" biedt een expliciete exit naast de sidebar-toggle. De `beforeRemove` listener voor `deactivateFairDay()` blijft intact.

De loading-state (regels 86-92) moet ook in een `<Screen>` met breadcrumbs gewrapped worden (vergelijkbaar met SaleEditorScreen). Verwijder `flex: 1` en `backgroundColor` uit de `centeredState` stijl.

## Stap 3: SaleDetailScreen — breadcrumb toevoegen

**Bestand:** `src/domains/sales/SaleDetailScreen.tsx`

- Verwijder de native `<Stack.Screen>` titel
- Voeg `BreadcrumbHeader` toe:

```tsx
<BreadcrumbHeader
  breadcrumbs={[
    { label: 'Beurzen', onPress: () => router.replace('/fairs') },
    { label: fairName ?? 'Beurs', onPress: () => router.replace({ pathname: '/fairs/[id]', params: { id: fairId } }) },
    { label: 'Verkoop' },
  ]}
  screenTitle={artworkTitle ?? 'Verkoop'}
  action={{ label: 'Terug naar beurs', onPress: () => router.replace({ pathname: '/fairs/[id]', params: { id: fairId } }) }}
/>
```

**Opmerking:** Er is geen sale-edit route in de huidige routeboom, dus de actie is "Terug naar beurs" (niet "Bewerken"). De exacte beschikbare data (fairName, artworkTitle) moet gecontroleerd worden in de huidige component. Mogelijk moet `fairName` via een extra `getFairById` query geladen worden als dat nog niet gebeurt.

## Stap 4: ArtworkDetailScreen — breadcrumb toevoegen

**Bestand:** `src/domains/inventory/ArtworkDetailScreen.tsx`

- Verwijder de native `<Stack.Screen>` titel
- Voeg `BreadcrumbHeader` toe:

```tsx
<BreadcrumbHeader
  breadcrumbs={[
    { label: 'Voorraad', onPress: () => router.replace('/inventory') },
    { label: artwork.title || 'Kunstwerk' },
  ]}
  action={{ label: 'Bewerken', onPress: () => router.push({ pathname: '/inventory/[id]/edit', params: { id: artworkId } }) }}
/>
```

## Stap 5: ContactEditorScreen — breadcrumb toevoegen

**Bestand:** `src/domains/contacts/ContactEditorScreen.tsx`

Dit component wordt voor zowel `/contacts/new` als `/contacts/[id]/edit` gebruikt (vergelijkbaar met ArtworkEditorScreen).

- Verwijder de native `<Stack.Screen>` titel

**Nieuw contact** (`contactId` is `undefined`):
```
Contacten › Nieuw contact
```
Met actie: "Annuleren" → navigeert naar `/contacts`

**Contact bewerken** (`contactId` is aanwezig):
```
Contacten › {contactnaam} › Bewerken
```
Met actie: "Annuleren" → navigeert naar `/contacts/{contactId}`

```tsx
<BreadcrumbHeader
  breadcrumbs={[
    { label: 'Contacten', onPress: () => router.replace('/contacts') },
    ...(contactId && originalContact
      ? [
          { label: originalContact.name || 'Contact', onPress: () => router.replace({ pathname: '/contacts/[id]', params: { id: contactId } }) },
          { label: 'Bewerken' },
        ]
      : [{ label: 'Nieuw contact' }]),
  ]}
  screenTitle={contactId ? 'Contact bewerken' : 'Nieuw contact'}
  action={{ label: 'Annuleren', onPress: contactId ? () => router.replace({ pathname: '/contacts/[id]', params: { id: contactId } }) : () => router.replace('/contacts') }}
/>
```

**Opmerking:** Controleer of de component al een `originalContact` of vergelijkbare state heeft. Zo niet, moet de contactnaam via een query geladen worden (vergelijkbaar met `fairName` in de sale/expense editors).

## Stap 6: ContactDetailScreen — breadcrumb toevoegen

**Bestand:** `src/domains/contacts/ContactDetailScreen.tsx`

- Verwijder de native `<Stack.Screen>` titel

```tsx
<BreadcrumbHeader
  breadcrumbs={[
    { label: 'Contacten', onPress: () => router.replace('/contacts') },
    { label: contact.name || 'Contact' },
  ]}
  action={{ label: 'Bewerken', onPress: () => router.push({ pathname: '/contacts/[id]/edit', params: { id: contactId } }) }}
/>
```

## Stap 7: Opruimen per component

Bij elke component:
- Verwijder de `Stack` import uit `expo-router` als deze niet meer nodig is (alleen `router` behouden)
- Verwijder de `<>...</>` fragment wrapper als de `<Stack.Screen>` de enige reden was
- Loading-states moeten ook de `BreadcrumbHeader` tonen (in een `<Screen>` wrapper)
- Verwijder ongebruikte stijlen die bij de oude header hoorden

## Stap 8: Verificatie

1. `npm run typecheck`
2. `npx playwright test` — alle bestaande e2e-tests
3. Visuele check in `npm run web` voor elke route:
   - `/fairs/[id]/day` — breadcrumb met "Terug naar beurs"-actie, hero intact, sidebar-toggle werkt nog
   - `/fairs/[id]/sales/[saleId]` — breadcrumb met beursnaam en "Terug naar beurs"-actie
   - `/inventory/[id]` — breadcrumb met "Bewerken"-actie
   - `/contacts/new` — breadcrumb met "Annuleren"
   - `/contacts/[id]` — breadcrumb met "Bewerken"-actie
   - `/contacts/[id]/edit` — breadcrumb met contactnaam en "Annuleren"
4. Controleer dat er **geen enkele** native pijl-terug header meer zichtbaar is in de hele app
5. Controleer dat de sidebar-toggle op beursdag-modus nog correct werkt

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/fairs/_layout.tsx` | `headerShown: false` op `[id]/day` en `[id]/sales/[saleId]` |
| `app/(tabs)/inventory/_layout.tsx` | `headerShown: false` op `[id]/index` |
| `app/(tabs)/contacts/_layout.tsx` | `headerShown: false` op `new`, `[id]/index`, `[id]/edit` |
| `src/domains/fairs/FairDayScreen.tsx` | BreadcrumbHeader, Stack.Screen verwijderen, loading-state wrappen |
| `src/domains/sales/SaleDetailScreen.tsx` | BreadcrumbHeader, Stack.Screen verwijderen |
| `src/domains/inventory/ArtworkDetailScreen.tsx` | BreadcrumbHeader, Stack.Screen verwijderen |
| `src/domains/contacts/ContactEditorScreen.tsx` | BreadcrumbHeader, Stack.Screen verwijderen |
| `src/domains/contacts/ContactDetailScreen.tsx` | BreadcrumbHeader, Stack.Screen verwijderen |

## Afhankelijkheden

- Dit plan gaat ervan uit dat de **rename van `FairChildHeader` → `BreadcrumbHeader`** (uit plan `kunstwerk-editor-breadcrumb.md`) al is uitgevoerd. Als dat niet zo is, gebruik dan `FairChildHeader` en hernoem later alsnog.

## Niet doen in deze iteratie

- Top-level tab-pagina's (Home, Voorraad index, Beurzen index, etc.) — die hebben geen native header meer
- Inhoudelijke wijzigingen aan de schermen zelf
- Nieuwe navigatie-flows toevoegen
