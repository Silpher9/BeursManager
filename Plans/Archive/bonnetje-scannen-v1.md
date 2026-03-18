# Plan: Bonnetje scannen met vision-LLM (V1)

## Context

De kostenpost-editor (`ExpenseEditorScreen`) heeft velden voor categorie, bedrag en omschrijving. Veel kosten zijn bonnetjes van supermarkten, parkeren, lunch, etc. De gebruiker moet nu alles handmatig invoeren.

Het datamodel heeft al een `receipt_photo_path` kolom in de `expenses` tabel, maar deze wordt nog niet gebruikt in de UI.

## Ontwerpdoel

- Gebruiker maakt foto van bonnetje via de bestaande ImagePicker
- Foto wordt naar een eigen server-endpoint gestuurd, die de vision-LLM aanroept
- Geëxtraheerde velden (bedrag, omschrijving) worden als voorstel ingevuld
- Categorie-suggestie als nice-to-have (niet als kernbelofte)
- Gebruiker controleert, past eventueel aan, en slaat op
- Foto wordt bewaard als bewijs (`receipt_photo_path`)

Dit is een **pragmatische V1**: single vision-LLM call + gebruikersbevestiging. Opschaalbaar later met fallback/confidence als de foutmarge in de praktijk tegenvalt.

## Fase 1: Bonfoto capture + opslag

### Stap 1.1: Receipt photo state toevoegen aan editor

**Bestand:** `src/domains/expenses/types.ts`

Voeg `receiptPhotoPath` toe aan `ExpenseEditorValues`:
```tsx
export type ExpenseEditorValues = {
  category: ExpenseCategory;
  amount: string;
  description: string;
  receiptPhotoPath: string | null;
};

export const emptyExpenseEditorValues: ExpenseEditorValues = {
  category: 'standhuur',
  amount: '',
  description: '',
  receiptPhotoPath: null,
};
```

### Stap 1.2: Repository bijwerken — receipt_photo_path opslaan

**Bestand:** `src/domains/expenses/repository.ts`

`createExpenseForFair` slaat nu `NULL` op voor `receipt_photo_path`. Update naar:
```tsx
export async function createExpenseForFair(
  db: SQLiteDatabase,
  fairId: string,
  values: ExpenseEditorValues
) {
  // ...
  await db.runAsync(
    `INSERT INTO expenses (..., receipt_photo_path, ...) VALUES (..., ?, ...)`,
    [..., values.receiptPhotoPath, ...]
  );
}
```

De foto moet eerst gekopieerd worden naar een persistente locatie (vergelijkbaar met `persistArtworkPhotoAssetsAsync` in het inventory-domein). Maak een analoge helper:

**Nieuw bestand:** `src/domains/expenses/expenseStorage.ts`
```tsx
export async function persistReceiptPhotoAsync(uri: string): Promise<string> {
  // Kopieer foto naar app document directory
  // Retourneer het persistente pad
}

export async function deleteReceiptPhotoAsync(path: string | null): Promise<void> {
  // Verwijder foto als deze bestaat
}
```

Gebruik dezelfde `FileSystem` aanpak als `src/domains/inventory/artworkStorage.ts`.

### Stap 1.3: Foto UI toevoegen aan ExpenseEditorScreen

**Bestand:** `src/domains/expenses/ExpenseEditorScreen.tsx`

Voeg een foto-sectie toe boven de categorie-kaart (vergelijkbaar met ArtworkEditorScreen):
- "Scan bonnetje" knop → opent camera via `expo-image-picker`
- "Kies foto" knop → opent foto-bibliotheek
- Preview van de foto als deze gemaakt is
- "Foto verwijderen" knop

```tsx
<Card>
  <Text style={styles.sectionTitle}>Bonnetje</Text>
  {values.receiptPhotoPath ? (
    <>
      <Image source={{ uri: values.receiptPhotoPath }} style={styles.receiptPreview} />
      <AppButton label="Foto verwijderen" onPress={handleRemoveReceipt} variant="secondary" />
    </>
  ) : (
    <View style={styles.receiptPlaceholder}>
      <Text style={styles.placeholderText}>Maak een foto van het bonnetje om velden automatisch in te vullen.</Text>
    </View>
  )}
  <View style={styles.buttonRow}>
    <AppButton label="Foto maken" onPress={handleTakeReceiptPhoto} variant="secondary" />
    <AppButton label="Kies foto" onPress={handlePickReceiptPhoto} variant="secondary" />
  </View>
</Card>
```

Bij `handleSave`: kopieer de foto naar persistente opslag via `persistReceiptPhotoAsync` vóór het opslaan in de DB.

