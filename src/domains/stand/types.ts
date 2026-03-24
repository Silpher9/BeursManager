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

export type EditorMode = 'build' | 'view';

export type AppToWebViewMessage =
  | { type: 'ping' }
  | { type: 'addWall'; wall: WallConfig }
  | { type: 'removeWall'; wallId: string }
  | { type: 'updateWall'; wallId: string; width: number; height: number; depth: number }
  | { type: 'setRotationSnap'; enabled: boolean; degrees: number }
  | { type: 'confirmSnap'; wallId: string; position: Vec3; rotation: Vec3 }
  | { type: 'dismissSnap' }
  | { type: 'setEditorMode'; mode: EditorMode }
  | { type: 'setWallTransform'; wallId: string; position: Vec3; rotation: Vec3 }
  | { type: 'placeArtwork'; artworkId: string; wallId: string; position: Vec3; hitNormal: Vec3; heightCm: number; widthCm: number; imageUri: string }
  | { type: 'removeArtwork'; artworkId: string };

export type WebViewToAppMessage =
  | { type: 'pong' }
  | { type: 'sceneReady' }
  | { type: 'error'; message: string }
  | { type: 'wallSelected'; wallId: string | null }
  | { type: 'snapSuggestion'; suggestion: SnapSuggestion | null }
  | { type: 'wallMoved'; wallId: string; oldPosition: Vec3; newPosition: Vec3; oldRotation: Vec3; newRotation: Vec3 }
  | { type: 'wallTapped'; wallId: string; hitPoint: Vec3; hitNormal: Vec3 }
  | { type: 'artworkSelected'; artworkId: string | null };

// --- Placed Artwork ---

export type PlacedArtwork = {
  artworkId: string;
  wallId: string;
  position: Vec3;
  hitNormal: Vec3;
  heightCm: number;
  widthCm: number;
  imageUri: string;
};

// --- Command / History ---

export type EditorCommand =
  | { kind: 'addWall'; wall: WallConfig }
  | { kind: 'removeWall'; wall: WallConfig; position: Vec3; rotation: Vec3 }
  | { kind: 'moveWall'; wallId: string; oldPosition: Vec3; newPosition: Vec3; oldRotation: Vec3; newRotation: Vec3 }
  | { kind: 'resizeWall'; wallId: string; oldWidth: number; oldHeight: number; oldDepth: number; newWidth: number; newHeight: number; newDepth: number }
  | { kind: 'snapWall'; wallId: string; oldPosition: Vec3; newPosition: Vec3; oldRotation: Vec3; newRotation: Vec3 }
  | { kind: 'placeArtwork'; artwork: PlacedArtwork }
  | { kind: 'removeArtwork'; artwork: PlacedArtwork };
