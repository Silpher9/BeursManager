# Plan: Beursdag-modus integreren in de sidebar

## Context

De huidige beursdag-modus toont een brede, donkere banner (`ActiveFairDayBanner`) bovenaan het hele scherm. Op tablet met de sidebar ernaast creëert dit twee concurrerende navigatielagen — een "omgekeerde L" die het scherm zwaar maakt en de content verdringt.

**Doel:** Beursdag-status verplaatsen naar de sidebar op tablet. De banner verdwijnt op brede schermen. Op mobiel blijft een compacte variant bestaan.

## Design

### Tablet (sidebar zichtbaar)

Een compact **"Beursdag actief" blok** verschijnt bovenaan de `FloatingSidebar`, tussen het "BeursManager" merk en de navigatie-items:

```
┌──────────────────┐
│ BeursManager     │
├──────────────────┤
│ ● BEURSDAG ACTIEF│  ← warm accent blok
│ Kunstbeurs Breda │
│ [Overzicht] [Uit]│
├──────────────────┤
│ 🏠 Home          │
│ 📦 Voorraad      │
│ 🎪 Beurzen       │
│ 👥 Contacten     │
│ 📊 Rapporten     │
│ ⚙️ Instellingen   │
└──────────────────┘
```

**Visuele richtlijnen:**
- Achtergrondkleur: subtiel warmere tint dan de sidebar (`rgba(138, 106, 69, 0.15)` of vergelijkbaar)
- Accent-indicator: klein gekleurd bolletje of badge — rustig, niet knipperend
- Beursnaam: bold, wit
- **Geen datum** — `FairDayModeProvider` bevat alleen `fairId` en `fairName`. Datum toevoegen is een bewuste contextuitbreiding voor later, niet voor nu.
- "Overzicht" knop: navigeert naar `/fairs/{id}/day`
- "Uit" knop: compacte toggle, zet beursdag uit
- Geen extra navigatie-items (Verkoop/Contact) in de sidebar — die staan al op de beursdag-pagina zelf

### Mobiel (bottom tabs)

- `ActiveFairDayBanner` blijft, maar wordt **compacter**:
  - Alleen headerRow (beursnaam + toggle), geen actionRow
  - Acties (Overzicht/Verkoop/Contact) verplaatsen naar de beursdag-pagina zelf
- Alternatief: banner helemaal weg op mobiel en vervangen door een accent-kleur op de tab bar. Te bepalen na tablet-implementatie.

## Implementatie

### Stap 1: `FairDaySidebarCard` component maken

**Nieuw bestand:** `src/shared/fair-day/FairDaySidebarCard.tsx`

```tsx
type Props = {
  fairId: string;
  fairName: string;
  onOpenOverview: () => void;
  onDeactivate: () => void;
};
```

Render:
- Accent-achtergrond blok
- Kicker: "BEURSDAG ACTIEF"
- Beursnaam (bold, wit)
- Rij met: "Overzicht" knop (compact) + Uit-toggle (compact)

Styling: past binnen de 200px breedte van `FloatingSidebar`, gebruikt dezelfde kleurconstanten (`ACTIVE_TINT`, `INACTIVE_TINT`).

### Stap 2: `FloatingSidebar` uitbreiden

**Wijzig:** `src/shared/components/FloatingSidebar.tsx`

- Importeer `useFairDayMode` en `FairDaySidebarCard`
- Tussen de `brandText`/`separator` en de `itemsContainer`: conditioneel `FairDaySidebarCard` renderen als `activeFair` bestaat
- Voeg een tweede `separator` toe onder de card

### Stap 3: `ActiveFairDayBanner` conditioneel verbergen op tablet

**Wijzig:** `src/shared/fair-day/ActiveFairDayBanner.tsx`

- Importeer `useResponsive`
- Als `isTablet`: return `null` (banner niet renderen)
- Op mobiel: banner blijft, maar verwijder de `actionRow` (knoppen). Alleen headerRow met naam + toggle.

### Stap 4: Beursdag-pagina layout cleanup

**Wijzig:** Het beursdag-scherm (vermoedelijk `app/(tabs)/fairs/[id]/day.tsx` of vergelijkbaar)

De acties (Verkoop registreren, Contact toevoegen, Overzicht) staan al op de pagina zelf. Deze stap is geen functionele verhuizing, maar layout-polish:
- Behoud bestaande acties op de pagina
- Op tablet: acties in een grid naast elkaar in plaats van gestapeld
- Verifieer dat de pagina correct werkt zonder de banner (geen functionele afhankelijkheid van de banner)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/shared/fair-day/FairDaySidebarCard.tsx` | **Nieuw** — compact beursdag-blok voor sidebar |
| `src/shared/components/FloatingSidebar.tsx` | Conditioneel `FairDaySidebarCard` tonen |
| `src/shared/fair-day/ActiveFairDayBanner.tsx` | Verbergen op tablet, compacter op mobiel |
| Beursdag-pagina | Acties altijd op de pagina tonen, grid layout op tablet |

## Niet wijzigen

- `FairDayModeProvider` — context blijft exact hetzelfde
- `FairDayToggle` — hergebruiken in de sidebar card
- Navigatiestructuur / routes
- Database schema

## Verificatie

1. `npm run typecheck`
2. `npm run web` — visueel controleren:
   - Tablet: geen banner bovenaan, beursdag-blok in sidebar zichtbaar wanneer actief
   - Tablet: sidebar-blok verdwijnt wanneer beursdag uit staat
   - Tablet: "Overzicht" knop in sidebar navigeert correct
   - Mobiel: compacte banner zonder actieknoppen
   - Beursdag-pagina: acties werken onafhankelijk van banner/sidebar
3. `npm run test:unit`
4. `npm run test:e2e` — beursdag-gerelateerde flows

## Risico's

### Risico 1 — FloatingSidebar wordt te vol
**Mitigatie:** Card is compact (max ~60px hoog, geen datumregel). Als het nog te veel voelt, kan de kicker-tekst wegvallen en alleen beursnaam + acties overblijven.

### Risico 2 — Mobiele banner verandering breekt bestaande flow
**Mitigatie:** Stap 3 is bewust klein. Eerst alleen de actionRow weghalen. Als dat problemen geeft, terugdraaien.

---
*Source of truth voor de beursdag-modus sidebar integratie.*
