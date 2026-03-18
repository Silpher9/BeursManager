# BeursManager — Code Review & Verbeterpunten

> Oorspronkelijk gereviewed door Claude op 12 maart 2026, daarna aangescherpt na verificatie van de code door Codex. Dit document bevat de bevindingen na het doorlezen van de huidige codebase (Fase 0+1 inventory + Fase 2 fairs) en is bedoeld als instructieset voor verdere ontwikkeling.

> **Status update 14 maart 2026:** 9 van 15 bevindingen zijn opgelost. Zie per item de status.

---

## 1. Bugs

### 1.1 [OPGELOST] FairDetailScreen herlaadt niet na bewerking
- **Bestand:** `src/domains/fairs/FairDetailScreen.tsx`
- **Probleem:** De `useEffect` (regel 46-89) draait alleen op mount — dependency is `[db, fairId]`. Als de gebruiker een beurs bewerkt via `/fairs/[id]/edit` en terug navigeert, toont het detail screen de oude data.
- **Oplossing:** Voeg `useIsFocused` toe van `@react-navigation/native`, net zoals in `app/(tabs)/inventory/index.tsx` (regel 2, 18, 24). Voeg `isFocused` toe als dependency aan de `useEffect`.
- **Voorbeeld uit de codebase:**
  ```tsx
  // Zie app/(tabs)/inventory/index.tsx, regels 17-55
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) return;
    // ... load data
  }, [db, isFocused]);
  ```

---

## 2. Gedupliceerde code (DRY violations)

### 2.1 [OPGELOST] `formatFairDateRange` en `formatDate` staan op twee plekken
- **Locaties:**
  - `app/(tabs)/fairs/index.tsx` regels 152-175
  - `src/domains/fairs/FairDetailScreen.tsx` regels 273-296
- **Oplossing:** Verplaats naar een nieuw bestand `src/domains/fairs/formatters.ts` en importeer op beide plekken.

### 2.2 [OPGELOST] `euroFormatter` (Intl.NumberFormat) is gedupliceerd
- **Locaties:**
  - `src/domains/fairs/FairDetailScreen.tsx` regel 31-35
  - `app/(tabs)/inventory/index.tsx` regel 24-28
  - `src/domains/inventory/ArtworkDetailScreen.tsx` regel 27-31
- **Oplossing:** Verplaats naar `src/shared/formatters.ts`:
  ```tsx
  export const euroFormatter = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  export function formatPrice(price: number | null): string | null {
    return typeof price === 'number' ? euroFormatter.format(price) : null;
  }
  ```

---

## 3. UX-verbeteringen

### 3.1 [OPGELOST] Datum-invoer als tekstveld
- **Bestand:** `src/domains/fairs/FairEditorScreen.tsx` regels 131-149
- **Probleem:** De gebruiker moet handmatig `YYYY-MM-DD` typen. Foutgevoelig en onhandig op tablet.
- **Aanbeveling:** Gebruik `@react-native-community/datetimepicker` of een soortgelijke library. Deze ondersteunt iOS/Android native date pickers en werkt goed met Expo.
- **Alternatief (minimaal):** Voeg tenminste `keyboardType="numbers-and-punctuation"` toe en een duidelijker placeholder/mask.
- **Prioriteit:** Middel — waardevol, maar niet boven de refresh-fix of image pipeline.

### 3.2 [OPEN] Geen zoek/filter op beurzenlijst
- **Bestand:** `app/(tabs)/fairs/index.tsx`
- **Probleem:** De inventory-lijst heeft zoeken op titel/techniek/serie en filteren op status. De beurzenlijst toont alles zonder filter. Nu niet erg (weinig beurzen), maar inconsistent.
- **Prioriteit:** Laag — pas relevant bij >10 beurzen.

---

## 4. Code-kwaliteit verbeteringen

### 4.1 [OPEN — ERGER GEWORDEN] Grote componenten opsplitsen
- **`src/domains/fairs/FairDetailScreen.tsx`** — 846 regels (was niet eerder gemeld, nu het grootste component)
  - Splits in subcomponenten per tab/sectie
- **`src/domains/inventory/ArtworkEditorScreen.tsx`** — 649 regels (was 486)
  - Splits in subcomponenten: `PhotoSection`, `DimensionsFields`, `StatusPicker`
- **`app/(tabs)/inventory/index.tsx`** — 539 regels (was 490)
  - Splits in: `InventoryStatsCard`, `InventoryFilterBar`, `ArtworkListItem`
- **Waarom:** Makkelijker te onderhouden, makkelijker voor AI-assistenten om mee te werken (minder context nodig per wijziging).

