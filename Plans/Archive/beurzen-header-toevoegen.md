# Plan: Beurzen-pagina ScreenHeader weg + CTA-rij

## Context

De beurzen-indexpagina (`app/(tabs)/fairs/index.tsx`) heeft een losse `ScreenHeader` met "Beurzen" + "Toevoegen" knop. Dit wijkt af van het patroon dat op andere pagina's is neergezet. De "Toevoegen" knop hoort niet in de hero-Card (die gaat over een specifieke beurs), maar moet wel visueel gekoppeld blijven aan de bovenkant van de pagina.

## Ontwerpdoel

- ScreenHeader verwijderen
- "Beurzen" titel verwerken in de hero-Card
- "Nieuwe beurs" als compacte CTA-rij direct onder de hero-Card
- Hero-Card blijft puur beurs-overzicht (geen page-level acties erin mengen)

## Stap 1: ScreenHeader vervangen

**Bestand:** `app/(tabs)/fairs/index.tsx`

### Wat verdwijnt

- `ScreenHeader` import en gebruik
- De losse header-rij met "Beurzen" titel + "Toevoegen" button

### Wat verandert in de hero-Card

Voeg "Beurzen" toe als aparte page-title regel bovenaan de hero-Card, vóór de kicker "BEURSOVERZICHT". Dit is een eigen stijl, niet dezelfde als de bestaande `heroTitle` (die is voor de inhoudelijke kop "Volgende beurs: ..."):

```
Beurzen                    (pageTitle — nieuw, fontSize 28, fontWeight 700)
BEURSOVERZICHT             (kicker — bestaand)
Volgende beurs: ...        (heroTitle — bestaand, inhoudelijke kop)
[2 afgeronde beurzen]      (stats — bestaand)
```

Nieuwe stijl `pageTitle`:
```ts
pageTitle: {
  fontSize: 28,
  fontWeight: '700',
  color: palette.text,
},
```

Dit is bewust een apart kopniveau — `pageTitle` is de paginanaam, `heroTitle` is de inhoudelijke kop van het overzicht. Geen concurrerende kopniveaus.

De hero-Card bevat nu de paginatitel + het beurs-overzicht, maar geen actie-buttons.

## Stap 2: CTA-rij toevoegen

**Bestand:** `app/(tabs)/fairs/index.tsx`

Direct na de hero-Card, vóór de filterkaart, een `AppButton`:

```tsx
<Link href="/fairs/new" asChild>
  <AppButton label="Nieuwe beurs" compact />
</Link>
```

Dit is een losse button, geen Card — visueel licht, functioneel duidelijk. Consistent met hoe "Toevoegen" op Voorraad en Contacten onder de hero staat.

### Altijd zichtbaar

De CTA-rij is altijd zichtbaar, ook bij 0 beurzen. Bij een lege staat is er ook al een EmptyState met "Nieuwe beurs", maar de CTA-rij bovenaan maakt de actie altijd vindbaar.

## Stap 3: Testen

Geen nieuw testbestand nodig. Controleer:

1. `npm run typecheck` moet slagen
2. Bestaande e2e tests blijven groen (journey-smoke navigeert via beurzen)
3. Bestaande fairs e2e tests blijven groen (als aanwezig)
4. Visuele check: "Beurzen" titel in hero-Card, "Nieuwe beurs" button eronder, geen losse header meer

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/fairs/index.tsx` | ScreenHeader weg, pageTitle in Card, CTA-rij na hero |

## Niet doen in deze iteratie

- Geen wijziging aan de hero-Card inhoud (beursoverzicht, stats)
- Geen tablet-specifieke layout
- Geen wijziging aan de beurzenlijst of filterlogica

## Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/journey-smoke.spec.ts`
3. `npx playwright test tests/e2e/fairs.spec.ts` (als aanwezig)
4. Visuele check in `npm run web`
