Issue: #9
Gewenste statusactie: In Progress
Status: In Progress (Fase 1)

# 3D Stand Configurator — Epic Plan

## Overzicht

Kunstenaars kunnen hun beursstand in 3D inrichten: wanden plaatsen, kunstwerken ophangen en lampen positioneren. Gebouwd met BabylonJS via WebView in een nieuwe "Stand" tab.

## Architectuur

- **BabylonJS** via WebView (hybrid)
- WebGL2-first, WebGPU als latere optimalisatie
- Communicatie app ↔ WebView via `postMessage` / `onMessage`
- Canonieke host: WebView in de app

---

## Fase 1: Host + basis scene ✦ HUIDIGE FASE

**Doel**: BabylonJS scene draaiend in een nieuwe tab, proof-of-concept.

**Scope:**
- Nieuwe "Stand" tab onderaan de tabbar
- WebView met BabylonJS scene (CDN)
- Scene: ground plane, ArcRotateCamera, HemisphericLight + DirectionalLight
- Touch-bediening: roteren, zoomen, pannen
- Eén procedurale wand (`CreateBox`: 300×250×10cm)
- postMessage brug (ping/pong)

**Bestanden:**
- `app/(tabs)/stand/index.tsx`
- `src/domains/stand/`
- `src/domains/stand/webview/` (HTML/JS)

**DoD:**
- [ ] "Stand" tab zichtbaar
- [ ] BabylonJS scene rendert in WebView
- [ ] Camera touch-bediening werkt
- [ ] Eén wand zichtbaar
- [ ] postMessage ping/pong werkt
- [ ] TypeScript clean, tests groen

---

## Fase 2: Wanden configureren ✅

**Doel**: meerdere wanden toevoegen, verplaatsen, verwijderen en configureren.

**DoD:**
- [x] Meerdere wanden toevoegen/verwijderen
- [x] Wanden verslepen en roteren via touch
- [x] Wandafmetingen configureerbaar (breedte × hoogte)

---

## Fase 2b: Wall Editing UX ✅

**DoD:**
- [x] Rotatie-snap toggle met instelbaar graden-interval
- [x] Muurdikte configureerbaar in model, bridge en UI
- [x] Gizmo handles beter zichtbaar/klikbaar
- [x] Editor controls in sidebar (tablet-first)

---

## Fase 2c: Wall Snapping ✅

**DoD:**
- [x] Snap-detectie bij wanden dicht bij elkaar + loodrecht
- [x] Ghost preview (exact 1 kandidaat, geen ambiguïteit)
- [x] Sidebar card met snap/negeer optie
- [x] dismissSnap end-to-end (ghost cleanup)

---

## Fase 2d: Build/View Mode ✅

