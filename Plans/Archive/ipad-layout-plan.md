# Implementatieplan: iPad Pro Responsive Layout

Dit plan beschrijft de stappen om de applicatie responsive te maken, specifiek gericht op een "Desktop-class" ervaring op grote schermen (iPad Pro), terwijl de mobiele weergave intact blijft.

## Doel & Scope (Design vs Inhoud)

We nemen de **layout en het visuele gevoel** van de mockup over, maar **niet de inhoud**.

1. **Responsive Navigatie**: Op smalle schermen (telefoons) blijft de onderste `TabBar` behouden. Op brede schermen (tablets horizontaal/web) wordt dit een vaste linker menubalk.
2. **Tablet-specifieke HomeHub**: De `HomeHubScreen` krijgt op brede schermen een échte tablet-compositie met een duidelijke Hero-zone en een grid.

**Wat we WEL overnemen uit de mockup (Layout):**
- Sidebar navigatie links (warme aardetinten, profiel/avatar onderaan).
- Grid-layout voor de content area.
- Grote Hero-kaart voor de actieve beurs.
- Compacte, vierkante actieknoppen direct naast de hero.
- Royaal gebruik van witruimte en rustige typografie.

**Wat we NIET overnemen uit de mockup (Inhoud):**
- Geen donut charts, lijngrafieken of nep-statistieken (grafieken horen in de 'Rapporten' tab).
- Geen 'Topkunstwerken' lijst (dit is een duplicaat van 'Voorraad').
- Geen globale zoekbalk in de header (buiten scope).
- De *inhoud* van de HomeHub blijft 100% trouw aan wat is gedefinieerd in `Plans/home-hub-plan.md` (actieve beurs info, snelle acties, en optioneel het laatste beursresultaat).

## Architectuur & Aanpak (Safe Route)

We maken **geen** custom navigator-boom (`<Sidebar> + <Slot>`). In plaats daarvan leunen we op de ingebouwde functionaliteit van Expo Router en React Navigation 7, namelijk `tabBarPosition: isTablet ? 'left' : 'bottom'`. Dit is de meest stabiele en minst risicovolle methode (behoudt nesting, back-buttons en headers).

**Bronnen:**
- https://docs.expo.dev/router/advanced/tabs/
- https://reactnavigation.org/docs/bottom-tab-navigator/

**Belangrijk:** Pas naar een custom layout gaan als `tabBarPosition` aantoonbaar niet voldoet.

## Implementatievolgorde (4 Stappen)

### Stap 1: Gedeelde Responsive Hook & Tokens
Creëer een betrouwbare basis voor schermgrootte detectie.
- **[NEW] `src/shared/hooks/useResponsive.ts`**:
  - `isTablet` boolean (breakpoint: `width >= 768`)
  - `isLargeScreen` boolean (breakpoint: `width >= 1024`, voor eventueel web)
  - Layout tokens: `contentMaxWidth`, `contentPadding`
  - **Test conservatief:** iPad portrait + landscape moeten beide goed werken. Vermijd een half-tablet/half-phone tussenstaat.

### Stap 2: Responsive Tabs (`tabBarPosition`)
Pas de bestaande tab-navigatie aan.
- **[MODIFY] `app/(tabs)/_layout.tsx`**:
  - Gebruik `useResponsive()`.
  - Pas de `<Tabs>` configuratie aan: `tabBarPosition: isTablet ? 'left' : 'bottom'`.
  - Tablet-specifieke `tabBarStyle`: donkerbruine achtergrond, padding, breder
  - Active-state styling op sidebar items
  - Alle huidige tabs behouden: Home, Voorraad, Beurzen, Contacten, Rapporten, Instellingen

### Stap 3: HomeHub Redesign voor Tablet
Dit is geen simpele aanpassing van `flexDirection`, maar een echte nieuwe compositie voor tablets.
- **[MODIFY] `src/domains/home/HomeHubScreen.tsx`**:
  - Gebruik `isTablet` en de max-width padding rules uit Stap 1.
  - **Tablet Layout:**
    - Grote "Hero Zone" (Actieve beurs)
    - Aparte "Action Rail" of action tiles naast de hero.
    - Een echte dashboard-grid (2 of 3 kolommen) voor onderliggende kaarten in plaats van een lange verticale stack.
  - *Opmerking:* Beperk de scope tot layout structuur (niet direct allerlei nieuwe grafieken of "nep-widgets" toevoegen, puur de bestaande data beter presenteren).

### Stap 4: Overige Schermen Laten Meebewegen
Pas na een succesvolle implementatie van de HomeHub, passen we de padding/container regels (`contentMaxWidth`) toe op de overige tabbladen (Voorraad, Beurzen, Contacten) zodat deze schermen mooi in de "safe zone" van het tablet-canvas vallen.

## Guardrails

- **Breakpoint conservatief kiezen** — test op iPad portrait + landscape voordat je verder gaat
- **Geen nieuwe content** — dit plan gaat over layout, niet over nieuwe features of widgets
- **Home-inhoud volgt `home-hub-plan.md`** — dat blijft de source of truth voor wat Home toont
- **Mobiel mag niet breken** — elke stap moet getest worden op zowel mobiel als tablet

## Verificatie

1. iPhone: bottom tabs blijven werken, geen visuele regressie
2. iPad portrait: sidebar links, content goed gepositioneerd
3. iPad landscape: sidebar + bredere content area, geen uitrekking
4. HomeHub: Hero + action tiles + grid op tablet, verticale stack op mobiel
5. Navigatie: alle routes, deep links en back-buttons werken correct

---
*Dit plan fungeert als de Single Source of Truth voor de iPad Layout migratie.*