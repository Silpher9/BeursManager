# Implementatieplan: Codebase Verbeteringen

Dit plan zet de belangrijkste code review-bevindingen om naar concrete verbeteringen in de huidige codebase. De focus ligt op betrouwbaarheid, voorspelbaar webgedrag en correcte businesslogica, niet op nieuwe features.

## Doel

De codebase is structureel al behoorlijk netjes opgezet, maar er zijn een paar functionele zwakke plekken die eerst moeten worden weggewerkt:

1. Verwijderflows moeten op web echt werken.
2. Fotoverwijdering moet consistent zijn in database, UI en opslag.
3. Datumlogica moet op lokale kalenderdagen werken in plaats van UTC-dagen.
4. Database-migraties moeten dezelfde indexdekking houden als een fresh install.

## Prioriteit

### 1. Web-safe confirm dialogs

**Probleem**
- `Alert.alert(...)` wordt direct gebruikt in schermen waar verwijderen mogelijk is.
- Op web is dat onbetrouwbaar of een no-op, terwijl er al een platformveilige helper bestaat.

**Te wijzigen**
- **[MODIFY] `src/domains/inventory/ArtworkDetailScreen.tsx`**
  - Vervang directe `Alert.alert(...)` delete-confirmatie door `confirmAction(...)`.
- **[MODIFY] `src/domains/fairs/FairDetailScreen.tsx`**
  - Vervang directe `Alert.alert(...)` delete-confirmatie door `confirmAction(...)`.

**Waarom**
- Deze fout raakt echte gebruikersflows: verwijderen werkt dan lokaal/native wel, maar op web niet of niet voorspelbaar.
- De codebase heeft al één gedeelde oplossing in `src/shared/confirmAction.ts`; die moet consistent gebruikt worden.

**Verificatie**
1. Kunstwerk openen op web en verwijderen.
2. Beurs openen op web en verwijderen.
3. Bevestiging moet zichtbaar zijn en de record moet daarna echt uit de lijst verdwijnen.

### 2. Consistente fotoverwijdering in artwork-editor

**Probleem**
- Bij “Foto verwijderen” wordt alleen `photoPath` gewist.
- `thumbnailPath` kan blijven staan, waardoor in overzichten nog steeds een oude afbeelding zichtbaar blijft.
- Daardoor kan ook een orphaned thumbnail-bestand blijven bestaan.

**Te wijzigen**
- **[MODIFY] `src/domains/inventory/ArtworkEditorScreen.tsx`**
  - Laat `handleRemovePhoto()` zowel `photoPath` als `thumbnailPath` leegmaken.
  - Zorg dat de save-flow een expliciete “foto verwijderd”-situatie correct afhandelt.
  - Verwijder oude opgeslagen bestanden wanneer een bestaande foto bewust wordt weggehaald.
- **[CHECK] `src/domains/inventory/repository.ts`**
  - Bevestig dat `saveArtwork(...)` bij een update beide velden naar `NULL` kan schrijven.
- **[CHECK] `app/(tabs)/inventory/index.tsx`**
  - Bevestig dat de lijst fallbackt naar placeholder wanneer zowel `thumbnailPath` als `photoPath` leeg zijn.

**Waarom**
- Dit is een data-integriteitsprobleem, geen cosmetisch detail.
- De gebruiker denkt dat de foto weg is, maar de thumbnail kan nog zichtbaar blijven.

**Verificatie**
1. Bestaand kunstwerk met foto openen.
2. Foto verwijderen en opslaan.
3. Detailscherm mag geen afbeelding meer tonen.
4. Voorraadlijst mag geen thumbnail meer tonen.
5. Heropenen van het bewerkscherm mag geen oude paden meer bevatten.

### 3. Datumlogica losmaken van UTC

