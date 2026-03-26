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
  | { type: 'placeArtwork'; artworkId: string; wallId: string; position: Vec3; hitNormal: Vec3; heightCm: number; widthCm: number; imageUri: string; isLocal?: boolean }
  | { type: 'removeArtwork'; artworkId: string }
  | { type: 'setArtworkPosition'; artworkId: string; localPosition: Vec3 }
  | { type: 'addLamp'; lamp: PlacedLamp }
  | { type: 'removeLamp'; lampId: string }
  | { type: 'setLampPosition'; lampId: string; position: Vec3 }
  | { type: 'setLampTarget'; lampId: string; target: Vec3 };

export type WebViewToAppMessage =
  | { type: 'pong' }
  | { type: 'sceneReady' }
  | { type: 'error'; message: string }
  | { type: 'wallSelected'; wallId: string | null }
  | { type: 'snapSuggestion'; suggestion: SnapSuggestion | null }
  | { type: 'wallMoved'; wallId: string; oldPosition: Vec3; newPosition: Vec3; oldRotation: Vec3; newRotation: Vec3 }
  | { type: 'wallTapped'; wallId: string; hitPoint: Vec3; hitNormal: Vec3 }
  | { type: 'artworkSelected'; artworkId: string | null }
  | { type: 'artworkPlaced'; artworkId: string; wallId: string; localPosition: Vec3 }
  | { type: 'artworkMoved'; artworkId: string; oldLocalPosition: Vec3; newLocalPosition: Vec3 }
  | { type: 'lampSelected'; lampId: string | null }
  | { type: 'lampMoved'; lampId: string; oldPosition: Vec3; newPosition: Vec3 }
  | { type: 'lampTargetMoved'; lampId: string; oldTarget: Vec3; newTarget: Vec3 };

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

// --- Placed Lamp ---

export type PlacedLamp = {
  id: string;
  type: 'spot';
  artworkId: string;
  wallId: string;
  position: Vec3;     // lamp position (wall-local, on rail above artwork)
  target: Vec3;       // target position (wall-local, on wall surface)
};

// --- Command / History ---

export type EditorCommand =
  | { kind: 'addWall'; wall: WallConfig }
  | { kind: 'removeWall'; wall: WallConfig; position: Vec3; rotation: Vec3 }
  | { kind: 'moveWall'; wallId: string; oldPosition: Vec3; newPosition: Vec3; oldRotation: Vec3; newRotation: Vec3 }
  | { kind: 'resizeWall'; wallId: string; oldWidth: number; oldHeight: number; oldDepth: number; newWidth: number; newHeight: number; newDepth: number }
  | { kind: 'snapWall'; wallId: string; oldPosition: Vec3; newPosition: Vec3; oldRotation: Vec3; newRotation: Vec3 }
  | { kind: 'placeArtwork'; artwork: PlacedArtwork }
  | { kind: 'removeArtwork'; artwork: PlacedArtwork }
  | { kind: 'moveArtwork'; artworkId: string; oldPosition: Vec3; newPosition: Vec3 }
  | { kind: 'addLamp'; lamp: PlacedLamp }
  | { kind: 'removeLamp'; lamp: PlacedLamp }
  | { kind: 'moveLamp'; lampId: string; oldPosition: Vec3; newPosition: Vec3 }
  | { kind: 'moveLampTarget'; lampId: string; oldTarget: Vec3; newTarget: Vec3 };
