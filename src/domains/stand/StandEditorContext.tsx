import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import type { WebView } from 'react-native-webview';

import type { AppToWebViewMessage, EditorCommand, EditorMode, SnapSuggestion, Vec3, WallConfig } from './types';

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
  toggleEditorMode: () => void;
  setSnapSuggestion: (suggestion: SnapSuggestion | null) => void;
  confirmSnapSuggestion: () => void;
  dismissSnapSuggestion: () => void;
  addWall: () => void;
  removeSelectedWall: () => void;
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

export function StandEditorProvider({ children }: { children: ReactNode }) {
  const webViewRef = useRef<WebView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [walls, setWalls] = useState<WallConfig[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapDegrees, setSnapDegrees] = useState(15);
  const [sceneReady, setSceneReady] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('build');
  const [snapSuggestion, setSnapSuggestion] = useState<SnapSuggestion | null>(null);

  // Command history
  const [history, setHistory] = useState<EditorCommand[]>([]);
  const [redoStack, setRedoStack] = useState<EditorCommand[]>([]);
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
          sendMessage({ type: 'removeWall', wallId: current });
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

  const updateWallDimension = useCallback((wallId: string, field: 'width' | 'height' | 'depth', value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 1000) return;

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
  }, [sendMessage, pushCommand]);

  const handleWallMoved = useCallback((wallId: string, oldPos: Vec3, newPos: Vec3, oldRot: Vec3, newRot: Vec3) => {
    wallTransforms.current[wallId] = { position: newPos, rotation: newRot };
    pushCommand({ kind: 'moveWall', wallId, oldPosition: oldPos, newPosition: newPos, oldRotation: oldRot, newRotation: newRot });
  }, [pushCommand]);

  // --- Undo / Redo ---

  const undo = useCallback(() => {
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
      }

      setRedoStack(r => [...r, cmd]);
      return rest;
    });
  }, [sendMessage]);

  const redo = useCallback(() => {
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
      addWall,
      removeSelectedWall,
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
