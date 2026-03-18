# Uitvoerplan: Bonnetje scannen met vision-LLM (V1)

## Context

De kostenpost-editor heeft velden voor categorie, bedrag en omschrijving, maar alles moet handmatig worden ingevoerd. De `expenses` tabel heeft al een `receipt_photo_path` kolom die nog niet gebruikt wordt. Dit plan voegt toe:
1. Bonfoto capture + opslag in de app
2. Server-side receipt extraction endpoint + client service voor automatisch invullen

## Fase 1: Bonfoto capture + opslag (app-side)

### Stap 1.1: Types bijwerken
**Bestand:** `src/domains/expenses/types.ts`

- Voeg `receiptPhotoPath: string | null` toe aan `ExpenseEditorValues`
- Voeg `receiptPhotoPath: null` toe aan `emptyExpenseEditorValues`

### Stap 1.2: Receipt-foto opslag
**Nieuw bestand:** `src/domains/expenses/receiptStorage.ts`

Gebaseerd op het patroon van `src/domains/inventory/artworkStorage.ts`, maar vereenvoudigd:
- Geen thumbnail nodig (bonnetjes hoeven niet in lijsten)
- Hogere kwaliteit (0.88) — leesbare tekst is belangrijk
- Directory: `${documentDirectory}receipt-images/`
- Max dimensie: 2000px (bonnetjes bevatten kleine tekst)

Functies:
```
persistReceiptPhotoAsync(sourceUri: string): Promise<string>  // retourneert persistent pad
deleteReceiptPhotoAsync(uri: string | null): Promise<void>
```

Hergebruikt uit expo-file-system/legacy: `copyAsync`, `deleteAsync`, `documentDirectory`, `makeDirectoryAsync`, `getInfoAsync`
Hergebruikt uit expo-image-manipulator: `manipulateAsync`, `SaveFormat`
Hergebruikt uit expo-crypto: `randomUUID`

### Stap 1.3: Repository bijwerken
**Bestand:** `src/domains/expenses/repository.ts`

- `createExpenseForFair()`: vervang hardcoded `NULL` door `values.receiptPhotoPath` parameter

### Stap 1.4: Foto-UI toevoegen aan editor
**Bestand:** `src/domains/expenses/ExpenseEditorScreen.tsx`

Toevoegingen:
- Import `Image`, `Alert`, `ActivityIndicator` uit react-native
- Import `* as ImagePicker` uit expo-image-picker
- Import `persistReceiptPhotoAsync`, `deleteReceiptPhotoAsync` uit receiptStorage
- State: `extracting: boolean` voor loading-indicator

**Nieuwe handlers** (patroon van `src/domains/inventory/ArtworkEditorScreen.tsx:161-207`):
- `handleTakeReceiptPhoto()` — camera permission + `launchCameraAsync` (geen vaste aspect ratio — bonnetjes zijn lang/smal)
- `handlePickReceiptPhoto()` — library permission + `launchImageLibraryAsync`
- `handleRemoveReceipt()` — zet `receiptPhotoPath` op null
- `handleReceiptCaptured(uri)` — shared flow na foto: set receiptPhotoPath, trigger extractie (fase 2)

**Nieuwe UI-sectie** (boven de categorie-card):
```tsx
<Card>
  <Text style={styles.sectionTitle}>Bonnetje</Text>
  {values.receiptPhotoPath ? (
    <Image source={{ uri: values.receiptPhotoPath }} style={styles.receiptPreview} />
  ) : (
    <View style={styles.receiptPlaceholder}>
      <Text style={styles.placeholderText}>
        Maak een foto van het bonnetje om velden automatisch in te vullen.
      </Text>
    </View>
  )}
  {extracting ? <ActivityIndicator /> + "Bonnetje lezen..." : null}
  <View style={styles.buttonRow}>
    <AppButton label="Foto maken" onPress={handleTakeReceiptPhoto} variant="secondary" />
    <AppButton label="Kies foto" onPress={handlePickReceiptPhoto} variant="secondary" />
  </View>
  {values.receiptPhotoPath ? (
    <AppButton label="Foto verwijderen" onPress={handleRemoveReceipt} variant="secondary" />
  ) : null}
</Card>
```

**Save-flow aanpassen:**
- Voor opslaan: `persistReceiptPhotoAsync(uri)` aanroepen als `receiptPhotoPath` gezet is
- Persistent pad opslaan in DB via repository
- Bij fout: cleanup via `deleteReceiptPhotoAsync`

**Styles toevoegen:**
- `receiptPreview`: width 100%, height 300 (hoger dan artwork — bonnetjes zijn lang), borderRadius 20
- `receiptPlaceholder`: height 140, dashed border, centered text (patroon van artwork)
- `buttonRow`: hergebruik bestaand patroon (flexDirection row, gap 12)
- `extractingRow`: flexDirection row, alignItems center, gap 8
- `extractingText`: fontSize 14, color mutedText

## Fase 2: Vision-LLM extractie

### Stap 2.1: Server-endpoint opzetten
**Nieuwe directory:** `receipt-server/` (in dezelfde repo, maar als **apart sibling deployment artifact** — niet onderdeel van de Expo app runtime. Eigen `package.json`, eigen deploy, eigen logging.)