**Probleem**
- De code gebruikt `new Date().toISOString().slice(0, 10)` voor “vandaag”.
- Dat levert een UTC-datum op, niet de lokale kalenderdag van de gebruiker.
- Rond middernacht kan een beurs te vroeg of te laat als actief of aankomend worden gezien.

**Te wijzigen**
- **[MODIFY] `src/domains/home/repository.ts`**
  - Vervang `getTodayIsoDate()` en `getIsoDateOffset()` door lokale datumhelpers.
- **[MODIFY] `app/(tabs)/fairs/index.tsx`**
  - Vervang `today()` door dezelfde lokale datumlogica.
- **[OPTIONAL NEW] `src/shared/date.ts`**
  - Introduceer een kleine gedeelde helper, bijvoorbeeld:
    - `getLocalIsoDateToday()`
    - `getLocalIsoDateOffset(days)`

**Aanpak**
- Gebruik lokale datumcomponenten (`getFullYear`, `getMonth`, `getDate`) om `YYYY-MM-DD` op te bouwen.
- Vermijd businessregels op basis van UTC tenzij dat expliciet gewenst is.

**Waarom**
- Dit raakt Home, beursstatus en tellingen.
- Het is een klassiek fouttype dat pas zichtbaar wordt op echte apparaten en echte tijdzones.

**Verificatie**
1. Voeg unit-tests toe rond datumgrenzen.
2. Test met gesimuleerde tijd net voor en net na lokale middernacht.
3. Beursstatus op Home en in beurzenlijst moet lokaal consistent blijven.

### 4. Migratieconsistentie voor indexen

**Probleem**
- Migratie naar databaseversie 5 bouwt `contact_artworks` opnieuw op.
- Daarbij wordt niet dezelfde volledige indexset hersteld als bij een verse database.
- Daardoor kunnen geüpgradede installaties andere query-performance hebben dan nieuwe installaties.

**Te wijzigen**
- **[MODIFY] `src/db/migrate.ts`**
  - Voeg na het hernoemen van `contact_artworks_new` ook `idx_contact_artworks_fair_id` opnieuw toe.
  - Controleer meteen of de migratiestappen idempotent blijven.

**Waarom**
- Dit is geen directe crash, maar wel een onderhouds- en performancelek.
- Migraties moeten functioneel én structureel gelijk eindigen aan een fresh install.

**Verificatie**
1. Nieuwe database initialiseren.
2. Bestaande database upgraden vanaf versie 4.
3. In beide gevallen moeten dezelfde tabellen en indexen bestaan.

## Aanbevolen Implementatievolgorde

1. Fix web-confirm dialogs.
2. Fix artwork-fotoverwijdering.
3. Centraliseer lokale datumhelpers en pas businesslogica aan.
4. Repareer migratie-indexen.
5. Breid tests uit voor de regressies hierboven.

## Testuitbreiding

### Unit tests
- **[MODIFY] `tests/unit/home.repository.test.ts`**
  - Voeg cases toe voor lokale datumgrenzen.

### E2E tests
- **[ADD] web delete flow voor artwork**
  - Verifieer dat bevestigen op web echt verwijdert.
- **[ADD] web delete flow voor fair**
  - Verifieer dat bevestigen op web echt verwijdert.
- **[ADD] foto verwijderen**
  - Upload foto, verwijder foto, controleer detail + lijstweergave.

## Guardrails

- Geen nieuwe features toevoegen tijdens deze ronde.
- Eerst betrouwbaarheid, daarna polish.
- Gedeelde helpers gebruiken als een patroon al bestaat.
- Migraties achteraf niet “schoonpoetsen” met handmatige resets; upgradepad moet echt kloppen.

## Definition of Done

- Delete-flows werken op web en native.
- Een verwijderde artwork-foto verdwijnt overal consistent.
- Beursstatus gebruikt lokale kalenderlogica.
- Geüpgradede databases hebben dezelfde indexen als fresh installs.
- Relevante unit- en e2e-regressietests zijn groen.
