export type WallConfig = {
  id: string;
  width: number;   // cm
  height: number;  // cm
  depth: number;   // cm
};

export type Vec3 = { x: number; y: number; z: number };

export type SnapSuggestion = {
  wallId: string;
  targetWallId: string;
  kind: 'edge_align_perpendicular';
  candidatePosition: Vec3;
  candidateRotation: Vec3;
};

export type AppToWebViewMessage =
  | { type: 'ping' }
  | { type: 'addWall'; wall: WallConfig }
  | { type: 'removeWall'; wallId: string }
  | { type: 'updateWall'; wallId: string; width: number; height: number; depth: number }
  | { type: 'setRotationSnap'; enabled: boolean; degrees: number }
  | { type: 'confirmSnap'; wallId: string; position: Vec3; rotation: Vec3 }
  | { type: 'dismissSnap' }
  | { type: 'setEditorMode'; mode: EditorMode };

export type EditorMode = 'build' | 'view';

export type WebViewToAppMessage =
  | { type: 'pong' }
  | { type: 'sceneReady' }
  | { type: 'error'; message: string }
  | { type: 'wallSelected'; wallId: string | null }
  | { type: 'snapSuggestion'; suggestion: SnapSuggestion | null };