**DoD:**
- [x] Build/view mode toggle
- [x] Wandlengtes zichtbaar in build mode (BabylonJS GUI)
- [x] Clean scene in view mode (geen gizmo's, labels, interactie)

---

## Fase 2e: Undo/Redo ✅

**DoD:**
- [x] Model-first command history (max 50) met pre/post state snapshots
- [x] Undo/redo voor add, remove, move, resize, snap
- [x] UI knoppen in sidebar

---

## Fase 2f: XZ-plane Drag Handle ✅

**DoD:**
- [x] Center handle op gizmo voor XZ-plane drag (grondvlak)
- [x] Undo/redo + snap detectie werkt mee

---

## Fase 3: Lampen (artwork-first model)

Lampen zijn geen vrije scene-objecten maar starten artwork-anchored met beperkte vrijheidsgraden.

### Fase 3a1: Artwork-first auto-placement ✦ HUIDIGE FASE

**Doel**: lamp automatisch plaatsen bij een kunstwerk.

**Flow:** Sidebar lamp-knop → klik op kunstwerk → lamp verschijnt automatisch boven het werk.

**DoD:**
- [x] Lamp plaatsing via artwork-klik (vaste hoogte + afstand)
- [x] SpotLight met auto-target op midden kunstwerk
- [x] Rail-drag langs wand (1D X-as)
- [x] Selectie + verwijderen
- [x] Undo/redo + persistentie
- [ ] iPad device-test

### Fase 3a2: Schaduwen + lichtkwaliteit

**DoD:**
- [ ] ShadowGenerator op spots
- [ ] Schaduwen op wanden en vloer

### Fase 3a3: Target finetuning

**DoD:**
- [ ] Target marker versleepbaar over wandvlak (2D)
- [ ] Lamp richting volgt target automatisch

---

## Fase 4a: Artwork Browser in Sidebar ✦ HUIDIGE FASE

**Doel**: kunstwerken van de geselecteerde beurs tonen in de sidebar.

**Scope:**
- Toon werken gekoppeld aan beurs (via fair_artworks)
- Filter per kunstenaar
- Thumbnail, naam, afmetingen
- Error indicator bij ontbrekende dimensies (height_cm/width_cm)

**DoD:**
- [ ] Beurs-gebonden kunstwerken in sidebar
- [ ] Filter per kunstenaar
- [ ] Ontbrekende dimensies gemarkeerd

---

## Fase 4b: Basic Placement op Wand

**Doel**: kunstwerk selecteren in sidebar → klik op wand → plaatsen.

**Scope:**
- Selecteer werk in sidebar → "placement mode"
- Klik op wand → textured plane met juiste schaal (cm → meters)
- Foto als texture (base64 via bridge)
- Geplaatste werken greyed out in menu
- Verwijder-optie (terug naar menu)

**DoD:**
- [ ] Werk selecteren + op wand plaatsen
- [ ] Juiste afmetingen uit voorraad
- [ ] Foto als texture
- [ ] Geplaatst/niet-geplaatst status in menu
- [ ] Verwijderen van wand

---

## Fase 4c: Repositioning op Wand

**Doel**: kunstwerk verplaatsen over het wandvlak.

**Scope:**
- Klik op kunstwerk in 3D → selectie
- Slepen over wand in lokale wand-assen (niet wereld X/Y)
- Wall-anchoring: werk blijft op wandvlak

**DoD:**
- [ ] Kunstwerk selecteerbaar in scene
- [ ] Versleepbaar over wandvlak

---

## Fase 4d: Overlap Detectie

**Doel**: visuele feedback bij overlappende kunstwerken.

**Scope:**
- Geometrische overlap-check per wand
- Overlappende werken lichten rood op
- Geen physics/collision, alleen visuele indicatie

**DoD:**
- [ ] Overlap detectie tussen werken op zelfde wand
- [ ] Rode highlight bij overlap

---

## Fase 4e: Afstandslabels (Hanging Guides)

**Doel**: afstanden van kunstwerk naar wandranden tonen.

**Scope:**
- Per kunstwerk: afstand naar alle 4 wandranden berekenen
- Labels aan elke zijde (in build mode)

**DoD:**
- [ ] Afstandslabels naar wandranden per kunstwerk

---

## Fase 4f: Artwork Persistentie

**Doel**: kunstwerk-plaatsingen meenemen in opgeslagen configuratie.

**Scope:**
- Artwork placements in stand_configurations JSON
- Save/load inclusief artwork positions per wand

**DoD:**
- [ ] Artwork placements in config JSON
- [ ] Laden herstelt kunstwerken op juiste wand + positie

---

## Fase 5: Opslaan en laden ✅

**DoD:**
- [x] Stand-indeling opslaan per beurs (één config per beurs)
- [x] Stand-indeling laden en scene herstellen
- [x] Model-first persistentie (geen WebView uitvragen)
- [x] Idempotente migratie

---

## Fase 3b: HDRI / Environment Lighting

**Doel**: realistische omgevingsbelichting via HDRI environment texture.

**Scope:**
- HDRCubeTexture laden als environment texture
- Image-based lighting (IBL) voor PBR-achtige reflecties
- Optioneel: skybox

**Aandachtspunten:**
- iPad performance met HDRI
- Artwork-kleurgetrouwheid als acceptatiecriterium
- Kleine, curated environment set

---

## Fase 7: Customisatie

**Doel**: visuele aanpassingen aan de stand.

**7a: Wandkleur**
- Kleurenpicker per wand in sidebar
- Standaard wit, aanpasbaar

Uitbreidbaar met toekomstige subfases (vloerkleur, texturen, etc.)

---

## Fase 6+: Optimalisatie en uitbreidingen (later)

- **Lightmap baking** via 3090 server (UV2 generatie voor procedurale meshes)
- **3D Photogrammetry** beelden van sculpturen/installaties
- **WebGPU engine** voor betere performance
- **Real-time GI** (RSM) als optionele "High Quality Mode"
- **Export/delen** van stand-indelingen
- **Meerdere ruimtes** per beurs

**Aandachtspunt voor baking**: procedurale meshes (vooral na CSG2) hebben niet automatisch bruikbare UV2 lightmap-kanalen. Hier moet een bewuste unwrap/atlasing-strategie voor komen.

---

## Buiten scope (niet gepland)

- Meerdere verdiepingen
- Vloer-/plafondtexturen
- Bezoekers-simulatie
