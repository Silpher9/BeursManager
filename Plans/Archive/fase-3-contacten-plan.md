# Plan: Fase 3 — Contacten afronden

## Context

Fase 0-2 en Home Hub zijn af. Fase 3 (Contacten) heeft al een werkende editor, lijst en beurscontext, maar mist drie onderdelen: een contactdetailscherm, zoek/filter op de lijst, en een UI voor contact-kunstwerk interesses.

Codex-review heeft drie problemen in het oorspronkelijke plan geïdentificeerd die eerst opgelost moeten worden:
1. **NULL in composite PK** — `contact_artworks` PK `(contact_id, artwork_id, fair_id)` met nullable `fair_id` maakt ON CONFLICT onbetrouwbaar
2. **Picker API tegenstrijdigheid** — fair-specifieke interesses worden samengeslagen op alleen artworkId
3. **Edit flow** — na bewerken vanuit detail → terug naar lijst i.p.v. detail

## Overzicht

| # | Feature | Complexiteit |
|---|---------|-------------|
| 0 | Schema migratie: contact_artworks PK vereenvoudigen | Klein |
| 1 | Contact Detail Screen (bekijken + verwijderen) | Groot |
| 2 | Zoek/filter op contactenlijst | Middel |
| 3 | Contact-kunstwerk interesse-koppeling UI | Middel |
| 4 | Edit flow fixen | Klein |

---

## Stap 0: Schema migratie (v4→v5)

### Probleem
`contact_artworks` heeft PK `(contact_id, artwork_id, fair_id)` met nullable `fair_id`. SQLite behandelt elke NULL als uniek in PKs, waardoor:
- `ON CONFLICT` nooit triggert voor rijen met `fair_id = NULL`
- Meerdere "general interest" rijen voor hetzelfde contact+artwork mogelijk zijn
- De bestaande `upsertContactArtworkLink` in `sales/repository.ts:347-360` alleen werkt omdat die altijd een non-null `fairId` meegeeft

### Oplossing
PK vereenvoudigen naar `(contact_id, artwork_id)`. Eén interesse per contact-artwork paar. `fair_id` blijft als optionele metadata (context waar de interesse is genoteerd), maar is geen onderdeel meer van de key.

### `src/db/migrate.ts`
Versie ophogen naar 5. Migratie v4→v5:

```sql
CREATE TABLE contact_artworks_new (
  contact_id TEXT NOT NULL,
  artwork_id TEXT NOT NULL,
  fair_id TEXT,
  notes TEXT,
  PRIMARY KEY (contact_id, artwork_id),
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
  FOREIGN KEY (fair_id) REFERENCES fairs(id) ON DELETE SET NULL
);

INSERT OR IGNORE INTO contact_artworks_new
  SELECT contact_id, artwork_id, fair_id, notes FROM contact_artworks;

DROP TABLE contact_artworks;

ALTER TABLE contact_artworks_new RENAME TO contact_artworks;
```

`INSERT OR IGNORE` vangt het geval op dat dezelfde contact+artwork met verschillende fair_id's bestond — alleen de eerste wordt behouden.

### Impact op bestaande code
`upsertContactArtworkLink` in `src/domains/sales/repository.ts:347-360` hoeft niet te wijzigen — `ON CONFLICT(contact_id, artwork_id)` matcht nu correct, en de fair_id wordt gewoon ge-update bij conflict. De functiesignatuur (`fairId: string`) blijft geldig.

---

## Stap 1: Repository & types uitbreiden

### `src/domains/contacts/types.ts`
Toevoegen na `Contact` type (regel 23):

```typescript
export type ContactInterest = {
  artworkId: string;
  artworkTitle: string;
  artworkPhotoPath: string | null;
  artworkThumbnailPath: string | null;
  fairId: string | null;
  fairName: string | null;
  notes: string | null;
};

export type InterestPickerArtwork = {
  id: string;
  title: string;
  thumbnailPath: string | null;
  photoPath: string | null;
  artistName: string | null;
  status: string;
};
```

### `src/domains/contacts/repository.ts`
Toevoegen na `updateContact` (regel 103):

