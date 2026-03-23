export type WallConfig = {
  id: string;
  width: number;  // cm
  height: number; // cm
};

export type AppToWebViewMessage =
  | { type: 'ping' }
  | { type: 'addWall'; wall: WallConfig }
  | { type: 'removeWall'; wallId: string }
  | { type: 'updateWall'; wallId: string; width: number; height: number };

export type WebViewToAppMessage =
  | { type: 'pong' }
  | { type: 'sceneReady' }
  | { type: 'error'; message: string }
  | { type: 'wallSelected'; wallId: string | null };
