# Plan: GitHub Issues + Projects opzetten

## Doel

Centraal overzicht van backlog, features, bugs en taken via GitHub Issues + Projects board. Vervangt de versnipperde `Plans/backlog.md` + losse chatdiscussies als bron van waarheid voor werkstatus.

## Stap 1: Labels aanmaken

De standaard GitHub labels zijn te generiek. Maak project-specifieke labels aan:

```bash
# Verwijder ongebruikte standaardlabels
gh label delete "good first issue" --yes
gh label delete "help wanted" --yes
gh label delete "invalid" --yes
gh label delete "question" --yes
gh label delete "wontfix" --yes
gh label delete "duplicate" --yes
gh label delete "documentation" --yes

# Projectlabels aanmaken
gh label create "feature" --color "0E8A16" --description "Nieuwe functionaliteit"
gh label create "refactor" --color "D4C5F9" --description "Code-verbetering zonder gedragswijziging"
gh label create "smoke-test" --color "FBCA04" --description "Test toevoegen of verbeteren"
gh label create "security" --color "B60205" --description "Beveiligingsgerelateerd"
gh label create "ux" --color "1D76DB" --description "Gebruikerservaring / UI"
gh label create "infra" --color "C5DEF5" --description "Server, CI/CD, tooling"
gh label create "blocked" --color "E4E669" --description "Wacht op externe factor"
```

Behoud `bug` en `enhancement` (standaard GitHub labels).

## Stap 2: GitHub Project board aanmaken

```bash
gh project create --owner Silpher9 --title "BeursManager" --format board
```

Kolommen (automatisch bij board format):
- **Backlog** — idee of wens, nog niet geprioriteerd
- **Next** — volgende op de lijst
- **In Progress** — actief mee bezig
- **Done** — afgerond

## Stap 3: Huidige openstaande items als issues aanmaken

Op basis van de huidige plannen, chat-discussies en backlog:

### Features (open)
1. **Bonnetje scannen — iPad validatie (Fase C)**
   Labels: `feature`, `blocked`
   Beschrijving: Server + web flow bewezen. iPad-test met echte camera nog open.
   Link: `Plans/Archive/bonnetje-scannen-v1-uitvoer.md`

2. **Breadcrumb toepassen op alle child screens**
   Labels: `feature`, `ux`
   Beschrijving: 6 routes nog om te zetten naar BreadcrumbHeader.
   Link: `Plans/Archive/breadcrumb-alle-child-screens.md`

3. **Rapporten extra inzichten**
   Labels: `feature`
   Beschrijving: Gem. verkoopprijs, highlights card, sales count per beurs.
   Link: `Plans/Archive/rapporten-extra-inzichten.md`

4. **Instellingen header verwijderen**
   Labels: `ux`
   Beschrijving: Native stack header weghalen op instellingenpagina.
   Link: `Plans/Archive/instellingen-header-verwijderen.md`

5. **Inventory paginering / FlatList**
   Labels: `feature`
   Beschrijving: Performance bij grote voorraad.

6. **Error boundary toevoegen**
   Labels: `feature`
   Beschrijving: Graceful error handling in de app.

7. **Extra foto's per kunstwerk**
   Labels: `feature`
   Beschrijving: UI voor `extra_photo_paths` kolom.

### Smoke tests (open)
8. **Expense receipt happy path smoke test**
   Labels: `smoke-test`
   Beschrijving: Na iPad-validatie: E2E test voor foto → extractie → opslaan flow.

### Infra (open)
9. **Cloudflare Tunnel opzetten voor receipt-server**
   Labels: `infra`
   Beschrijving: Server bereikbaar maken buiten lokaal netwerk voor iPad-gebruik op beurzen.

## Stap 4: Bestaande backlog migreren

Na het aanmaken van de issues:
- `Plans/backlog.md` bijwerken met een verwijzing naar het GitHub Projects board
- Afgeronde items (1-28) hoeven niet als issues — die staan al in git history
- `Plans/Running/` en `Plans/Archive/` blijven bestaan als gedetailleerde plannen; issues linken ernaar

## Stap 5: Werkafspraken

- **Nieuw idee/bug?** → GitHub Issue aanmaken met juiste label
- **Plan schrijven?** → Plan in `Plans/Running/`, link in de issue
- **Aan de slag?** → Issue naar "In Progress" op het board
- **Klaar?** → Issue sluiten, plan naar `Plans/Archive/`
- **Agents** kunnen via `gh` CLI issues aanmaken, labelen en sluiten

## Verificatie

- [ ] Labels aangemaakt en opgeschoond
- [ ] Project board aangemaakt met 4 kolommen
- [ ] Alle openstaande items als issues aangemaakt
- [ ] Issues toegevoegd aan het project board
- [ ] `Plans/backlog.md` bijgewerkt met link naar board
