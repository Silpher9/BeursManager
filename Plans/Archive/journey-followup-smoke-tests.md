# Plan: Journey Follow-up Smoke Tests

## Context

`tests/e2e/journey-smoke.spec.ts` is now in place as a small cross-domain smoke layer.
Before it can serve as a reliable regression net, it needs 3 hardening fixes and one targeted validation pass against the likely beursdag flow bug in `src/domains/fairs/FairDayScreen.tsx`.

Relevant current code:
- `tests/e2e/journey-smoke.spec.ts`
- `tests/e2e/fair-day-workflow.spec.ts`
- `src/domains/fairs/FairDayScreen.tsx` (`beforeRemove` deactivates fair day on every navigation)

## Doel

1. De 4 journey smoke tests stabiel en tijdsbestendig maken.
2. Met Journey 1 bewijzen of de beursdag `beforeRemove`-hypothese echt een bug is.
3. Alleen daarna bepalen of een codefix nodig is.
4. UI-polish pas hervatten nadat de flowlaag betrouwbaar is.

## Bestaande Dekking Eerst Controleren

| Bestaande spec | Relevante bestaande test(s) | Waarom onvoldoende / waarom geen overlap |
|---|---|---|
| `tests/e2e/fair-day-workflow.spec.ts` | `full fair day workflow: assign, activate, sell, contact` | De workflow is breed, maar checkt niet scherp genoeg of de fair day-context functioneel behouden blijft na sale-save en terugnavigatie. |
| `tests/e2e/home.spec.ts` | Home quick action tests | Dekt Home deels, maar niet expliciet de juiste fair-context voor de sale editor. |
| `tests/e2e/contacts.spec.ts` | Contact CRUD + detail flows | Dekt contactschermen, maar niet de return-path vanuit fair-context. |
| `tests/e2e/inventory.spec.ts`, `tests/e2e/fairs.spec.ts`, `tests/e2e/sales.spec.ts` | CRUD / round-trips | Dekken domeinen goed, maar niet de specifieke cross-domein journey-contexten uit `journey-smoke.spec.ts`. |

## Bestaande Smoke-Testplannen Ook Controleren

| Bestaand plan | Status | Relevante overlap | Waarom dit follow-up plan toch nodig is |
|---|---|---|---|
| `Plans/Running/journey-smoke-tests.md` | gepland / geïmplementeerd als eerste versie | Beschrijft de 4 journeys | Dit plan gaat niet over selectie van journeys, maar over het hardenen en valideren van de geïmplementeerde spec. |
| `Plans/Smoke tests/smoke-test-plan-template.md` | actief template | Proces- en overlapregels | Geen overlap; dit is een concreet uitvoerplan. |

## Scopegrenzen

Binnen scope:
- `tests/e2e/journey-smoke.spec.ts` hardenen
- gerichte run van journey-smoke + fair-day-workflow
- validatie van de `beforeRemove` hypothese
- eventueel klein fixplan voor `FairDayScreen` als de journeys echte flowbreuk aantonen

Buiten scope:
- nieuwe smoke journeys toevoegen
- brede e2e-suite herstructureren
- layout/design werk
- niet-gerelateerde bugs zoals demo-seed of WAL-web issues

## Uitvoeringsplan

### Stap 1 — Journey spec hardenen

Bestand:
- `tests/e2e/journey-smoke.spec.ts`

Werk:
- vervang CSS-kleurasserts in Journey 4 door semantische actieve staat (`aria-selected`, accessibility state of andere expliciete active marker)
- vervang hardcoded toekomstige datums in Journey 2 door relatief gegenereerde datums
- maak in Journey 3 expliciet zichtbaar dat `fairId` context echt is meegegeven vóór save

Acceptatiecriteria:
- geen tijdsgevoelige vaste jaartallen meer
- sidebar-actieve status test niet op exacte CSS-kleur
- fair-context wordt expliciet bewezen, niet impliciet aangenomen

### Stap 2 — Gerichte validatierun

Commando’s:
1. `npx playwright test tests/e2e/journey-smoke.spec.ts`
2. `npx playwright test tests/e2e/fair-day-workflow.spec.ts`

Werk:
- noteer precies welke journey faalt
- leg per failure vast:
  - kritieke overgang
  - verwachte bestemming
  - feitelijke bestemming
  - verloren context (`activeFair`, `fairId`, etc.)

Acceptatiecriteria:
- we weten of Journey 1 en de bestaande fair-day workflow elkaar bevestigen of tegenspreken

### Stap 3 — Beursdag bug-triage

Verdachte code:
- `src/domains/fairs/FairDayScreen.tsx`
- huidige listener:

```ts
useEffect(() => {
  return navigation.addListener('beforeRemove', () => {
    deactivateFairDay();
  });
}, [navigation, deactivateFairDay]);
```

Werk:
- als Journey 1 of `fair-day-workflow.spec.ts` faalt op contextverlies:
  - beschouw dit als bevestigde bug
  - maak de gewenste regel expliciet:
    - beursdag blijft actief over interne navigatie naar sale/contact/detail
    - beursdag gaat alleen uit bij expliciete deactivatie
- als de tests niet falen:
  - documenteer dat de hypothese niet is bevestigd
  - geen fix “op gevoel” uitvoeren

Acceptatiecriteria:
- er is een duidelijke beslissing: `confirmed bug` of `not reproduced`

### Stap 4 — Alleen indien nodig: klein fixplan voor `FairDayScreen`

Alleen uitvoeren als Stap 3 een echte bug bevestigt.

Voorkeursrichting:
- verwijder of versmal de onvoorwaardelijke `beforeRemove` deactivatie
- laat `deactivateFairDay()` primair lopen via expliciete toggle / sidebar-card / banner-uitactie
- zorg dat return-paden naar beursdag de context behouden

Acceptatiecriteria:
- fix is klein en gericht
- Journey 1 en `fair-day-workflow.spec.ts` slagen daarna allebei

## Verificatie

1. `npm run typecheck`
2. `npx playwright test tests/e2e/journey-smoke.spec.ts`
3. `npx playwright test tests/e2e/fair-day-workflow.spec.ts`
4. Indien een fix wordt gedaan: beide specs opnieuw draaien

## Definition Of Done

Dit follow-up plan is pas afgerond als:
- de 3 test-hardening punten verwerkt zijn
- de beursdag bug-hypothese getest is met echte journeys
- er een expliciete uitkomst is (`geen bug` of `bug bevestigd`)
- alleen bevestigde flowbreuken doorstromen naar een codefix
