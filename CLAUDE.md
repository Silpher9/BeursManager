# BeursManager

iPad-app voor kunstenaars om beurzen, voorraad, verkopen, onkosten en contacten te beheren.
Gebouwd met Expo (SDK 55), React Native, TypeScript (strict), SQLite (offline-first).

## Commando's

- `npm start` — Expo dev server
- `npm run web` — Web versie (port 8081)
- `npm run typecheck` — TypeScript check
- `npm run test:unit` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E tests (headless, port 8082)
- `npm run test:e2e:headed` — Playwright E2E met browser

## Projectstructuur

```
app/                  # Expo Router (file-based routing, tabs)
  (tabs)/             # Tab navigatie: home, voorraad, beurzen, contacten, rapporten, instellingen
src/
  domains/            # DDD: inventory, fairs, sales, expenses, contacts, home, demo-data
    <domain>/
      types.ts        # Domein types
      repository.ts   # SQLite queries
      formatters.ts   # Display formatting
      *Screen.tsx     # Scherm componenten
  shared/
    components/       # Herbruikbare UI: Screen, Card, AppButton, Field, LoadingView, EmptyState
    theme/            # Kleuren, typografie, navigatie thema
    fair-day/         # Beursdag-modus context
    formatters.ts     # Gedeelde formatters
  db/
    migrate.ts        # SQLite schema & migraties (versie 5)
tests/
  unit/               # Vitest tests
  e2e/                # Playwright tests + helpers.ts
Plans/                # Planningsdocumenten en backlog
  Running/            # Actieve plannen (huidige sessie)
  Archive/            # Afgeronde/oude plannen (>1 dag)
```

## Conventies

- **Taal**: Alle UI-tekst en domeinlogica in het Nederlands
- **Architectuur**: Domain-Driven Design — code georganiseerd per domein, niet per technische laag
- **Styling**: `StyleSheet.create()`, geen Tailwind/CSS. Warm, aards kleurpalet (accent: #8A6A45, achtergrond: #F6F1E8)
- **State**: `useState` + `useEffect` met isMounted cleanup. Geen externe state library
- **Data**: Repository pattern — alle DB queries in `repository.ts` per domein
- **Types**: Strikte TypeScript. Domein types in `types.ts`, editor values apart
- **Imports**: `@/*` pad-alias naar project root
- **Componenten**: PascalCase bestanden. Schermen eindigen op `Screen.tsx`
- **DB kolommen**: snake_case. App code: camelCase
- **Validatie**: Domein-level validators (geen form library), retourneren foutmelding of null
- **Beursdag-modus**: Context-based feature via `useFairDayMode()` hook

## Database

SQLite met tabellen: artists, artworks, fairs, fair_artworks, sales, expenses, contacts, contact_artworks.
Artwork statussen: beschikbaar, gereserveerd, ingepakt, op_beurs, verkocht.

### Backup-restore lifecycle

De `SQLiteProvider` in `_layout.tsx` is de **enige eigenaar** van de database open/close lifecycle. Backup-restore mag nooit zelf `db.closeAsync()` aanroepen op de provider's database-handle.

Bij restore wordt de "maintenance mode" gebruikt (`setMaintenanceMode` in `dbReload.ts`):
1. `await setMaintenanceMode(true)` — unmount provider (sluit db), wacht op bevestiging
2. File swap (geen open connection)
3. `triggerDatabaseReload()` + `await setMaintenanceMode(false)` — remount provider

**Waarom:** expo-sqlite's `SQLiteProvider` doet `closeAsync()` in React cleanup (fire-and-forget). Een tweede `closeAsync()` op dezelfde handle veroorzaakt een onvangbare "Access to closed resource" rejection. De maintenance mode voorkomt dit door de provider eerst netjes te unmounten voordat bestanden worden verplaatst.

## Externe services

- `@fal-ai/client` — AI beeldgeneratie (key via `EXPO_PUBLIC_FAL_KEY`)
- `receipt-server/` — Bonnetje-scan API (Claude Haiku), poort 4010
  - **Regressieset**: wijzigingen aan receipt-extractie alleen accepteren na vergelijking op de vaste testset in `Beursmanager_testbonnetjes/` (5 bonnetjes) met meetbare scorecard (succes/fail + veldkwaliteit). Set uitbreiden wanneer nieuwe edge cases opduiken.

## Poortconventie

Lokale servers voor BeursManager gebruiken poorten **4000–4050** om conflicten met andere projecten te voorkomen.

| Service | Poort |
|---------|-------|
| Receipt-server | 4010 |

## Werkwijze GitHub Issues

- **Bron-van-waarheid** voor backlog, status en prioriteit: [GitHub Issues](https://github.com/Silpher9/BeursManager/issues) + [Project board](https://github.com/users/Silpher9/projects/1)
- Bij start van een taak: `gh issue list` checken op relevante/overlappende issues
- Nieuw idee of bug → GitHub Issue aanmaken met juiste label
- Plan schrijven → `Plans/Running/`, bovenaan zowel `Issue: #XX` als `Gewenste statusactie: In Progress|Done` toevoegen
- Aan de slag → Issue naar "In Progress" op het board
- Klaar → Issue sluiten, plan naar `Plans/Archive/`

## Plannen

`Plans/Running/` en `Plans/Archive/` zijn voor **detailuitwerking** van issues, niet voor status of prioriteit.

- Als een issue uitwerking nodig heeft: maak of update een plan in `Plans/Running/`, zet bovenaan `Issue: #XX`
- Zet bij elk plan direct onder het issue ook `Gewenste statusactie: In Progress` of `Gewenste statusactie: Done`
- Na uitvoering: verplaats het plan naar `Plans/Archive/`
- Kijk voor open werk en prioriteit altijd naar [GitHub Issues](https://github.com/Silpher9/BeursManager/issues), niet naar `Plans/Running/`

## Agentrollen

- Gemini doet alleen research (analyse/verkenning), schrijft geen plannen en voert geen code uit
- Plan- en code-uitvoering gebeurt door Claude en Codex

## Git workflow

- Voor je aan een issue werkt: check `git status` op ongecommitte wijzigingen
- Na logisch afgerond en gevalideerd werk: commit met een duidelijke message in de vorm `type: korte beschrijving (#issue)`
  - Types: feat, fix, refactor, test, docs
- Push alleen als expliciet gevraagd of als dat voor deze workflow is afgesproken

## iPad-testen

SDK 55 + fysieke iPad = **development build** vereist, niet Expo Go.
Expo Go in de App Store ondersteunt max SDK 52. Vanaf SDK 53+ moet je een development build gebruiken (`npx expo run:ios` met Mac/Xcode, of EAS Build via cloud).

## Huidige status

Fases 0-5 (fundament, voorraad, beurzen, contacten, kosten, rapporten) zijn af. Home Hub is toegevoegd.
Zie [GitHub Issues](https://github.com/Silpher9/BeursManager/issues) en het [Project board](https://github.com/users/Silpher9/projects/1) voor actuele backlog en status.
