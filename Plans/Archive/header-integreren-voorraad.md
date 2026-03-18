# Plan: Stack headers integreren voor Voorraad, Beurzen en Contacten

## Context

De standaard Expo Router Stack/Tabs header ("Voorraad", "Beurzen", etc.) ziet eruit als een losstaand element dat niet past bij de card-based content eronder. De header wordt vervangen door een custom header-rij die onderdeel is van de scroll-content, zodat alles visueel samenvalt. 

**Scope beperking:** In deze iteratie passen we dit alleen toe op de data-gedreven lijst-pagina's (Voorraad, Beurzen, Contacten) waar een "Toevoegen" actie relevant is. Home, Rapporten en Instellingen blijven voorlopig ongemoeid om dubbele hiërarchie te voorkomen. Sub-schermen (detail, bewerken, nieuw) behouden hun Stack header met terugknop.

## Stap 1: Gedeeld `ScreenHeader` component maken

Nieuw bestand: `src/shared/components/ScreenHeader.tsx`

```tsx
type Props = {
  title: string;
  action?: ReactNode;
};
```

Render een `View` (row, space-between) met titel (fontSize 28, fontWeight 700) en optionele action-node (voor bv. "Toevoegen" knop).

**Let op (UX/UI eisen):**
- Laat de header in deze iteratie **meescrollen** met de content; maak hem niet sticky.
- `useSafeAreaInsets` is een nuttige guardrail, maar alleen toepassen als het scherm zonder extra inset daadwerkelijk overlap met statusbalk/notch geeft.

## Stap 2: Headers verbergen

### Tabs met Stack layout (header komt van Stack `_layout.tsx`)

| Layout-bestand | Wijziging op `index` route |
|---|---|
| `app/(tabs)/inventory/_layout.tsx` | `headerShown: false` toevoegen aan index |
| `app/(tabs)/fairs/_layout.tsx` | `headerShown: false` toevoegen aan index |
| `app/(tabs)/contacts/_layout.tsx` | `headerShown: false` toevoegen aan index |

*(Home, Reports en Settings layouts worden niet aangepast).*

## Stap 3: Custom `ScreenHeader` toevoegen per index-scherm

| Scherm | Titel | Action |
|---|---|---|
| `app/(tabs)/inventory/index.tsx` | Voorraad | `<Link href="/inventory/new"><AppButton label="Toevoegen" compact /></Link>` |
| `app/(tabs)/fairs/index.tsx` | Beurzen | `<Link href="/fairs/new"><AppButton label="Toevoegen" compact /></Link>` |
| `app/(tabs)/contacts/index.tsx` | Contacten | `<Link href="..."><AppButton label="Toevoegen" compact /></Link>` (met fairId-logica) |

Per scherm: bestaande `<Stack.Screen options={{ headerRight: ... }} />` verwijderen, `<ScreenHeader>` bovenaan de content plaatsen.

**Let op (Dubbele hiërarchie voorkomen):** 
Zorg ervoor dat de content of kaarten direct onder de `ScreenHeader` niet óók nog proberen te fungeren als pagina-titel.

## Stap 4: E2E tests toevoegen / aanscherpen

Bestanden:

- `tests/e2e/inventory.spec.ts`
- `tests/e2e/fairs.spec.ts`
- `tests/e2e/contacts.spec.ts`

Werk:

- voeg per lijst-hoofdpagina een controle toe dat de custom `ScreenHeader` titel zichtbaar is
- controleer dat de `Toevoegen` knop zichtbaar en klikbaar blijft
- controleer dat navigatie naar het relevante `new` scherm nog werkt

Scenario's:

- `inventory.spec.ts`
  - open `/inventory`
  - controleer `Voorraad` header in content
  - klik `Toevoegen`
  - controleer navigatie naar `/inventory/new`

- `fairs.spec.ts`
  - open `/fairs`
  - controleer `Beurzen` header in content
  - klik `Toevoegen`
  - controleer navigatie naar `/fairs/new`

- `contacts.spec.ts`
  - open `/contacts`
  - controleer `Contacten` header in content
  - klik `Toevoegen`
  - controleer navigatie naar `/contacts/new` (of fair-prefill route als relevant in de testcontext)

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/shared/components/ScreenHeader.tsx` | **Nieuw** — gedeeld header component |
| `app/(tabs)/inventory/_layout.tsx` | `headerShown: false` op index |
| `app/(tabs)/fairs/_layout.tsx` | `headerShown: false` op index |
| `app/(tabs)/contacts/_layout.tsx` | `headerShown: false` op index |
| `app/(tabs)/inventory/index.tsx` | Stack.Screen opruimen, ScreenHeader toevoegen |
| `app/(tabs)/fairs/index.tsx` | Stack.Screen opruimen, ScreenHeader toevoegen |
| `app/(tabs)/contacts/index.tsx` | Stack.Screen opruimen, ScreenHeader toevoegen |
| `tests/e2e/inventory.spec.ts` | Header + toevoegen flow controleren |
| `tests/e2e/fairs.spec.ts` | Header + toevoegen flow controleren |
| `tests/e2e/contacts.spec.ts` | Header + toevoegen flow controleren |

## Verificatie

1. `npm run typecheck` — geen TypeScript fouten
2. `npm run web` — visueel controleren:
   - De 3 lijst-hoofdpagina's tonen titel + eventuele actieknop als content-element (geen aparte Stack-balk)
   - Padding klopt (geen overlap met statusbalk)
   - Sub-schermen (nieuw, detail, bewerken) hebben nog steeds hun Stack header met terugknop
   - Home, Rapporten en Settings layout functioneren als vanouds
3. `npm run test:unit` — bestaande tests slagen
4. Gerichte e2e:
   - `npx playwright test tests/e2e/inventory.spec.ts`
   - `npx playwright test tests/e2e/fairs.spec.ts`
   - `npx playwright test tests/e2e/contacts.spec.ts`
