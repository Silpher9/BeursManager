# Plan: Journey Smoke Test Hardening

## Context

De 4 journey smoke tests in `tests/e2e/journey-smoke.spec.ts` zijn functioneel correct, maar hebben 3 fragiliteiten die ze onbetrouwbaar maken als regressievangnet:
- CSS-kleur assertions die breken bij styling-wijzigingen
- Hardcoded datums die verouderen
- Ontbrekende context-assert op fairId

Dit zijn geen nieuwe journeys, maar aanscherpingen van bestaande tests.

## Bestaande Dekking Eerst Controleren

| Bestaande spec | Relevante bestaande test(s) | Waarom onvoldoende / waarom geen overlap |
|---|---|---|
| `tests/e2e/journey-smoke.spec.ts` | Alle 4 journeys | Dit plan wijzigt deze tests, voegt geen nieuwe toe |

## Bestaande Smoke-Testplannen Ook Controleren

| Bestaand plan | Status | Relevante overlap | Waarom dit nieuwe plan toch nodig is |
|---|---|---|---|
| `Plans/Smoke tests/journey-smoke-tests.md` | Uitgevoerd ✅ | Beschrijft de 4 journeys | Dit plan is een hardening-pass, geen nieuw testplan |

## Scopegrenzen

- Maximaal aantal nieuwe journeys: **0** (alleen bestaande tests aanscherpen)
- Bestand: `tests/e2e/journey-smoke.spec.ts` (bestaand)
- Binnen scope: test-stabiliteit, assertions robuuster maken
- Buiten scope: nieuwe journeys, nieuwe helpers, functionele wijzigingen

## Aanscherpingen

### Fix 1: Journey 4 — `aria-selected` i.p.v. CSS-kleuren

**Probleem:** Journey 4 assert op exacte `background-color` rgba-waarden (`ACTIVE_BG`, `INACTIVE_BG`). Dit breekt bij elke styling-wijziging of browser-verschil.

**Oplossing:** Assert op `aria-selected` attribute. De `FloatingSidebar` component zet al `accessibilityState={{ selected: isFocused }}` (regel 79 in `FloatingSidebar.tsx`), wat React Native Web rendert als `aria-selected="true"`.

**Wijziging:**

```typescript
// Oud:
const ACTIVE_BG = 'rgba(255, 253, 249, 0.12)';
const INACTIVE_BG = 'rgba(0, 0, 0, 0)';
// ...
await expect(tab('Voorraad')).toHaveCSS('background-color', ACTIVE_BG);
await expect(tab('Home')).toHaveCSS('background-color', INACTIVE_BG);

// Nieuw:
await expect(tab('Voorraad')).toHaveAttribute('aria-selected', 'true');
await expect(tab('Home')).toHaveAttribute('aria-selected', 'false');
```

Verwijder de `ACTIVE_BG` en `INACTIVE_BG` constanten.

### Fix 2: Journey 2 — relatieve datums i.p.v. hardcoded 2027

**Probleem:** Journey 2 gebruikt `2027-01-10` / `2027-01-11` als beursdatums. Na januari 2027 is deze beurs niet meer "aankomend" en faalt de Home Hub test.

**Oplossing:** Genereer datums relatief aan vandaag (bijv. +30 en +31 dagen).

**Wijziging:**

```typescript
// Oud:
await page.getByPlaceholder('YYYY-MM-DD').nth(0).fill('2027-01-10');
await page.getByPlaceholder('YYYY-MM-DD').nth(1).fill('2027-01-11');

// Nieuw:
const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};
await page.getByPlaceholder('YYYY-MM-DD').nth(0).fill(futureDate(30));
await page.getByPlaceholder('YYYY-MM-DD').nth(1).fill(futureDate(31));
```

**Let op:** de `createFair` helper in `helpers.ts` heeft hetzelfde probleem (hardcoded `2026-03-13`/`2026-03-14`). Dit valt buiten scope van dit plan maar is goed om te weten.

### Fix 3: Journey 3 — expliciete `fairId` check in contact-URL

**Probleem:** Journey 3 assert alleen op `/contacts/new` na klikken op "Contact toevoegen". Het controleert niet dat de `fairId` query parameter meegegeven wordt, terwijl dat precies de context-overdracht is die we willen bewijzen.

**Oplossing:** Assert op de volledige URL inclusief `fairId`.

**Wijziging:**

```typescript
// Oud:
await expect(page).toHaveURL(/\/contacts\/new/);

// Nieuw:
await expect(page).toHaveURL(new RegExp(`/contacts/new\\?fairId=${fairId}`));
```

## Waarom Deze Fixes Nodig Zijn

| Fix | Huidige situatie | Risico zonder fix |
|---|---|---|
| Fix 1 (aria-selected) | CSS-kleur kan per browser/update afwijken | False failures bij elke styling-tweak |
| Fix 2 (relatieve datums) | Test veroudert na jan 2027 | Stille failure, beurs verschijnt niet als "aankomend" |
| Fix 3 (fairId assert) | Context-overdracht niet bewezen | Test kan slagen terwijl fairId kwijt is |

## Verificatie

1. `npx playwright test tests/e2e/journey-smoke.spec.ts` — alle 4 journeys slagen
2. `npm run test:e2e` — volledige suite blijft groen
3. Handmatig checken: Journey 4 faalt niet meer als je `ACTIVE_ITEM_BG` kleur wijzigt in `FloatingSidebar.tsx`