Bestanden:
```
receipt-server/
  package.json          # express, @anthropic-ai/sdk, multer, dotenv, cors
  server.js             # Express server
  .env.example          # ANTHROPIC_API_KEY, RECEIPT_AUTH_TOKEN, PORT
  .gitignore            # node_modules, .env
```

**server.js** — Express endpoint:
```
POST /api/receipt/extract
- Auth: Bearer token check via RECEIPT_AUTH_TOKEN (pragmatische V1 access gate — geen echte multi-user auth)
- Body: multipart/form-data met "image" veld
- Validatie: alleen image/jpeg en image/png, max 10MB
- Flow: base64 encode → Anthropic Messages API (claude-haiku-4-5-20251001) met vision
- Prompt: Nederlandse bonnetje-lezer, retourneert {amount, description, category}
- Response validatie: amount numeriek, category uit bekende lijst
- Rate limiting: express-rate-limit (10 req/min per IP)
```

**Prompt voor Claude Haiku:**
```
Je bent een bonnetje-lezer. Analyseer deze foto van een kassabon/bonnetje.
Geef een JSON object terug met:
- "amount": het totaalbedrag (als string met punt als decimaal, bijv. "24.80"). Kies het eindbedrag/totaal, niet subtotaal of BTW.
- "description": korte omschrijving (winkelnaam + type aankoop, bijv. "Albert Heijn - boodschappen")
- "category": een van: "standhuur", "reiskosten", "verblijf", "materiaal_stand", "eten_drinken" (kies de best passende, of null als onduidelijk)

Antwoord ALLEEN met valid JSON, geen andere tekst.
```

### Stap 2.2: Client-side vision service
**Nieuw bestand:** `src/domains/expenses/receiptVision.ts`

```typescript
export type ReceiptExtraction = {
  amount: string | null;
  description: string | null;
  category: ExpenseCategory | null;
};

export async function extractReceiptData(imageUri: string): Promise<ReceiptExtraction>
```

Flow:
1. Lees foto als blob/base64 (platform-afhankelijk)
2. POST als multipart/form-data naar `EXPO_PUBLIC_RECEIPT_SERVER_URL/api/receipt/extract`
3. Authorization header met `Bearer EXPO_PUBLIC_RECEIPT_TOKEN`
4. Parse JSON response
5. Valideer category tegen bekende lijst
6. Retourneer gestructureerde data

### Stap 2.3: Extractie integreren in editor
**Bestand:** `src/domains/expenses/ExpenseEditorScreen.tsx`

Na foto capture in `handleReceiptCaptured(uri)`:
1. Set `extracting = true`
2. Roep `extractReceiptData(uri)` aan
3. Bij succes: vul amount, description, en optioneel category in via `setValues`
4. Bij fout: toon zachte melding in UI ("Kon bonnetje niet automatisch lezen, vul handmatig in.") + `console.warn` voor debugging
5. Set `extracting = false`

UI feedback:
- Tijdens extractie: ActivityIndicator + "Bonnetje lezen..."
- Na succes: korte melding "Velden ingevuld op basis van bonnetje"
- Bij fout: "Kon bonnetje niet automatisch lezen"

### Stap 2.4: Env configuratie
**Bestand:** `.env.example`

Toevoegen:
```
EXPO_PUBLIC_RECEIPT_SERVER_URL=https://receipt.jouwdomein.nl
EXPO_PUBLIC_RECEIPT_TOKEN=een-random-token
```

**Let op:** `EXPO_PUBLIC_RECEIPT_TOKEN` is een pragmatische V1 shared secret — geen echte multi-user auth. Bij distributie naar andere kunstenaars: per-gebruiker tokens of API keys overwegen.

## Volgorde van implementatie

1. `src/domains/expenses/types.ts` — receiptPhotoPath toevoegen
2. `src/domains/expenses/receiptStorage.ts` — nieuw bestand, foto-opslag
3. `src/domains/expenses/repository.ts` — receipt_photo_path doorgeven
4. `src/domains/expenses/ExpenseEditorScreen.tsx` — foto-UI (fase 1, zonder extractie)
5. `receipt-server/` — server opzetten met Express + Anthropic API
6. `src/domains/expenses/receiptVision.ts` — client service
7. `src/domains/expenses/ExpenseEditorScreen.tsx` — extractie-flow toevoegen
8. `.env.example` — env vars documenteren

## Verificatie

1. `npm run typecheck` — geen TypeScript fouten
2. `npm run test:unit` — bestaande unit tests passeren
3. `npx playwright test tests/e2e/` — bestaande E2E tests passeren
4. Handmatige test:
   - Nieuwe kostenpost aanmaken zonder foto → werkt als voorheen
   - Foto maken/kiezen → preview verschijnt
   - Foto verwijderen → preview verdwijnt
   - Met receipt-server draaiend: foto → velden worden automatisch ingevuld
   - Zonder receipt-server: foto → stille fout, handmatig invullen werkt
   - Opslaan met foto → receipt_photo_path in DB gevuld
5. Receipt-server apart testen: `curl -X POST -H "Authorization: Bearer token" -F "image=@bonnetje.jpg" http://localhost:3001/api/receipt/extract`
