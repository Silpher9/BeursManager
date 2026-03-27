import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { WebView } from 'react-native-webview';

import type { AppToWebViewMessage, EditorCommand, EditorMode, LampDefaults, PlacedArtwork, PlacedLamp, SnapSuggestion, Vec3, WallConfig } from './types';
import { type StandDocument, type StandSetupItem, saveStandConfig, loadStandConfig, listSetups, createSetup, renameSetup, duplicateSetup, deleteSetup } from './repository';

type StandEditorState = {
  walls: WallConfig[];
  selectedWallId: string | null;
  snapEnabled: boolean;
  snapDegrees: number;
  sceneReady: boolean;
  editorMode: EditorMode;
  snapSuggestion: SnapSuggestion | null;
  canUndo: boolean;
  canRedo: boolean;
  selectedFairId: string | null;
  selectedSetupId: number | null;
  setups: StandSetupItem[];
  selectFair: (fairId: string | null) => Promise<void>;
  selectSetup: (setupId: number) => Promise<void>;
  createNewSetup: (name: string) => Promise<void>;
  renameCurrentSetup: (name: string) => Promise<void>;
  duplicateCurrentSetup: (name: string) => Promise<void>;
  deleteCurrentSetup: () => Promise<void>;
  saveCurrentConfig: () => Promise<void>;
  hasUnsavedChanges: boolean;
  replayTransforms: () => void;
  artworkPanelVisible: boolean;
  toggleArtworkPanel: () => void;
  devToolsVisible: boolean;
  toggleDevTools: () => void;
  placedArtworks: PlacedArtwork[];
  pendingArtworkId: string | null;
  selectedArtworkId: string | null;
  setPendingArtwork: (artworkId: string | null, data?: { heightCm: number; widthCm: number; imageUri: string }) => void;
  handleWallTapped: (wallId: string, hitPoint: Vec3, hitNormal: Vec3) => void;
  handleArtworkPlaced: (artworkId: string, wallId: string, localPosition: Vec3) => void;
  removeSelectedArtwork: () => void;
  setSelectedArtworkId: (id: string | null) => void;
  handleArtworkMoved: (artworkId: string, oldPos: Vec3, newPos: Vec3) => void;
  placedLamps: PlacedLamp[];
  selectedLampId: string | null;
  setSelectedLampId: (id: string | null) => void;
  lampPlacementMode: boolean;
  setLampPlacementMode: (mode: boolean) => void;
  addLampForArtwork: (artworkId: string) => void;
  removeSelectedLamp: () => void;
  handleLampMoved: (lampId: string, oldPos: Vec3, newPos: Vec3) => void;
  lampRuntimeState: { intensity: number; angle: number; innerAngle: number; exponent: number; range: number; diffuseR: number; diffuseG: number; diffuseB: number; helperVisible: boolean } | null;
  setLampRuntimeState: (state: { intensity: number; angle: number; innerAngle: number; exponent: number; range: number; diffuseR: number; diffuseG: number; diffuseB: number; helperVisible: boolean } | null) => void;
  lampTypeDefaults: Record<string, LampDefaults>;
  setLampTypeDefault: (lampType: string, defaults: LampDefaults) => void;
  applyDefaultsToAllLamps: (lampType: string) => void;
  handleLampTargetMoved: (lampId: string, oldTarget: Vec3, newTarget: Vec3) => void;
  toggleEditorMode: () => void;
  setSnapSuggestion: (suggestion: SnapSuggestion | null) => void;
  confirmSnapSuggestion: () => void;
  dismissSnapSuggestion: () => void;
  addWall: () => void;
  removeSelectedWall: () => void;
  wallHasContent: (wallId: string) => boolean;
  updateWallDimension: (wallId: string, field: 'width' | 'height' | 'depth', value: string) => void;
  handleWallMoved: (wallId: string, oldPos: Vec3, newPos: Vec3, oldRot: Vec3, newRot: Vec3) => void;
  undo: () => void;
  redo: () => void;
  toggleSnap: (enabled: boolean) => void;
  updateSnapDegrees: (value: string) => void;
  sendMessage: (message: AppToWebViewMessage) => void;
  setSelectedWallId: (id: string | null) => void;
  setSceneReady: (ready: boolean) => void;
  registerWebView: (ref: WebView | null) => void;
  registerIframe: (ref: HTMLIFrameElement | null) => void;
};

const StandEditorCtx = createContext<StandEditorState | null>(null);

const MAX_HISTORY = 50;
let wallCounter = 0;
let lampCounter = 0;