## Fase 2: Vision-LLM extractie (via eigen server)

### Architectuur-keuze

**Server-broker op de Ubuntu-pc** (24/7 online, RTX 3090). De iPad stuurt de bonfoto naar een eigen endpoint, de server doet de Anthropic API call en retourneert gestructureerde JSON.

Voordelen:
- **API key server-side** — nooit in de app-bundle, veilig bij multi-user gebruik
- **Multi-user klaar** — andere kunstenaars op de beurs kunnen de app ook gebruiken zonder eigen API key
- **Centraal beheer** — kosten, quota, logging, model-switching zonder app-update
- **Later naar cloud verplaatsbaar** — zelfde contract, andere hosting

**Bereikbaarheid buiten lokaal netwerk:** via **Cloudflare Tunnel** (gratis, geen open poorten, HTTPS out-of-the-box) of alternatief Tailscale VPN.

**Verschuifbare boundary:** De `extractReceiptData()` functie in de app is een simpele async service die alleen het server-endpoint kent. Later vervangbaar door een cloud-URL zonder UI-wijziging.

### Stap 2.0: Server-endpoint opzetten

**Nieuw (buiten Expo project):** Minimaal Node.js/Express of Python/FastAPI endpoint op de Ubuntu-pc.

```
POST /api/receipt/extract
Headers: Authorization: Bearer <app-token>
Body: multipart/form-data met bonfoto
Response: { "amount": "24.80", "description": "Albert Heijn", "category": "eten_drinken" }
```

De server:
1. Ontvangt de foto + valideert het auth-token
2. Converteert naar base64
3. Stuurt naar Anthropic Messages API (Claude Haiku 4.5, ~€0.01/bonnetje)
4. Retourneert de geëxtraheerde velden als JSON

**Auth:** Shared bearer token — genereer een random token, zet in de server `.env`, deel met app-gebruikers. Dit is een **pragmatische toegangsdrempel voor V1**, geen volwaardige multi-user security. De server moet daarnaast ook:
- Rate limiting toepassen (bijv. max 10 requests/minuut per IP)
- Request size limits instellen (max ~10MB voor een bonfoto)
- Basis logging bijhouden (wie scant wanneer)
- Token rotatie ondersteunen als het uitlekt (nieuw token genereren, app-config bijwerken)

Bij echte multi-user distributie later: per-gebruiker tokens of API keys.

**Server `.env`:**
```
ANTHROPIC_API_KEY=sk-ant-...
RECEIPT_AUTH_TOKEN=een-random-token
PORT=3001
```

### Stap 2.1: Client-side vision service

**Nieuw bestand:** `src/domains/expenses/receiptVision.ts`

Service die een bonfoto naar het eigen server-endpoint stuurt.

```tsx
export type ReceiptExtraction = {
  amount: string | null;       // bijv. "24.80"
  description: string | null;  // bijv. "Albert Heijn - boodschappen"
  category: ExpenseCategory | null;  // nice-to-have suggestie
};

export async function extractReceiptData(
  imageUri: string
): Promise<ReceiptExtraction> {
  // 1. Lees de foto als base64 of FormData
  // 2. POST naar EXPO_PUBLIC_RECEIPT_SERVER_URL/api/receipt/extract
  //    met Authorization: Bearer EXPO_PUBLIC_RECEIPT_TOKEN
  // 3. Parse de JSON response
  // 4. Retourneer gestructureerde data
}
```

### Stap 2.2: Server-side prompt

De server stuurt de foto naar Claude Haiku met deze prompt:
```
Je bent een bonnetje-lezer. Analyseer deze foto van een kassabon/bonnetje.
Geef een JSON object terug met:
- "amount": het totaalbedrag (als string met punt als decimaal, bijv. "24.80"). Kies het eindbedrag/totaal, niet subtotaal of BTW.
- "description": korte omschrijving (winkelnaam + type aankoop, bijv. "Albert Heijn - boodschappen")
- "category": een van: "standhuur", "reiskosten", "verblijf", "materiaal_stand", "eten_drinken" (kies de best passende, of null als onduidelijk)

Antwoord ALLEEN met valid JSON, geen andere tekst.
```

**Focus V1:** `amount` en `description` zijn de kernvelden. `category` is een nice-to-have — als de LLM het goed raadt mooi, anders kiest de gebruiker zelf.

### Stap 2.3: Extractie-flow integreren in de editor

**Bestand:** `src/domains/expenses/ExpenseEditorScreen.tsx`

