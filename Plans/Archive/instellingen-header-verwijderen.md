# Plan: Instellingen-header verwijderen

## Context

De instellingenpagina toont nog een losse native tab-header (`Instellingen`) boven een eerste kaart die zelf ook al als pagina-intro werkt:
- titel `Instellingen`
- korte uitleg `Beheer je demo-data en voorkeuren.`

Daardoor voelt de pagina dubbelop: eerst een losse header, daarna nog eens dezelfde paginacontext in de eerste kaart.

## Ontwerpdoel

- de native header op `/settings` verbergen
- de bestaande intro-kaart als primaire paginacontext behouden
- de wijziging klein houden: alleen header/paginahiërarchie, geen inhoudelijke settings-refactor

## Stap 1: Native tab-header verbergen voor Settings

**Bestand:** `app/(tabs)/_layout.tsx`

Voeg voor de `settings` tab `headerShown: false` toe:

```tsx
<Tabs.Screen
  name="settings"
  options={{
    title: 'Instellingen',
    headerShown: false,
    ...
  }}
/>
```

Dat brengt `Instellingen` in lijn met de andere tabpagina’s die inmiddels op in-content paginahiërarchie draaien.

## Stap 2: Intro-kaart behouden, niet opnieuw ontwerpen

**Bestand:** `app/(tabs)/settings.tsx`

De huidige eerste kaart is al de juiste vervanger voor de losse header:

```tsx
<Card>
  <Text style={styles.title}>Instellingen</Text>
  <Text style={styles.body}>Beheer je demo-data en voorkeuren.</Text>
</Card>
```

Architectuurmatig is hier dus **geen extra pageTitle-laag** nodig zoals bij `Rapporten`:
- de pagina heeft al een compacte, heldere intro-kaart
- er is geen tweede inhoudelijke hero-titel die om hiërarchische scheiding vraagt

Concreet:
- laat deze kaart staan
- verwijder geen inhoud
- voeg geen extra headercomponent of CTA-rij toe

## Stap 3: Scope expliciet klein houden

**Bestand:** `app/(tabs)/settings.tsx`

Niet meepakken in deze iteratie:
- geen herindeling van de demo-data kaart
- geen nieuwe instellingen-secties
- geen button-layout wijziging
- geen aparte settings-domeinextractie zolang de header het enige probleem is

De pagina mag na deze wijziging nog steeds bestaan uit:
1. intro-kaart
2. demo-data kaart

## Stap 4: Verificatie

Gebruik bestaande checks, geen nieuwe teststructuur nodig:

1. `npm run typecheck`
2. `npx playwright test tests/e2e/demo-seed.spec.ts`
3. Visuele check in `npm run web`

Controleer daarbij expliciet:
- geen losse native `Instellingen` header meer bovenaan
- de eerste kaart blijft de duidelijke paginacontext dragen
- demo-seed flow werkt nog steeds vanaf `/settings`

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `app/(tabs)/_layout.tsx` | `headerShown: false` op `settings` |

## Niet doen in deze iteratie

- geen redesign van de settingspagina
- geen nieuwe page-title stijl boven de bestaande kaart
- geen migratie naar een apart `src/domains/settings/` scherm alleen voor consistentie
- geen extra e2e-bestand voor een puur headerbesluit