export function StandEditorProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const webViewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [walls, setWalls] = useState<WallConfig[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapDegrees, setSnapDegrees] = useState(15);
  const [sceneReady, setSceneReady] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('build');
  const [snapSuggestion, setSnapSuggestion] = useState<SnapSuggestion | null>(null);

  // Command history
  const [history, setHistory] = useState<EditorCommand[]>([]);
  const [redoStack, setRedoStack] = useState<EditorCommand[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string | null>(null);
  const [selectedSetupId, setSelectedSetupId] = useState<number | null>(null);
  const [setups, setSetups] = useState<StandSetupItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [artworkPanelVisible, setArtworkPanelVisible] = useState(false);
  const [devToolsVisible, setDevToolsVisible] = useState(false);
  const [placedArtworks, setPlacedArtworks] = useState<PlacedArtwork[]>([]);
  const [pendingArtworkId, setPendingArtworkId] = useState<string | null>(null);
  const pendingArtworkRef = useRef<{ heightCm: number; widthCm: number; imageUri: string } | null>(null);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [placedLamps, setPlacedLamps] = useState<PlacedLamp[]>([]);
  const [selectedLampId, setSelectedLampId] = useState<string | null>(null);
  const [lampRuntimeState, setLampRuntimeState] = useState<{ intensity: number; angle: number; innerAngle: number; exponent: number; range: number; diffuseR: number; diffuseG: number; diffuseB: number; helperVisible: boolean } | null>(null);
  const [lampTypeDefaults, setLampTypeDefaults] = useState<Record<string, LampDefaults>>({});
  // Track last known transform per wall (updated by wallMoved)
  const wallTransforms = useRef<Record<string, { position: Vec3; rotation: Vec3 }>>({});

  const sendMessage = useCallback((message: AppToWebViewMessage) => {
    const json = JSON.stringify(message);
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(json, '*');
    } else {
      webViewRef.current?.postMessage(json);
    }
  }, []);

  const pushCommand = useCallback((cmd: EditorCommand) => {
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), cmd]);
    setRedoStack([]);
    setHasUnsavedChanges(true);
  }, []);

  // --- Wall actions (with history) ---

  const addWall = useCallback(() => {
    wallCounter++;
    const wall: WallConfig = {
      id: `wall-${wallCounter}`,
      width: 300,
      height: 250,
      depth: 10,
    };
    setWalls(prev => {
      // Track initial position (scene spreads walls by count)
      const count = prev.length;
      const initX = count > 0 ? count * 2 : 0;
      wallTransforms.current[wall.id] = {
        position: { x: initX, y: wall.height / 200, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      };
      return [...prev, wall];
    });
    sendMessage({ type: 'addWall', wall });
    pushCommand({ kind: 'addWall', wall });
  }, [sendMessage, pushCommand]);

  const removeSelectedWall = useCallback(() => {
    setSelectedWallId(current => {
      if (!current) return null;
      setWalls(prev => {
        const wall = prev.find(w => w.id === current);
        if (wall) {
          const transform = wallTransforms.current[current] ?? { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
          // Cascade: remove lamps on this wall
          placedLamps.filter(l => l.wallId === current).forEach(l => {
            sendMessage({ type: 'removeLamp', lampId: l.id });
          });
          setPlacedLamps(prev => prev.filter(l => l.wallId !== current));

          sendMessage({ type: 'removeWall', wallId: current });
          // Remove artworks on this wall
          setPlacedArtworks(prev => prev.filter(a => a.wallId !== current));
          pushCommand({
            kind: 'removeWall',
            wall,
            position: transform.position,
            rotation: transform.rotation,
          });
          delete wallTransforms.current[current];
        }
        return prev.filter(w => w.id !== current);
      });
      return null;
    });
  }, [sendMessage, pushCommand]);

  const wallHasContent = useCallback((wallId: string) => {
    return placedArtworks.some(a => a.wallId === wallId) || placedLamps.some(l => l.wallId === wallId);
  }, [placedArtworks, placedLamps]);

  const updateWallDimension = useCallback((wallId: string, field: 'width' | 'height' | 'depth', value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 1000) return;
    // Block resize when wall has artworks or lamps
    if (wallHasContent(wallId)) return;

    setWalls(prev => {
      const wall = prev.find(w => w.id === wallId);
      if (!wall) return prev;
      const updated = { ...wall, [field]: num };
      sendMessage({
        type: 'updateWall',
        wallId,
        width: updated.width,
        height: updated.height,
        depth: updated.depth,
      });
      pushCommand({
        kind: 'resizeWall',
        wallId,
        oldWidth: wall.width,
        oldHeight: wall.height,
        oldDepth: wall.depth,
        newWidth: updated.width,
        newHeight: updated.height,
        newDepth: updated.depth,
      });
      return prev.map(w => w.id === wallId ? updated : w);
    });
  }, [wallHasContent, sendMessage, pushCommand]);

  const handleWallMoved = useCallback((wallId: string, oldPos: Vec3, newPos: Vec3, oldRot: Vec3, newRot: Vec3) => {
    wallTransforms.current[wallId] = { position: newPos, rotation: newRot };
    pushCommand({ kind: 'moveWall', wallId, oldPosition: oldPos, newPosition: newPos, oldRotation: oldRot, newRotation: newRot });
  }, [pushCommand]);

  // --- Undo / Redo ---

  const undo = useCallback(() => {
    setHasUnsavedChanges(true);
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const cmd = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      switch (cmd.kind) {
        case 'addWall':
          sendMessage({ type: 'removeWall', wallId: cmd.wall.id });
          setWalls(w => w.filter(x => x.id !== cmd.wall.id));
          break;
        case 'removeWall':
          sendMessage({ type: 'addWall', wall: cmd.wall });
          sendMessage({ type: 'setWallTransform', wallId: cmd.wall.id, position: cmd.position, rotation: cmd.rotation });
          wallTransforms.current[cmd.wall.id] = { position: cmd.position, rotation: cmd.rotation };
          setWalls(w => [...w, cmd.wall]);
          break;
        case 'moveWall':
        case 'snapWall':
          sendMessage({ type: 'setWallTransform', wallId: cmd.wallId, position: cmd.oldPosition, rotation: cmd.oldRotation });
          wallTransforms.current[cmd.wallId] = { position: cmd.oldPosition, rotation: cmd.oldRotation };
          break;
        case 'resizeWall':
          sendMessage({ type: 'updateWall', wallId: cmd.wallId, width: cmd.oldWidth, height: cmd.oldHeight, depth: cmd.oldDepth });
          setWalls(w => w.map(x => x.id === cmd.wallId ? { ...x, width: cmd.oldWidth, height: cmd.oldHeight, depth: cmd.oldDepth } : x));
          break;
        case 'placeArtwork':
          sendMessage({ type: 'removeArtwork', artworkId: cmd.artwork.artworkId });
          setPlacedArtworks(a => a.filter(x => x.artworkId !== cmd.artwork.artworkId));
          break;
        case 'removeArtwork':
          sendMessage({ type: 'placeArtwork', artworkId: cmd.artwork.artworkId, wallId: cmd.artwork.wallId, position: cmd.artwork.position, hitNormal: cmd.artwork.hitNormal, heightCm: cmd.artwork.heightCm, widthCm: cmd.artwork.widthCm, imageUri: cmd.artwork.imageUri, isLocal: true });
          setPlacedArtworks(a => [...a, cmd.artwork]);
          break;
        case 'moveArtwork':
          sendMessage({ type: 'setArtworkPosition', artworkId: cmd.artworkId, localPosition: cmd.oldPosition });
          setPlacedArtworks(a => a.map(x => x.artworkId === cmd.artworkId ? { ...x, position: cmd.oldPosition } : x));
          break;
        case 'addLamp':
          sendMessage({ type: 'removeLamp', lampId: cmd.lamp.id });
          setPlacedLamps(l => l.filter(x => x.id !== cmd.lamp.id));
          break;
        case 'removeLamp':
          sendMessage({ type: 'addLamp', lamp: cmd.lamp });
          setPlacedLamps(l => [...l, cmd.lamp]);
          break;
        case 'moveLamp':
          sendMessage({ type: 'setLampPosition', lampId: cmd.lampId, position: cmd.oldPosition });
          setPlacedLamps(l => l.map(x => x.id === cmd.lampId ? { ...x, position: cmd.oldPosition } : x));
          break;
        case 'moveLampTarget':
          sendMessage({ type: 'setLampTarget', lampId: cmd.lampId, target: cmd.oldTarget });
          setPlacedLamps(l => l.map(x => x.id === cmd.lampId ? { ...x, target: cmd.oldTarget } : x));
          break;
      }

      setRedoStack(r => [...r, cmd]);
      return rest;
    });
  }, [sendMessage]);

  const redo = useCallback(() => {
    setHasUnsavedChanges(true);
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const cmd = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      switch (cmd.kind) {
        case 'addWall':
          sendMessage({ type: 'addWall', wall: cmd.wall });
          setWalls(w => [...w, cmd.wall]);
          break;
        case 'removeWall':
          sendMessage({ type: 'removeWall', wallId: cmd.wall.id });
          setWalls(w => w.filter(x => x.id !== cmd.wall.id));
          break;
        case 'moveWall':
        case 'snapWall':
          sendMessage({ type: 'setWallTransform', wallId: cmd.wallId, position: cmd.newPosition, rotation: cmd.newRotation });
          wallTransforms.current[cmd.wallId] = { position: cmd.newPosition, rotation: cmd.newRotation };
          break;
        case 'resizeWall':
          sendMessage({ type: 'updateWall', wallId: cmd.wallId, width: cmd.newWidth, height: cmd.newHeight, depth: cmd.newDepth });
          setWalls(w => w.map(x => x.id === cmd.wallId ? { ...x, width: cmd.newWidth, height: cmd.newHeight, depth: cmd.newDepth } : x));
          break;
        case 'placeArtwork':
          sendMessage({ type: 'placeArtwork', artworkId: cmd.artwork.artworkId, wallId: cmd.artwork.wallId, position: cmd.artwork.position, hitNormal: cmd.artwork.hitNormal, heightCm: cmd.artwork.heightCm, widthCm: cmd.artwork.widthCm, imageUri: cmd.artwork.imageUri, isLocal: true });
          setPlacedArtworks(a => [...a, cmd.artwork]);
          break;
        case 'removeArtwork':
          sendMessage({ type: 'removeArtwork', artworkId: cmd.artwork.artworkId });
          setPlacedArtworks(a => a.filter(x => x.artworkId !== cmd.artwork.artworkId));
          break;
        case 'moveArtwork':
          sendMessage({ type: 'setArtworkPosition', artworkId: cmd.artworkId, localPosition: cmd.newPosition });
          setPlacedArtworks(a => a.map(x => x.artworkId === cmd.artworkId ? { ...x, position: cmd.newPosition } : x));
          break;
        case 'addLamp':
          sendMessage({ type: 'addLamp', lamp: cmd.lamp });
          setPlacedLamps(l => [...l, cmd.lamp]);
          break;
        case 'removeLamp':
          sendMessage({ type: 'removeLamp', lampId: cmd.lamp.id });
          setPlacedLamps(l => l.filter(x => x.id !== cmd.lamp.id));
          break;
        case 'moveLamp':
          sendMessage({ type: 'setLampPosition', lampId: cmd.lampId, position: cmd.newPosition });
          setPlacedLamps(l => l.map(x => x.id === cmd.lampId ? { ...x, position: cmd.newPosition } : x));
          break;
        case 'moveLampTarget':
          sendMessage({ type: 'setLampTarget', lampId: cmd.lampId, target: cmd.newTarget });
          setPlacedLamps(l => l.map(x => x.id === cmd.lampId ? { ...x, target: cmd.newTarget } : x));
          break;
      }

      setHistory(h => [...h, cmd]);
      return rest;
    });
  }, [sendMessage]);

  // --- Snap ---

  const toggleEditorMode = useCallback(() => {
    setEditorMode(current => {
      const next = current === 'build' ? 'view' : 'build';
      sendMessage({ type: 'setEditorMode', mode: next });
      return next;
    });
    setSnapSuggestion(null);
  }, [sendMessage]);

  const confirmSnapSuggestion = useCallback(() => {
    if (!snapSuggestion) return;
    const preSnapTransform = wallTransforms.current[snapSuggestion.wallId]
      ?? { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
    sendMessage({
      type: 'confirmSnap',
      wallId: snapSuggestion.wallId,
      position: snapSuggestion.candidatePosition,
      rotation: snapSuggestion.candidateRotation,
    });
    wallTransforms.current[snapSuggestion.wallId] = {
      position: snapSuggestion.candidatePosition,
      rotation: snapSuggestion.candidateRotation,
    };
    pushCommand({
      kind: 'snapWall',
      wallId: snapSuggestion.wallId,
      oldPosition: preSnapTransform.position,
      newPosition: snapSuggestion.candidatePosition,
      oldRotation: preSnapTransform.rotation,
      newRotation: snapSuggestion.candidateRotation,
    });
    setSnapSuggestion(null);
  }, [snapSuggestion, sendMessage, pushCommand]);

  const dismissSnapSuggestion = useCallback(() => {
    setSnapSuggestion(null);
    sendMessage({ type: 'dismissSnap' });
  }, [sendMessage]);

  const toggleSnap = useCallback((enabled: boolean) => {
    setSnapEnabled(enabled);
    sendMessage({ type: 'setRotationSnap', enabled, degrees: snapDegrees });
  }, [sendMessage, snapDegrees]);

  const updateSnapDegrees = useCallback((value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 180) return;
    setSnapDegrees(num);
    setSnapEnabled(current => {
      if (current) {
        sendMessage({ type: 'setRotationSnap', enabled: true, degrees: num });
      }
      return current;
    });
  }, [sendMessage]);

  const setPendingArtwork = useCallback((artworkId: string | null, data?: { heightCm: number; widthCm: number; imageUri: string }) => {
    setPendingArtworkId(artworkId);
    pendingArtworkRef.current = data ?? null;
  }, []);

  // Stores artwork data for in-flight placement (between wallTapped → artworkPlaced)
  const inflightPlacementRef = useRef<{ artworkId: string; wallId: string; hitNormal: Vec3; heightCm: number; widthCm: number; imageUri: string } | null>(null);

  const handleWallTapped = useCallback((wallId: string, hitPoint: Vec3, hitNormal: Vec3) => {
    if (!pendingArtworkId) return;

    const artworkData = pendingArtworkRef.current;
    if (!artworkData) return;

    if (placedArtworks.some(a => a.artworkId === pendingArtworkId)) return;

    // Clear pending immediately to prevent double placement
    pendingArtworkRef.current = null;

    // Store in-flight data — state commit happens when scene confirms with local position
    inflightPlacementRef.current = {
      artworkId: pendingArtworkId,
      wallId,
      hitNormal,
      heightCm: artworkData.heightCm,
      widthCm: artworkData.widthCm,
      imageUri: artworkData.imageUri,
    };

    sendMessage({
      type: 'placeArtwork',
      artworkId: pendingArtworkId,
      wallId,
      position: hitPoint,
      hitNormal,
      heightCm: artworkData.heightCm,
      widthCm: artworkData.widthCm,
      imageUri: artworkData.imageUri,
    });

    setPendingArtworkId(null);
  }, [pendingArtworkId, placedArtworks, sendMessage]);

  // Called when scene confirms placement with canonical local position
  const handleArtworkPlaced = useCallback((artworkId: string, wallId: string, localPosition: Vec3) => {
    const inflight = inflightPlacementRef.current;
    if (!inflight || inflight.artworkId !== artworkId) return;
    inflightPlacementRef.current = null;

    const placed: PlacedArtwork = {
      artworkId,
      wallId,
      position: localPosition, // canonical wall-local
      hitNormal: inflight.hitNormal,
      heightCm: inflight.heightCm,
      widthCm: inflight.widthCm,
      imageUri: inflight.imageUri,
    };

    setPlacedArtworks(prev => [...prev, placed]);
    pushCommand({ kind: 'placeArtwork', artwork: placed });
  }, [pushCommand]);

  const removeSelectedArtwork = useCallback(() => {
    if (!selectedArtworkId) return;
    const artwork = placedArtworks.find(a => a.artworkId === selectedArtworkId);
    if (!artwork) return;

    // Cascade: remove lamps anchored to this artwork
    placedLamps.filter(l => l.artworkId === selectedArtworkId).forEach(l => {
      sendMessage({ type: 'removeLamp', lampId: l.id });
    });
    setPlacedLamps(prev => prev.filter(l => l.artworkId !== selectedArtworkId));

    sendMessage({ type: 'removeArtwork', artworkId: selectedArtworkId });
    setPlacedArtworks(prev => prev.filter(a => a.artworkId !== selectedArtworkId));
    pushCommand({ kind: 'removeArtwork', artwork });
    setSelectedArtworkId(null);
  }, [selectedArtworkId, placedArtworks, placedLamps, sendMessage, pushCommand]);

  const handleArtworkMoved = useCallback((artworkId: string, oldPos: Vec3, newPos: Vec3) => {
    setPlacedArtworks(prev => prev.map(a => a.artworkId === artworkId ? { ...a, position: newPos } : a));
    pushCommand({ kind: 'moveArtwork', artworkId, oldPosition: oldPos, newPosition: newPos });
  }, [pushCommand]);

  // --- Lamp actions ---
  const [lampPlacementMode, setLampPlacementModeRaw] = useState(false);
  const setLampPlacementMode = useCallback((mode: boolean) => {
    setLampPlacementModeRaw(mode);
    if (mode) {
      // Clear lamp selection so focus-guard doesn't eat first artwork tap
      setSelectedLampId(null);
      setLampRuntimeState(null);
    }
  }, []);

  const addLampForArtwork = useCallback((artworkId: string) => {
    // Find artwork to get its position and wall
    const artwork = placedArtworks.find(a => a.artworkId === artworkId);
    if (!artwork) return;

    // Check if artwork already has a lamp
    if (placedLamps.some(l => l.artworkId === artworkId)) return;

    const heightM = artwork.heightCm / 100;
    const wallDepthM = walls.find(w => w.id === artwork.wallId)?.depth ?? 10;
    const depthOffset = wallDepthM / 200 + 0.40; // 40cm from wall surface
    const side = artwork.position.z >= 0 ? 1 : -1;

    lampCounter++;
    const lamp: PlacedLamp = {
      id: `lamp-${lampCounter}`,
      type: 'spot',
      artworkId,
      wallId: artwork.wallId,
      position: {
        x: artwork.position.x,
        y: artwork.position.y + heightM / 2 + 0.35, // 35cm above artwork top
        z: side * depthOffset,
      },
      target: {
        x: artwork.position.x,
        y: artwork.position.y,
        z: artwork.position.z,
      },
    };
    sendMessage({ type: 'addLamp', lamp });
    // Apply type defaults if available
    const defaults = lampTypeDefaults[lamp.type];
    if (defaults) {
      for (const [prop, val] of Object.entries(defaults)) {
        sendMessage({ type: 'setLampProperty', lampId: lamp.id, property: prop, value: val as number });
      }
    }
    setPlacedLamps(prev => [...prev, lamp]);
    pushCommand({ kind: 'addLamp', lamp });
    setLampPlacementMode(false);
  }, [placedArtworks, placedLamps, walls, lampTypeDefaults, sendMessage, pushCommand]);

  const removeSelectedLamp = useCallback(() => {
    if (!selectedLampId) return;
    const lamp = placedLamps.find(l => l.id === selectedLampId);
    if (!lamp) return;
    sendMessage({ type: 'removeLamp', lampId: selectedLampId });
    setPlacedLamps(prev => prev.filter(l => l.id !== selectedLampId));
    pushCommand({ kind: 'removeLamp', lamp });
    setSelectedLampId(null);
  }, [selectedLampId, placedLamps, sendMessage, pushCommand]);

  const handleLampMoved = useCallback((lampId: string, oldPos: Vec3, newPos: Vec3) => {
    setPlacedLamps(prev => prev.map(l => l.id === lampId ? { ...l, position: newPos } : l));
    pushCommand({ kind: 'moveLamp', lampId, oldPosition: oldPos, newPosition: newPos });
  }, [pushCommand]);

  const handleLampTargetMoved = useCallback((lampId: string, oldTarget: Vec3, newTarget: Vec3) => {
    setPlacedLamps(prev => prev.map(l => l.id === lampId ? { ...l, target: newTarget } : l));
    pushCommand({ kind: 'moveLampTarget', lampId, oldTarget, newTarget });
  }, [pushCommand]);

  const setLampTypeDefault = useCallback((lampType: string, defaults: LampDefaults) => {
    setLampTypeDefaults(prev => ({ ...prev, [lampType]: defaults }));
    setHasUnsavedChanges(true);
  }, []);

  const applyDefaultsToAllLamps = useCallback((lampType: string) => {
    const defaults = lampTypeDefaults[lampType];
    if (!defaults) return;
    placedLamps.filter(l => l.type === lampType).forEach(l => {
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'intensity', value: defaults.intensity });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'angle', value: defaults.angle });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'innerAngle', value: defaults.innerAngle });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'exponent', value: defaults.exponent });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'range', value: defaults.range });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'diffuseR', value: defaults.diffuseR });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'diffuseG', value: defaults.diffuseG });
      sendMessage({ type: 'setLampProperty', lampId: l.id, property: 'diffuseB', value: defaults.diffuseB });
    });
    setHasUnsavedChanges(true);
  }, [lampTypeDefaults, placedLamps, sendMessage]);

  const toggleDevTools = useCallback(() => {
    setDevToolsVisible(prev => !prev);
  }, []);

  const toggleArtworkPanel = useCallback(() => {
    setArtworkPanelVisible(prev => !prev);
  }, []);

  const replayTransforms = useCallback(() => {
    const transforms = wallTransforms.current;
    for (const wallId of Object.keys(transforms)) {
      const t = transforms[wallId];
      sendMessage({ type: 'setWallTransform', wallId, position: t.position, rotation: t.rotation });
    }
  }, [sendMessage]);

  const clearSceneState = useCallback(() => {
    placedLamps.forEach(l => sendMessage({ type: 'removeLamp', lampId: l.id }));
    walls.forEach(w => sendMessage({ type: 'removeWall', wallId: w.id }));
    setWalls([]);
    setPlacedArtworks([]);
    setPlacedLamps([]);
    setLampTypeDefaults({});
    setPendingArtworkId(null);
    setSelectedArtworkId(null);
    setSelectedLampId(null);
    setSelectedWallId(null);
    setSnapSuggestion(null);
    setHistory([]);
    setRedoStack([]);
    wallTransforms.current = {};
    setHasUnsavedChanges(false);
  }, [placedLamps, walls, sendMessage]);

  const loadConfigIntoScene = useCallback((config: StandDocument) => {

    const loadedWalls: WallConfig[] = [];
    for (const wall of config.walls) {
      const wc: WallConfig = { id: wall.id, width: wall.width, height: wall.height, depth: wall.depth };
      loadedWalls.push(wc);
      sendMessage({ type: 'addWall', wall: wc });
      sendMessage({ type: 'setWallTransform', wallId: wall.id, position: wall.position, rotation: wall.rotation });
      wallTransforms.current[wall.id] = { position: wall.position, rotation: wall.rotation };
    }
    setWalls(loadedWalls);

    // Update wallCounter to avoid id collisions
    const maxNum = loadedWalls.reduce((max, w) => {
      const num = parseInt(w.id.replace('wall-', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    wallCounter = maxNum;

    // Load placed artworks
    if (config.artworks && config.artworks.length > 0) {
      for (const art of config.artworks) {
        sendMessage({
          type: 'placeArtwork',
          artworkId: art.artworkId,
          wallId: art.wallId,
          position: art.position,
          hitNormal: art.hitNormal,
          heightCm: art.heightCm,
          widthCm: art.widthCm,
          imageUri: art.imageUri,
          isLocal: true,
        });
      }
      setPlacedArtworks(config.artworks);
    }

    // Load lamps
    if (config.lamps && config.lamps.length > 0) {
      for (const lamp of config.lamps) {
        sendMessage({ type: 'addLamp', lamp });
      }
      setPlacedLamps(config.lamps);
      const maxLampNum = config.lamps.reduce((max, l) => {
        const num = parseInt(l.id.replace('lamp-', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      lampCounter = maxLampNum;
    }

    // Load lamp type defaults
    if (config.lampTypeDefaults) {
      setLampTypeDefaults(config.lampTypeDefaults);
      // Apply defaults to loaded lamps
      if (config.lamps) {
        for (const lamp of config.lamps) {
          const defaults = config.lampTypeDefaults[lamp.type];
          if (defaults) {
            for (const [prop, val] of Object.entries(defaults)) {
              sendMessage({ type: 'setLampProperty', lampId: lamp.id, property: prop, value: val as number });
            }
          }
        }
      }
    }
  }, [sendMessage]);

  const selectFair = useCallback(async (fairId: string | null) => {
    clearSceneState();
    setSelectedFairId(fairId);
    setSelectedSetupId(null);
    setSetups([]);

    if (!fairId) return;

    // List setups for this fair
    const fairSetups = await listSetups(db, fairId);
    setSetups(fairSetups);

    // Auto-select first setup if only one exists
    if (fairSetups.length === 1) {
      const config = await loadStandConfig(db, fairSetups[0].id);
      if (config) {
        loadConfigIntoScene(config);
        setSelectedSetupId(fairSetups[0].id);
      }
    }
  }, [db, clearSceneState, loadConfigIntoScene]);

  const selectSetup = useCallback(async (setupId: number) => {
    clearSceneState();
    setSelectedSetupId(setupId);

    const config = await loadStandConfig(db, setupId);
    if (config) loadConfigIntoScene(config);
  }, [db, clearSceneState, loadConfigIntoScene]);

  const createNewSetup = useCallback(async (name: string) => {
    if (!selectedFairId) return;
    const id = await createSetup(db, selectedFairId, name);
    const fairSetups = await listSetups(db, selectedFairId);
    setSetups(fairSetups);
    setSelectedSetupId(id);
    clearSceneState();
  }, [db, selectedFairId, clearSceneState]);

  const renameCurrentSetup = useCallback(async (name: string) => {
    if (!selectedSetupId) return;
    await renameSetup(db, selectedSetupId, name);
    if (selectedFairId) {
      const fairSetups = await listSetups(db, selectedFairId);
      setSetups(fairSetups);
    }
  }, [db, selectedSetupId, selectedFairId]);

  const duplicateCurrentSetup = useCallback(async (name: string) => {
    if (!selectedSetupId || !selectedFairId) return;
    const newId = await duplicateSetup(db, selectedSetupId, name);
    const fairSetups = await listSetups(db, selectedFairId);
    setSetups(fairSetups);
    // Switch to the duplicate
    clearSceneState();
    setSelectedSetupId(newId);
    const config = await loadStandConfig(db, newId);
    if (config) loadConfigIntoScene(config);
  }, [db, selectedSetupId, selectedFairId, clearSceneState, loadConfigIntoScene]);

  const deleteCurrentSetup = useCallback(async () => {
    if (!selectedSetupId || !selectedFairId) return;
    await deleteSetup(db, selectedSetupId);
    clearSceneState();
    setSelectedSetupId(null);
    const fairSetups = await listSetups(db, selectedFairId);
    setSetups(fairSetups);
  }, [db, selectedSetupId, selectedFairId, clearSceneState]);

  const saveCurrentConfig = useCallback(async () => {
    if (!selectedSetupId) return;

    const doc: StandDocument = {
      walls: walls.map(w => ({
        ...w,
        position: wallTransforms.current[w.id]?.position ?? { x: 0, y: 0, z: 0 },
        rotation: wallTransforms.current[w.id]?.rotation ?? { x: 0, y: 0, z: 0 },
      })),
      artworks: placedArtworks,
      lamps: placedLamps,
      lampTypeDefaults: Object.keys(lampTypeDefaults).length > 0 ? lampTypeDefaults : undefined,
    };
    await saveStandConfig(db, selectedSetupId, doc);
    setHasUnsavedChanges(false);
    // Refresh setups list to update timestamps
    if (selectedFairId) {
      const fairSetups = await listSetups(db, selectedFairId);
      setSetups(fairSetups);
    }
  }, [db, selectedSetupId, selectedFairId, walls, placedArtworks, placedLamps, lampTypeDefaults]);

  const registerWebView = useCallback((ref: WebView | null) => {
    webViewRef.current = ref;
  }, []);

  const registerIframe = useCallback((ref: HTMLIFrameElement | null) => {
    iframeRef.current = ref;
  }, []);

  return (
    <StandEditorCtx.Provider value={{
      walls,
      selectedWallId,
      snapEnabled,
      snapDegrees,
      sceneReady,
      editorMode,
      toggleEditorMode,
      snapSuggestion,
      setSnapSuggestion,
      confirmSnapSuggestion,
      dismissSnapSuggestion,
      canUndo: history.length > 0,
      canRedo: redoStack.length > 0,
      selectedFairId,
      selectedSetupId,
      setups,
      selectFair,
      selectSetup,
      createNewSetup,
      renameCurrentSetup,
      duplicateCurrentSetup,
      deleteCurrentSetup,
      saveCurrentConfig,
      hasUnsavedChanges,
      replayTransforms,
      artworkPanelVisible: artworkPanelVisible && editorMode === 'build',
      toggleArtworkPanel,
      devToolsVisible: devToolsVisible && editorMode === 'build',
      toggleDevTools,
      placedArtworks,
      pendingArtworkId,
      selectedArtworkId,
      setPendingArtwork,
      handleWallTapped,
      handleArtworkPlaced,
      removeSelectedArtwork,
      setSelectedArtworkId,
      handleArtworkMoved,
      placedLamps,
      selectedLampId,
      setSelectedLampId,
      lampPlacementMode,
      setLampPlacementMode,
      addLampForArtwork,
      removeSelectedLamp,
      handleLampMoved,
      handleLampTargetMoved,
      lampRuntimeState,
      setLampRuntimeState,
      lampTypeDefaults,
      setLampTypeDefault,
      applyDefaultsToAllLamps,
      addWall,
      removeSelectedWall,
      wallHasContent,
      updateWallDimension,
      handleWallMoved,
      undo,
      redo,
      toggleSnap,
      updateSnapDegrees,
      sendMessage,
      setSelectedWallId,
      setSceneReady,
      registerWebView,
      registerIframe,
    }}>
      {children}
    </StandEditorCtx.Provider>
  );
}

export function useStandEditor() {
  const ctx = useContext(StandEditorCtx);
  if (!ctx) throw new Error('useStandEditor must be used within StandEditorProvider');
  return ctx;
}