Na het maken/kiezen van een foto:
1. Toon een loading-indicator ("Bonnetje lezen...")
2. Roep `extractReceiptData(uri)` aan
3. Bij succes: vul `amount`, `description`, en optioneel `category` in als voorstel
4. Bij fout: toon melding "Kon bonnetje niet lezen, vul handmatig in"
5. Gebruiker kan alle velden nog aanpassen

```tsx
const handleReceiptPhoto = async (uri: string) => {
  setValue('receiptPhotoPath', uri);
  setExtracting(true);

  try {
    const extraction = await extractReceiptData(uri);
    setValues((current) => ({
      ...current,
      receiptPhotoPath: uri,
      amount: extraction.amount ?? current.amount,
      description: extraction.description ?? current.description,
      category: extraction.category ?? current.category,
    }));
  } catch {
    // Stille fout — gebruiker vult handmatig in
    console.warn('Receipt extraction failed');
  } finally {
    setExtracting(false);
  }
};
```

### Stap 2.4: Extractie feedback in UI

Voeg een subtiele indicatie toe wanneer velden via OCR zijn ingevuld:
- Tijdens extractie: `<ActivityIndicator />` met "Bonnetje lezen..."
- Na succesvolle extractie: korte melding "Velden ingevuld op basis van bonnetje. Controleer de gegevens."
- Bij fout: "Kon bonnetje niet automatisch lezen."

Geen complexe confidence-UI voor V1 — de gebruiker ziet gewoon de ingevulde velden.

## Stap 3: Env configuratie

**Bestand (Expo app):** `.env.example`

Voeg toe:
```
# Receipt-server URL (eigen endpoint op Ubuntu-pc, bereikbaar via Cloudflare Tunnel)
EXPO_PUBLIC_RECEIPT_SERVER_URL=https://receipt.jouwdomein.nl
# Auth token voor receipt-server
EXPO_PUBLIC_RECEIPT_TOKEN=een-random-token
```

**Bestand (server):** `.env` op de Ubuntu-pc
```
ANTHROPIC_API_KEY=sk-ant-...
RECEIPT_AUTH_TOKEN=een-random-token
PORT=3001
```

## Stap 4: Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/` — bestaande tests
3. Handmatige test op web:
   - Kostenpost aanmaken met foto (via "Kies foto")
   - Controleer dat velden worden ingevuld na extractie
   - Controleer dat opslaan werkt met `receipt_photo_path`
   - Controleer dat opslaan zonder foto nog steeds werkt
4. Fout-scenario: ongeldige/lege foto → melding "Kon niet lezen", velden blijven leeg

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/domains/expenses/types.ts` | `receiptPhotoPath` in EditorValues |
| `src/domains/expenses/repository.ts` | `receipt_photo_path` opslaan |
| `src/domains/expenses/ExpenseEditorScreen.tsx` | Foto UI + extractie flow |
| `.env.example` | `EXPO_PUBLIC_RECEIPT_SERVER_URL` + `EXPO_PUBLIC_RECEIPT_TOKEN` |

## Nieuwe bestanden

| Bestand | Doel |
|---|---|
| `src/domains/expenses/expenseStorage.ts` | Foto kopiëren naar persistente opslag |
| `src/domains/expenses/receiptVision.ts` | Client-side service: foto → server-endpoint → JSON |

## Nieuw (server-side, buiten Expo project)

| Component | Doel |
|---|---|
| Receipt-server (Node.js of Python) | HTTP endpoint, auth check, Anthropic API call, JSON response |
| Cloudflare Tunnel config | Server bereikbaar via HTTPS buiten lokaal netwerk |

## Security-invarianten

Deze grenzen moeten bij implementatie en latere uitbreidingen altijd standhouden:

1. **Alleen image uploads** — server accepteert uitsluitend image MIME types (image/jpeg, image/png), weigert al het andere
2. **Geen app-context naar de LLM** — de vision-call bevat alleen de bonfoto + de vaste extractie-prompt. Nooit gebruikersdata, database-inhoud, of app-state meesturen
3. **Alleen schema-gevalideerde velden terug** — server retourneert uitsluitend `{ amount, description, category }` na validatie (amount numeriek, category uit bekende lijst). Geen raw LLM-output doorsturen naar de app

## Niet doen in V1

- Meerdere LLM-calls of consensus-check
- Lokale OCR (Tesseract.js / Apple Vision)
- Confidence scores of bronverwijzing in UI
- Bonnetje-foto tonen in expense-detail/lijst (kan als follow-up)
- Automatische datum-extractie (veld bestaat niet in huidige editor)
