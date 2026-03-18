# Plan: Contact Breadcrumb Smoke Test

## Context

De app heeft de afgelopen dagen veel shell-/headerwerk gekregen:
- native back-headers verdwijnen
- `BreadcrumbHeader` wordt het standaardpatroon voor child screens
- return paths verschuiven van implicit stack-back naar expliciete breadcrumb- en actieknoppen

Voor `contacts` is dit een hoog-risico gebied:
- `new`, `detail` en `edit` zijn allemaal diepe routes
- bestaande `contacts.spec.ts` test CRUD, maar niet de nieuwe breadcrumb-shell of de expliciete return paths

Dit eerste smoke-testplan houdt de scope bewust klein: eerst één contact-flow als regressiecheck voordat er een bredere consolidatieronde of extra journey-set komt.

## Bestaande Dekking Eerst Controleren

| Bestaande spec | Relevante bestaande test(s) | Waarom onvoldoende / waarom geen overlap |
|---|---|---|
| `tests/e2e/contacts.spec.ts` | `can navigate to contact detail and see info` | Checkt detailinhoud, niet breadcrumb-context of terugpad naar `/contacts`. |
| `tests/e2e/contacts.spec.ts` | `can edit contact from detail screen` | Checkt edit/save, niet breadcrumb-labels of `Annuleren` terug naar detail. |
| `tests/e2e/journey-smoke.spec.ts` | `Journey: Beursdag → contact → return path` | Gaat over fair-contextretentie naar `/contacts/new`, niet over contact detail/edit shells zelf. |
| `tests/e2e/fair-child-nav.spec.ts` | fair child navigation tests | Dekking alleen voor fair-routes, geen contact-child screens. |
| `tests/e2e/smoke.spec.ts` | `can create a contact from contacts` | Checkt alleen basis-create flow, niet de nieuwe breadcrumb/return-path structuur. |

## Bestaande Smoke-Testplannen Ook Controleren

| Bestaand plan | Status | Relevante overlap | Waarom dit nieuwe plan toch nodig is |
|---|---|---|---|
| `Plans/Running/breadcrumb-alle-child-screens.md` | gepland | Beschrijft ook `/contacts/new`, `/contacts/[id]`, `/contacts/[id]/edit` | Dit nieuwe plan is de eerste concrete smoke-test slice om dat brede plan later gericht te verifiëren. |
| `Plans/Smoke tests/smoke-test-plan-template.md` | template | Geen functionele overlap | Alleen sjabloon, geen inhoudelijke dekking. |

## Naamconventie Voor Planbestanden

- map: `Plans/Smoke tests/`
- bestandsnaam: `contact-breadcrumb-smoke-tests.md`

## Scopegrenzen

- maximaal aantal nieuwe journeys: `1`
- voorgestelde spec: `tests/e2e/contact-breadcrumb-smoke.spec.ts`
- binnen scope:
  - contact detail breadcrumb
  - contact edit breadcrumb
  - expliciete return paths via `Bewerken`, `Annuleren`, en `Contacten` breadcrumb
- buiten scope:
  - contact-validatie
  - interest picker
  - fair-prefill vanuit beursdag
  - volledige CRUD-herhaling die al in `contacts.spec.ts` zit

## Voorgestelde Journeys

### Journey 1: Contact detail/edit return path

```text
describe('Journey smoke: contact breadcrumb return paths')
- Startpunt: bestaand contact op `/contacts/[id]`
- Kritieke overgang 1: klik `Bewerken` vanaf detail
- Verwachte bestemming: `/contacts/[id]/edit`
- Welke context moet behouden blijven: breadcrumb toont `Contacten › {naam} › Bewerken`
- Welke zichtbare assertion bewijst dat:
  - heading `Contact bewerken`
  - breadcrumb-knop `Contacten`
  - breadcrumb-knop met contactnaam
  - actieknop `Annuleren`

- Kritieke overgang 2: klik `Annuleren` vanaf edit
- Verwachte bestemming: terug naar `/contacts/[id]`
- Welke context moet behouden blijven: detail toont dezelfde contactnaam en `Bewerken`
- Welke zichtbare assertion bewijst dat:
  - URL eindigt op `/contacts/[id]`
  - heading met contactnaam zichtbaar
  - `Bewerken` zichtbaar

- Kritieke overgang 3: klik `Contacten` in breadcrumb op detail
- Verwachte bestemming: `/contacts`
- Welke context moet behouden blijven: lijstpagina toont contactenoverzicht
- Welke zichtbare assertion bewijst dat:
  - URL `/contacts`
  - page title `Contacten`
  - contactnaam zichtbaar in lijst
```

## Waarom Deze Journey Nog Niet Gedekt Is

| Journey | Niet gedekt door | Concrete reden |
|---|---|---|
| Journey 1 | `tests/e2e/contacts.spec.ts` | CRUD is gedekt, maar niet de nieuwe breadcrumb-shell en expliciete return-path logica. |

## Testontwerpregels

- houd de test kort en single-purpose
- gebruik bestaande helper `createContact` uit `tests/e2e/helpers.ts`
- assert na elke route-overgang zowel URL als primaire content
- gebruik rol-/tekstassertions op breadcrumb-knoppen, niet op styling
- geen extra helpers toevoegen tenzij ze later door minstens 2 breadcrumb specs worden hergebruikt

## Verificatie

1. `npx playwright test tests/e2e/contact-breadcrumb-smoke.spec.ts`
2. `npx playwright test tests/e2e/contacts.spec.ts`
3. `npm run test:e2e`

Bij failure moet direct duidelijk zijn:
- of de edit-route niet meer correct opent
- of `Annuleren` verkeerd terugstuurt
- of de breadcrumb op detail geen weg terug naar `/contacts` meer geeft

## Definition Of Done

Dit eerste smoke-testplan is pas goed als:
- het een echt gat vult buiten `contacts.spec.ts`
- het slechts één high-signal contact journey toevoegt
- het de nieuwe breadcrumb-shell en return-path logica expliciet dekt
- het later als eerste regressiecheck voor contact child screens kan dienen
