import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import type { WebView } from 'react-native-webview';

import type { AppToWebViewMessage, EditorMode, SnapSuggestion, WallConfig } from './types';

type StandEditorState = {
  walls: WallConfig[];
  selectedWallId: string | null;
  snapEnabled: boolean;
  snapDegrees: number;
  sceneReady: boolean;
  editorMode: EditorMode;
  toggleEditorMode: () => void;
  snapSuggestion: SnapSuggestion | null;
  setSnapSuggestion: (suggestion: SnapSuggestion | null) => void;
  confirmSnapSuggestion: () => void;
  dismissSnapSuggestion: () => void;
  addWall: () => void;
  removeSelectedWall: () => void;
  updateWallDimension: (wallId: string, field: 'width' | 'height' | 'depth', value: string) => void;
  toggleSnap: (enabled: boolean) => void;
  updateSnapDegrees: (value: string) => void;
  sendMessage: (message: AppToWebViewMessage) => void;
  setSelectedWallId: (id: string | null) => void;
  setSceneReady: (ready: boolean) => void;
  registerWebView: (ref: WebView | null) => void;
  registerIframe: (ref: HTMLIFrameElement | null) => void;
};

const StandEditorCtx = createContext<StandEditorState | null>(null);

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

  const sendMessage = useCallback((message: AppToWebViewMessage) => {
    const json = JSON.stringify(message);
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(json, '*');
    } else {
      webViewRef.current?.postMessage(json);
    }
  }, []);

  const addWall = useCallback(() => {
    wallCounter++;
    const wall: WallConfig = {
      id: `wall-${wallCounter}`,
      width: 300,
      height: 250,
      depth: 10,
    };
    setWalls(prev => [...prev, wall]);
    sendMessage({ type: 'addWall', wall });
  }, [sendMessage]);

  const removeSelectedWall = useCallback(() => {
    setSelectedWallId(current => {
      if (!current) return null;
      sendMessage({ type: 'removeWall', wallId: current });
      setWalls(prev => prev.filter(w => w.id !== current));
      return null;
    });
  }, [sendMessage]);

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
      return prev.map(w => w.id === wallId ? updated : w);
    });
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
    sendMessage({
      type: 'confirmSnap',
      wallId: snapSuggestion.wallId,
      position: snapSuggestion.candidatePosition,
      rotation: snapSuggestion.candidateRotation,
    });
    setSnapSuggestion(null);
  }, [snapSuggestion, sendMessage]);

  const dismissSnapSuggestion = useCallback(() => {
    setSnapSuggestion(null);
    sendMessage({ type: 'dismissSnap' });
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
      addWall,
      removeSelectedWall,
      updateWallDimension,
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