- **`deleteContact(db, contactId)`** — `DELETE FROM contacts WHERE id = ?`. Cascade: `contact_artworks` ON DELETE CASCADE, `sales.contact_id` ON DELETE SET NULL.
- **`getContactInterests(db, contactId)`** — JOIN contact_artworks → artworks + fairs, retourneert `ContactInterest[]`, ORDER BY artworks.title
- **`addContactInterest(db, contactId, artworkId, notes?)`** — INSERT met `ON CONFLICT(contact_id, artwork_id) DO UPDATE SET notes = excluded.notes`. Geen `fairId` parameter — handmatige interesses hebben geen beurscontext. (Sale-generated links via `upsertContactArtworkLink` vullen `fair_id` wel in.)
- **`removeContactInterest(db, contactId, artworkId)`** — Eenvoudige DELETE op `(contact_id, artwork_id)`. Geen NULL-branch meer nodig dankzij de nieuwe PK.
- **`listArtworksForInterestPicker(db)`** — Alle artworks met thumbnail, title, artist_name, status voor de picker

### Verschil met sales-generated links
| | Handmatige interesse | Sale-generated link |
|-|---------------------|---------------------|
| Bron | `addContactInterest` (contacts repo) | `upsertContactArtworkLink` (sales repo) |
| `fair_id` | NULL | altijd ingevuld |
| Trigger | Gebruiker kiest artwork in picker | Automatisch bij verkoop |
| Kan verwijderd worden | Ja, via detail screen | Nee (volgt sale lifecycle) |

---

## Stap 2: Contact Detail Screen

### Nieuw: `src/domains/contacts/ContactDetailScreen.tsx`
Volgt het `ArtworkDetailScreen` patroon (`src/domains/inventory/ArtworkDetailScreen.tsx`).

**Props:** `{ contactId?: string }`

**Data laden:** `useEffect` met `isMounted`, laadt `getContactById` + `getContactInterests` via `Promise.all`

**Layout:**
1. **Header Card** — Naam (groot), type-badge, beursherkomst (link naar beurs)
2. **Contactgegevens Card** — E-mail, telefoon (conditioneel)
3. **Notities Card** — Conditioneel, alleen tonen als er notities zijn
4. **Aankopen Card** — Conditioneel, lijst van `purchasedArtworkTitles`
5. **Interesses Card** — Lijst van `ContactInterest` items met thumbnail + verwijderknop + "Interesse toevoegen" knop
6. **Acties** — "Bewerken" (primary) + "Verwijderen" (secondary, met Alert.alert bevestiging)

**Verwijderen:** Alert.alert → `deleteContact(db, contactId)` → `router.replace('/contacts')`

### Nieuw: `app/(tabs)/contacts/[id]/index.tsx`
Route wrapper, volgt `app/(tabs)/inventory/[id]/index.tsx` patroon:
```typescript
const params = useLocalSearchParams<{ id: string }>();
return <ContactDetailScreen contactId={params.id} />;
```

### Wijzig: `app/(tabs)/contacts/_layout.tsx`
Route toevoegen (voor `[id]/edit`):
```typescript
<Stack.Screen name="[id]/index" options={{ title: 'Contact' }} />
```

### Wijzig: `app/(tabs)/contacts/index.tsx`
- Card wrappen in `Pressable` → navigeert naar `/contacts/${contact.id}` (detailscherm)
- "Bewerken" knop verwijderen uit de lijst (detail screen biedt edit-toegang)

---

## Stap 3: Zoek/filter op contactenlijst

### Wijzig: `app/(tabs)/contacts/index.tsx`
Volgt het `app/(tabs)/inventory/index.tsx` patroon.

**Nieuwe state:**
- `searchQuery: string` — zoekt op naam, e-mail, telefoon
- `selectedType: ContactType | 'all'` — filter op contacttype

**`useMemo` voor filtering (in-memory):**
- Type-filter: `contacts.filter(c => c.type === selectedType)`
- Zoek-filter: `name/email/phone.toLowerCase().includes(query)`

**Nieuwe UI-elementen (na intro Card):**
1. **Stats Card** — Totaal, kopers, geïnteresseerden, galeriehouders
2. **Zoek & Filter Card:**
   - `TextInput` placeholder "Zoek op naam, e-mail of telefoon"
   - Horizontale `ScrollView` met `FilterChip`'s: Alles | Koper | Geïnteresseerde | Galeriehouder | Overig
3. **Empty state "Geen treffers"** — met "Filters wissen" actie

**`FilterChip` component** — inline, kopie van het inventory patroon

---

## Stap 4: Artwork Interest Picker

### Nieuw: `src/domains/contacts/ArtworkInterestPicker.tsx`
React Native `Modal` (presentationStyle="pageSheet") met:

