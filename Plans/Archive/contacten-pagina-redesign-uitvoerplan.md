# Uitvoerplan: Contactenpagina redesign

## Context

De contactenpagina wijkt af van het Voorraadbeheer-patroon: drie losse elementen bovenaan (ScreenHeader, uitlegtekst-kaart, stats-kaart), een lokale FilterChip-kopie, en geen beursfilter. Dit plan brengt de pagina in lijn met het inventaris-patroon en voegt een beurs-dropdown toe.

---

## Stap 1: `FairFilterOption` type toevoegen

**Bestand:** `src/domains/contacts/types.ts`

Voeg toe na de `InterestPickerArtwork` type (na regel 42):

```ts
export type FairFilterOption = {
  id: string;
  label: string;
};
```

---

## Stap 2: `listContactFairOptions` repository-functie

**Bestand:** `src/domains/contacts/repository.ts`

**Import toevoegen** aan de bestaande import (regel 4-11) — voeg `FairFilterOption` toe.

**Nieuwe export functie** (na `deleteContact`, regel 109):

```ts
type FairFilterRow = {
  id: string;
  name: string;
  start_date: string | null;
};

export async function listContactFairOptions(db: SQLiteDatabase): Promise<FairFilterOption[]> {
  const rows = await db.getAllAsync<FairFilterRow>(
    `SELECT DISTINCT fairs.id, fairs.name, fairs.start_date
     FROM contacts
     INNER JOIN fairs ON fairs.id = contacts.fair_id
     ORDER BY fairs.start_date DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    label: row.start_date
      ? `${row.name} (${row.start_date.slice(0, 4)})`
      : row.name,
  }));
}
```

---

## Stap 3: Contactenpagina herschrijven

**Bestand:** `app/(tabs)/contacts/index.tsx`

### 3a: Imports aanpassen

**Verwijderen:**
- `ScrollView` uit react-native imports (regel 8)
- `ScreenHeader` import (regel 26)

**Toevoegen:**
- `Modal` aan react-native imports
- `import { FilterChip } from '@/src/shared/components/FilterChip';`
- `import { listContactFairOptions } from '@/src/domains/contacts/repository';` (naast bestaande `listContacts` import, regel 21)
- `type FairFilterOption` aan bestaande types import (regel 15-20)

### 3b: Nieuwe state variabelen

Toevoegen na `selectedType` state (regel 39):

```ts
const [selectedFairId, setSelectedFairId] = useState<string | 'all'>('all');
const [fairOptions, setFairOptions] = useState<FairFilterOption[]>([]);
const [fairPickerVisible, setFairPickerVisible] = useState(false);
```

### 3c: Data loading uitbreiden

In de `useAsyncEffect` (regel 41-57), `listContactFairOptions` parallel laden naast `listContacts`:

```ts
useAsyncEffect(async (isMounted) => {
  if (!isFocused) return;

  setLoading(true);
  setError(null);

  try {
    const [nextContacts, nextFairOptions] = await Promise.all([
      listContacts(db),
      listContactFairOptions(db),
    ]);
    if (!isMounted()) return;
    setContacts(nextContacts);
    setFairOptions(nextFairOptions);
  } catch {
    if (!isMounted()) return;
    setError('Contacten konden niet geladen worden.');
  } finally {
    if (isMounted()) setLoading(false);
  }
}, [db, isFocused]);
```

### 3d: `visibleContacts` useMemo uitbreiden

Voeg beursfilter toe na het type-filter (regels 59-76), volgorde: type → beurs → zoekterm:

```ts
const visibleContacts = useMemo(() => {
  let filtered = contacts;

  if (selectedType !== 'all') {
    filtered = filtered.filter((contact) => contact.type === selectedType);
  }

  if (selectedFairId !== 'all') {
    filtered = filtered.filter((contact) => contact.fairId === selectedFairId);
  }

  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (normalizedQuery) {
    filtered = filtered.filter((contact) =>
      [contact.name, contact.email, contact.phone]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  }

  return filtered;
}, [contacts, selectedType, selectedFairId, searchQuery]);
```

### 3e: JSX herschrijven

De volledige render-body vervangen (regels 87-228). Structuur:

```tsx
<Screen scroll>
  {/* Hero Card — altijd zichtbaar */}
  <Card>
    <Text style={styles.heroTitle}>Contacten</Text>
    <View style={styles.statsRow}>
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>totaal</Text>
      </View>
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{stats.kopers}</Text>
        <Text style={styles.statLabel}>kopers</Text>
      </View>
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{stats.geinteresseerden}</Text>
        <Text style={styles.statLabel}>geïnteresseerd</Text>
      </View>
      <View style={styles.statBlock}>
        <Text style={styles.statValue}>{stats.galeriehouders}</Text>
        <Text style={styles.statLabel}>galeriehouders</Text>
      </View>
    </View>
    <Link
      href={activeFair ? `/contacts/new?fairId=${activeFair.fairId}` : '/contacts/new'}
      asChild>
      <AppButton label="Toevoegen" compact />
    </Link>
  </Card>

  {/* Loading state */}
  {loading ? (
    <View style={styles.centeredState}>
      <ActivityIndicator color={palette.accent} />
      <Text style={styles.stateText}>Contacten laden...</Text>
    </View>
  ) : null}

  {/* Error state */}
  {!loading && error ? (
    <Card>
      <Text style={styles.errorText}>{error}</Text>
    </Card>
  ) : null}

  {/* Empty state bij 0 contacten — let op: zelfde route als hero-card */}
  {!loading && !error && contacts.length === 0 ? (
    <EmptyState
      title="Nog geen contacten"
      description="Voeg vanuit deze tab of direct tijdens een beursdag een contact toe."
      actionLabel="Nieuw contact"
      onAction={() => router.push(
        activeFair ? `/contacts/new?fairId=${activeFair.fairId}` : '/contacts/new'
      )}
    />
  ) : null}

  {/* Filter Card + lijst — alleen bij contacts.length > 0 */}
  {!loading && !error && contacts.length > 0 ? (
    <>
      <Card>
        <TextInput
          placeholder="Zoek op naam, e-mail of telefoon"
          placeholderTextColor={palette.placeholder}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Type</Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="Alles"
              active={selectedType === 'all'}
              onPress={() => setSelectedType('all')}
            />
            {contactTypes.map((type) => (
              <FilterChip
                key={type}
                label={contactTypeLabels[type]}
                active={selectedType === type}
                onPress={() => setSelectedType(type)}
              />
            ))}
          </View>
        </View>
        {fairOptions.length > 0 ? (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Beurs</Text>
            <FairDropdown
              fairOptions={fairOptions}
              selectedFairId={selectedFairId}
              onOpen={() => setFairPickerVisible(true)}
            />
          </View>
        ) : null}
      </Card>

      {/* Geen treffers — reset ook selectedFairId */}
      {visibleContacts.length === 0 ? (
        <EmptyState
          title="Geen treffers"
          description="Pas je zoekterm of filter aan om andere contacten te tonen."
          actionLabel="Filters wissen"
          onAction={() => {
            setSearchQuery('');
            setSelectedType('all');
            setSelectedFairId('all');
          }}
        />
      ) : null}

      {/* Contactlijst — ongewijzigd */}
      {visibleContacts.length > 0 ? (
        <View style={styles.list}>
          {visibleContacts.map((contact) => (
            <Pressable
              key={contact.id}
              onPress={() => router.push(`/contacts/${contact.id}`)}
              style={({ pressed }) => pressed && styles.cardPressed}>
              <Card>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>{contactTypeLabels[contact.type]}</Text>
                {contact.fairName ? (
                  <Text style={styles.contactFair}>
                    Ontstaan op beurs: {contact.fairName}
                  </Text>
                ) : null}
                {contact.purchasedArtworkTitles.length > 0 ? (
                  <Text style={styles.contactPurchase}>
                    Kocht: {contact.purchasedArtworkTitles.join(', ')}
                  </Text>
                ) : null}
                {contact.email ? (
                  <Text style={styles.contactMeta}>{contact.email}</Text>
                ) : null}
                {contact.phone ? (
                  <Text style={styles.contactMeta}>{contact.phone}</Text>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  ) : null}

  {/* Beurs picker modal */}
  <Modal visible={fairPickerVisible} transparent animationType="fade">
    <Pressable style={styles.modalOverlay} onPress={() => setFairPickerVisible(false)}>
      <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
        <Pressable
          style={[styles.modalOption, selectedFairId === 'all' && styles.modalOptionActive]}
          onPress={() => { setSelectedFairId('all'); setFairPickerVisible(false); }}>
          <Text style={[
            styles.modalOptionText,
            selectedFairId === 'all' && styles.modalOptionTextActive,
          ]}>Alle beurzen</Text>
        </Pressable>
        {fairOptions.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.modalOption, selectedFairId === option.id && styles.modalOptionActive]}
            onPress={() => { setSelectedFairId(option.id); setFairPickerVisible(false); }}>
            <Text style={[
              styles.modalOptionText,
              selectedFairId === option.id && styles.modalOptionTextActive,
            ]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </Pressable>
  </Modal>
</Screen>
```

### 3f: Lokale `FairDropdown` component toevoegen

Na de hoofd-component, voeg een lokale `FairDropdown` component toe (vergelijkbaar met hoe inventory `InventoryStatsCard` en `InventoryFilterCard` als lokale componenten heeft):

```tsx
function FairDropdown({
  fairOptions,
  selectedFairId,
  onOpen,
}: {
  fairOptions: FairFilterOption[];
  selectedFairId: string | 'all';
  onOpen: () => void;
}) {
  const selectedLabel =
    selectedFairId === 'all'
      ? 'Alle beurzen'
      : fairOptions.find((f) => f.id === selectedFairId)?.label ?? 'Alle beurzen';

  return (
    <Pressable onPress={onOpen} style={styles.dropdownTrigger}>
      <Text style={styles.dropdownText}>{selectedLabel}</Text>
      <Text style={styles.dropdownChevron}>▼</Text>
    </Pressable>
  );
}
```

### 3g: Lokale `FilterChip` verwijderen

Verwijder de hele functie (regels 232-254).

### 3h: Styles — volledige StyleSheet

```ts
const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  statBlock: {
    flex: 1,
    minWidth: 120,
    minHeight: 86,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.text,
  },
  statLabel: {
    fontSize: 13,
    color: palette.mutedText,
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    color: palette.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 15,
    color: palette.text,
    flex: 1,
  },
  dropdownChevron: {
    fontSize: 12,
    color: palette.mutedText,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 8,
    width: '100%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalOptionActive: {
    backgroundColor: palette.accent,
  },
  modalOptionText: {
    fontSize: 16,
    color: palette.text,
  },
  modalOptionTextActive: {
    color: '#FFFDF9',
    fontWeight: '600',
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  stateText: {
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  cardPressed: {
    opacity: 0.85,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  contactMeta: {
    fontSize: 14,
    color: palette.mutedText,
  },
  contactFair: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: palette.accent,
  },
  contactPurchase: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 22,
    color: palette.text,
  },
});
```

---

## Stap 4: E2E tests bijwerken

**Bestand:** `tests/e2e/contacts.spec.ts`

### 4a: Import uitbreiden (regel 3)

```ts
import { createArtwork, createContact, createFair } from './helpers';
```

### 4b: Bestaande test aanpassen

De eerste test (regel 6-14) zoekt `getByRole('heading', { name: 'Contacten' })`. Na redesign staat "Contacten" in een `<Text style={heroTitle}>` ipv `ScreenHeader`. In React Native Web rendert `<Text>` standaard als `<div>` — geen heading-role. **Wijzig** regel 9:

```ts
// Was: await expect(page.getByRole('heading', { name: 'Contacten' })).toBeVisible();
await expect(page.getByText('Contacten', { exact: true })).toBeVisible();
```

De test naam ook aanpassen van `'shows custom ScreenHeader with title and Toevoegen button'` naar `'shows hero card with title and Toevoegen button'`.

### 4c: Nieuwe tests toevoegen

Na de laatste test (`test('can add an artwork interest...')`, regel 194), voeg toe:

```ts
test('shows stats in hero card even with zero contacts', async ({ page }) => {
  await page.goto('/contacts');

  await expect(page.getByText('totaal')).toBeVisible();
  await expect(page.getByText('kopers')).toBeVisible();
  await expect(page.getByText('geïnteresseerd')).toBeVisible();
  await expect(page.getByText('galeriehouders')).toBeVisible();
});

test('can filter contacts by fair and shows year suffix in dropdown', async ({ page }) => {
  const ts = Date.now();

  // Maak een beurs aan (createFair zet start_date ~30 dagen in de toekomst)
  const fairName = `PW Beurs ${ts}`;
  const fairId = await createFair(page, { name: fairName });

  // Maak contact met fairId
  const contactWithFair = `PW FairContact ${ts}`;
  await page.goto(`/contacts/new?fairId=${fairId}`);
  await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactWithFair);
  await page.getByRole('button', { name: 'Contact opslaan' }).click();
  await expect(page).toHaveURL(/\/contacts$/);

  // Maak contact zonder fair
  const contactWithoutFair = `PW NoFairContact ${ts}`;
  await page.goto('/contacts/new');
  await page.getByPlaceholder('Bijv. Emma Jansen').fill(contactWithoutFair);
  await page.getByRole('button', { name: 'Contact opslaan' }).click();
  await expect(page).toHaveURL(/\/contacts$/);

  // Dropdown moet zichtbaar zijn
  await expect(page.getByText('Alle beurzen')).toBeVisible();

  // Open dropdown — controleer dat beursnaam met jaartal-suffix wordt getoond
  await page.getByText('Alle beurzen').click();
  const currentYear = new Date().getFullYear().toString();
  const expectedLabel = new RegExp(`PW Beurs ${ts}.*\\(${currentYear}\\)`);
  await expect(page.getByText(expectedLabel)).toBeVisible();

  // Selecteer beurs
  await page.getByText(expectedLabel).click();

  // Alleen fair-contact zichtbaar
  await expect(page.getByText(contactWithFair)).toBeVisible();
  await expect(page.getByText(contactWithoutFair)).not.toBeVisible();

  // Reset: open dropdown opnieuw en kies "Alle beurzen"
  await page.getByText(expectedLabel).click();
  await page.getByText('Alle beurzen').click();

  // Beide weer zichtbaar
  await expect(page.getByText(contactWithFair)).toBeVisible();
  await expect(page.getByText(contactWithoutFair)).toBeVisible();
});
```

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/domains/contacts/types.ts` | `FairFilterOption` type toevoegen |
| `src/domains/contacts/repository.ts` | `listContactFairOptions()` functie + import type |
| `app/(tabs)/contacts/index.tsx` | Hero-Card, gedeelde FilterChip, beursfilter dropdown, modal, responsive stats |
| `tests/e2e/contacts.spec.ts` | Heading-test aanpassen, stats-test + beursfilter-test toevoegen |

## Niet doen

- Geen externe picker/dropdown library
- Geen redesign van contact-detail pagina
- Geen wijziging aan contact-rij layout
- Geen server-side filtering
- Geen tablet-specifieke layout

## Verificatie

1. `npm run typecheck` — moet slagen
2. `npm run test:unit` — moet slagen
3. `npm run test:e2e -- tests/e2e/contacts.spec.ts` — alle bestaande + nieuwe tests
4. `npm run test:e2e -- tests/e2e/journey-smoke.spec.ts` — regressie
5. `npm run web` — visuele check: hero-card met stats bij 0 contacten, dropdown zichtbaar bij contacten met beurs
