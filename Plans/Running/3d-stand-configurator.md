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

## Fase 2d: Build/View Mode ✦ HUIDIGE FASE

**Doel**: twee modi voor de editor — bouwmodus met labels/afmetingen en viewmodus voor presentatie.

**Scope:**
- Toggle build/view mode in sidebar
- Build mode: wandlengtes als labels bovenop wanden
- View mode: clean scene zonder helpers

**DoD:**
- [ ] Build/view mode toggle
- [ ] Wandlengtes zichtbaar in build mode
- [ ] Clean scene in view mode

---

## Fase 2e: Undo/Redo

**Doel**: command history voor wall acties.

**Scope:**
- Command pattern op wall add/remove/move/resize/snap
- Undo/redo knoppen in sidebar

**DoD:**
- [ ] Undo/redo voor wall acties
- [ ] UI knoppen in sidebar

---

## Fase 2f: XZ-plane Drag Handle

**Doel**: gecombineerd slepen over grondvlak via center handle.

**Scope:**
- Paars bolletje op gizmo origin
- Drag beweegt wand over X en Z tegelijk

**DoD:**
- [ ] Center handle op gizmo voor XZ-plane drag
- [ ] Wanden snappen correct op positie + rotatie

---

## Fase 3: Lampen plaatsen

**Doel**: lampen toevoegen die de scene realistisch verlichten.

**Scope:**
- 2 lamp-types (bijv. spot en rail) als .glb modellen
- SpotLight gekoppeld aan lamp-mesh
- Lampen verplaatsbaar/richtbaar via GizmoManager
- Realistische schaduwen (ShadowGenerator)

**DoD:**
- [ ] 2 lamp-types plaatsbaar
- [ ] Lampen verplaatsbaar en richtbaar
- [ ] Schaduwen zichtbaar op wanden en vloer

---

## Fase 4: Kunstwerken ophangen

**Doel**: werken uit de BeursManager voorraad op wanden plaatsen met juiste afmetingen.

**Scope:**
- App stuurt kunstwerk-data naar WebView (id, title, heightCm, widthCm, foto)
- Kunstwerk = textured plane op de wand, juiste schaal
- Foto laden als texture (base64 via postMessage of lokale server)
- Versleepbaar langs de wand
- Lijstje in de app-UI om kunstwerken te selecteren

**Data-grens:**
```
App → WebView: { type: 'addArtwork', id, title, heightCm, widthCm, imageBase64 }
WebView → App: { type: 'artworkPlaced', id, wallId, position }
```

**DoD:**
- [ ] Kunstwerken uit voorraad selecteerbaar
- [ ] Op wand geplaatst met juiste afmetingen
- [ ] Foto zichtbaar als texture
- [ ] Versleepbaar langs de wand

---

## Fase 5: Opslaan en laden

**Doel**: stand-indeling persistent opslaan per beurs.

**Scope:**
- Stand-configuratie als JSON document (wanden, lampen, kunstwerken + posities)
- Opslaan in SQLite, gekoppeld aan fair_id
- **Beurs-selectiemenu** bij openen Stand tab: dropdown/lijst met alle beurzen, kies een beurs → laad of start configuratie
- Bij heropenen: scene herstellen vanuit opgeslagen configuratie
- DB migratie: nieuwe `stand_configurations` tabel

**Stand-document formaat:**
```json
{
  "walls": [{ "id": "w1", "width": 300, "height": 250, "position": {...}, "rotation": {...}, "hasDoor": false }],
  "lamps": [{ "id": "l1", "type": "spot", "position": {...}, "target": {...} }],
  "artworks": [{ "artworkId": "abc", "wallId": "w1", "position": {...} }]
}
```

**DoD:**
- [ ] Stand-indeling opslaan per beurs
- [ ] Stand-indeling laden en scene herstellen
- [ ] Meerdere standen per beurs mogelijk (optioneel)

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