### 4.2 [OPEN — LAGE PRIORITEIT] `isMounted` pattern overal
- In `FairDetailScreen.tsx`, `FairEditorScreen.tsx`, `inventory/index.tsx`, etc. wordt telkens het `isMounted` cleanup-pattern herhaald.
- **Optie:** Maak een `useAsyncEffect` of `useSafeAsync` hook in `src/shared/hooks/` die dit pattern abstraheert. Maar dit is optioneel — het huidige pattern is correct en expliciet.

---

## 5. Ontbrekende functionaliteit (volgens plan)

### 5.1 [OPEN] Extra foto's
- **Schema:** `extra_photo_paths` kolom bestaat in de `artworks` tabel (JSON array)
- **UI:** Alleen de hoofdfoto wordt getoond/bewerkt. Er is geen UI om extra foto's toe te voegen.
- **Prioriteit:** Laag — kan later als enhancement.

### 5.2 [OPGELOST] Image-compressie en thumbnails
- **Probleem:** Foto's van de camera worden 1:1 opgeslagen via `artworkStorage.ts`. iPad Pro camera maakt 12MP+ foto's. Bij 100+ werken kan dit GB's aan opslag kosten.
- **Aanbeveling:** Gebruik `expo-image-manipulator` om te comprimeren/resizen bij opslag:
  ```tsx
  import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

  const compressed = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 2000 } }], // max breedte
    { compress: 0.8, format: SaveFormat.JPEG }
  );
  ```
- **Thumbnail:** Genereer tegelijkertijd een 200px thumbnail voor de lijstweergave.
- **Prioriteit:** Hoog — dit raakt opslag, sync-/backupgrootte en scroll-performance direct.

### 5.3 [OPEN] Paginering inventarislijst
- **Bestand:** `app/(tabs)/inventory/index.tsx`
- **Probleem:** `listArtworks` laadt alle rijen in één keer. De ScrollView rendert alles.
- **Aanbeveling:** Wissel ScrollView voor `FlatList` met `onEndReached` voor infinite scroll, of voeg `LIMIT/OFFSET` toe aan de SQL query.
- **Prioriteit:** Laag tot middel — technisch terecht, maar pas urgent zodra de dataset echt groeit.

---

## 6. Potentiële problemen

### 6.1 [OPEN] Geen error boundaries
- Alleen de default boundary van expo-router (`+not-found.tsx`).
- Een crash in `ArtworkEditorScreen` of `FairDetailScreen` gooit de gebruiker terug naar het begin.
- **Aanbeveling:** Voeg een `ErrorBoundary` component toe in `src/shared/components/` die een "Er ging iets mis" scherm toont met een retry-knop.

### 6.2 [OPGELOST] Tests ontbreken volledig
- Geen testframework geconfigureerd (geen jest, vitest, of testing-library).
- Minstens de validatielogica (`validateArtworkEditorValues`, `validateFairEditorValues`) en repository-functies zijn goed unit-testbaar.
- **Advies:** Begin klein met unit-tests voor validators, repositories en formatter/util logica. Zet niet meteen een brede React Native UI-testlaag op als eerste kwaliteitsstap.
- **Setup:** bijvoorbeeld `jest` + gerichte unit-tests; RN UI-tests kunnen later volgen.

---

## 7. Kleine punten

| # | Bestand | Punt |
|---|---------|------|
| 7.1 | `app/(tabs)/fairs/index.tsx:82` | [OPGELOST] ~~`"Fase 2"` kicker-tekst~~ — nu "Beursoverzicht". |
| 7.2 | `src/domains/fairs/FairDetailScreen.tsx:31` | [OPGELOST] ~~`euroFormatter` niet geëxporteerd~~ — verplaatst naar `src/shared/formatters.ts`. |
| 7.3 | `app/(tabs)/_layout.tsx` | [OPGELOST] ~~Tabs zonder icons~~ — icons toegevoegd aan alle tabs. |

---

## 8. Prioritering (bijgewerkt 14 maart 2026)

1. ~~**Bug fix:** `useIsFocused` in `FairDetailScreen.tsx`~~ — OPGELOST (nog ontbrekend in ArtworkDetailScreen)
2. ~~**Performance:** Image-compressie + thumbnails bij opslag~~ — OPGELOST
3. ~~**DRY:** Gedupliceerde formatters naar shared utils verplaatsen~~ — OPGELOST
4. **Kwaliteit:** Grote componenten opsplitsen — OPEN, urgenter geworden (FairDetailScreen 846r)
5. ~~**Kwaliteit:** Kleine unit-testlaag op validators/repositories/utils~~ — OPGELOST
6. ~~**UX:** Date picker voor beurs start/einddatum~~ — OPGELOST
7. **Performance:** FlatList/paginering voor inventory zodra de dataset groeit — OPEN
8. **Robuustheid:** Error boundaries toevoegen — OPEN
9. ~~**Polish:** Tab bar icons toevoegen~~ — OPGELOST

---

*Dit document is bedoeld als directe instructie voor Codex of een andere AI-assistent om de verbeteringen door te voeren.*
