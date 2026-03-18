# BeursManager Backlog

Bijgewerkt op 14 maart 2026 (nacht).

## Afgerond

1. ~~Contactcontext per beurs toevoegen~~ — `fair_id` op contacts, auto-fill in beursdag-modus
2. ~~Beursdag-modus persistent maken~~ — `FairDayModeProvider` met toggle en context
3. ~~Kunstenaar als eerste-class filter~~ — `artists` tabel, dropdown, filter in voorraad en beursselecties
4. ~~Image pipeline verharden~~ — Compressie (1600px, 78%) + thumbnails (420px, 68%) via expo-image-manipulator
5. ~~Kleine testlaag toevoegen~~ — Vitest unit tests + Playwright E2E (smoke, home, inventory, fairs, sales, contacts, expenses, fair-day workflow, demo-seed)
6. ~~Gedeelde formatters centraliseren~~ — `src/shared/formatters.ts` (euroFormatter, formatPrice) + `src/domains/fairs/formatters.ts`
7. ~~Date picker voor beursdata~~ — Native date picker in FairEditorScreen
8. ~~Tab bar icons~~ — Toegevoegd aan alle tabs
9. ~~Detailschermen defensief verversen~~ — `useIsFocused` toegepast in FairDetailScreen, fairs/index, contacts/index, HomeHubScreen, FairDayScreen, SaleDetailScreen
10. ~~Home Hub~~ — Taakgerichte startpagina als eerste tab (beursblok, snelle acties, kernoverzicht, laatste beursresultaat)
11. ~~Contactdetailscherm~~ — Dedicated `contacts/[id]/index.tsx` met volledige contactinfo, aankopen, interesses, bewerken/verwijderen
12. ~~Zoek/filter op contactenlijst~~ — Zoeken op naam/email/telefoon, filteren op type met FilterChips, statistieken dashboard
13. ~~Contact-kunstwerk interesse-koppeling~~ — ArtworkInterestPicker modal, interesse toevoegen/verwijderen vanuit contactdetail
14. ~~Schema migratie v4→v5~~ — `contact_artworks` PK vereenvoudigd van `(contact_id, artwork_id, fair_id)` naar `(contact_id, artwork_id)`, lost NULL-in-PK bug op
15. ~~Cross-platform confirmAction~~ — `Alert.alert` is no-op in RNW 0.21+, `confirmAction` utility gebruikt `window.confirm` op web
16. ~~Rapportenscherm bouwen~~ — Omzet/winst per beurs, totaaloverzicht, technieken-ranking, top verkopen, jaar-filter, tablet layout
17. ~~`useIsFocused` in ArtworkDetailScreen~~ — Stale-data bug opgelost na bewerken→terug
18. ~~Grote componenten opsplitsen~~ — FairDetailScreen (6 sub-componenten), ArtworkEditorScreen (5), inventory/index (3) + shared FilterChip
19. ~~Zoek/filter op beurzenlijst~~ — Zoekbalk (naam/locatie) + periodefilter (Alles/Aankomend/Afgelopen) met gedeeld FilterChip
20. ~~`confirmAction` toepassen op ArtworkDetailScreen en FairDetailScreen~~ — Bleek al doorgevoerd bij item 15
21. ~~`useAsyncEffect` hook~~ — Vervangt herhaald `isMounted` boilerplate in 15 bestanden (17 useEffects)

## Later

22. Inventory paginering / FlatList
23. Error boundary toevoegen
24. Extra foto's per kunstwerk (UI voor `extra_photo_paths`)
