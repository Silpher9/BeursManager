export type AppToWebViewMessage = { type: 'ping' };

export type WebViewToAppMessage = { type: 'pong' } | { type: 'sceneReady' } | { type: 'error'; message: string };
