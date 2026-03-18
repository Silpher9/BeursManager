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

## Externe services

- `@fal-ai/client` — AI beeldgeneratie (key via `EXPO_PUBLIC_FAL_KEY`)

## Planning mode

- Sla het plan altijd op in `Plans/Running/` (bestandsnaam gebaseerd op het onderwerp)
- Werk dit bestand bij zolang de planning-sessie loopt
- Verplaats een plan naar `Plans/Archive/` wanneer het succesvol is uitgevoerd
- Verplaats ook plannen ouder dan 1 dag naar `Plans/Archive/`

## Huidige status

Fases 0-5 (fundament, voorraad, beurzen, contacten, kosten, rapporten) zijn af. Home Hub is toegevoegd.
Zie `Plans/backlog.md` voor actuele backlog.