**Props:**
```typescript
{
  existingInterestArtworkIds: string[];  // Nu correct: PK is (contact_id, artwork_id)
  onSelect: (artwork: InterestPickerArtwork) => void;
  onClose: () => void;
}
```

**Inhoud:**
- Header: "Interesse toevoegen" + "Sluiten" knop
- Zoek-`TextInput` (zoekt op titel en kunstenaar)
- ScrollView met artwork-rijen: thumbnail + titel + kunstenaar + status
- Filtert al gelinkte artworks uit (`existingInterestArtworkIds`)
- Tap op artwork → `onSelect` callback

**Integratie in ContactDetailScreen:**
- `showInterestPicker` state toggle
- `handleAddInterest`: roept `addContactInterest` aan, herlaadt interests
- `handleRemoveInterest`: Alert.alert bevestiging, roept `removeContactInterest` aan

---

## Stap 5: Edit flow fixen

### Wijzig: `src/domains/contacts/ContactEditorScreen.tsx` (regel 146)

**Huidig:**
```typescript
router.replace(returnToFairId ? `/fairs/${returnToFairId}/day` : '/contacts');
```

**Nieuw:**
```typescript
if (returnToFairId) {
  router.replace(`/fairs/${returnToFairId}/day`);
} else if (contactId) {
  // Bewerken: terug naar waar je vandaan kwam (detail of lijst)
  router.back();
} else {
  // Nieuw contact: naar de lijst
  router.replace('/contacts');
}
```

Dit zorgt ervoor dat detail → bewerken → opslaan terugkeert naar het ververste detailscherm (dat al `useIsFocused` of een verse `useEffect` heeft voor herlaad).

---

## Implementatievolgorde

| Stap | Bestanden | Afhankelijk van |
|------|-----------|-----------------|
| 0 | migrate.ts | — |
| 1 | types.ts, repository.ts | Stap 0 |
| 2 | ContactDetailScreen.tsx, [id]/index.tsx, _layout.tsx | Stap 1 |
| 3 | contacts/index.tsx (zoek/filter + Pressable navigatie) | — (parallel met stap 2) |
| 4 | ArtworkInterestPicker.tsx + integratie in detail screen | Stap 1 + 2 |
| 5 | ContactEditorScreen.tsx (edit flow fix) | Stap 2 |
| 6 | E2E tests bijwerken | Alles |

## Bestanden overzicht

| Actie | Bestand |
|-------|---------|
| WIJZIG | `src/db/migrate.ts` |
| WIJZIG | `src/domains/contacts/types.ts` |
| WIJZIG | `src/domains/contacts/repository.ts` |
| WIJZIG | `src/domains/contacts/ContactEditorScreen.tsx` |
| NIEUW | `src/domains/contacts/ContactDetailScreen.tsx` |
| NIEUW | `src/domains/contacts/ArtworkInterestPicker.tsx` |
| NIEUW | `app/(tabs)/contacts/[id]/index.tsx` |
| WIJZIG | `app/(tabs)/contacts/_layout.tsx` |
| WIJZIG | `app/(tabs)/contacts/index.tsx` |
| WIJZIG | `tests/e2e/contacts.spec.ts` |

## Hergebruiken

- **Patroon detail screen:** `src/domains/inventory/ArtworkDetailScreen.tsx`
- **Patroon zoek/filter:** `app/(tabs)/inventory/index.tsx` (FilterChip, stats, useMemo)
- **Patroon upsert:** `src/domains/sales/repository.ts:347-360` (upsertContactArtworkLink)
- **Shared components:** Card, AppButton, EmptyState
- **Shared formatters:** `src/shared/formatters.ts`
- **Type labels:** `contactTypeLabels` uit `types.ts`

## Verificatie

1. `npm run typecheck` — geen TypeScript fouten
2. `npm run test:unit` — bestaande tests blijven groen
3. `npm run test:e2e` — bestaande + nieuwe contact tests
4. Handmatig testen:
   - Contact aanmaken → lijst toont contact → tap → detailscherm
   - Detail → bewerken → opslaan → terug naar detail (niet lijst!)
   - Zoeken op naam/email → resultaten filteren
   - Type-filter wisselen → lijst toont alleen dat type
   - Interesse toevoegen via picker → verschijnt op detail
   - Interesse verwijderen → verdwijnt van detail
   - Contact verwijderen → terug naar lijst
   - Verkoop registreren met contact → contact_artworks link aangemaakt met fair_id
