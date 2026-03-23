import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { WebViewToAppMessage } from '@/src/domains/stand/types';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

import { useStandEditor } from './StandEditorContext';

import sceneHtml from '@/src/domains/stand/webview/scene.html';

export function StandScreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();

  const { walls, sceneReady, snapEnabled, snapDegrees, editorMode, selectedWallId, addWall, removeSelectedWall, setSceneReady, sendMessage, setSelectedWallId, setSnapSuggestion, handleWallMoved, registerWebView, registerIframe } = useStandEditor();

  useEffect(() => {
    let cancelled = false;

    async function loadAsset() {
      try {
        if (Platform.OS === 'web') {
          const asset = Asset.fromModule(sceneHtml);
          if (!cancelled) setHtmlUri(asset.uri);
        } else {
          const [asset] = await Asset.loadAsync(sceneHtml);
          if (!cancelled) setHtmlUri(asset.localUri ?? asset.uri);
        }
      } catch {
        if (!cancelled) setError('Kon de 3D scene niet laden.');
      }
    }

    loadAsset();
    return () => { cancelled = true; };
  }, []);

  // Register iframe ref for context's sendMessage
  useEffect(() => {
    if (Platform.OS === 'web') {
      registerIframe(iframeRef.current);
    }
  }, [htmlUri, registerIframe]);

  // Replay state naar WebView na (re)mount
  const replayState = useCallback(() => {
    walls.forEach(wall => sendMessage({ type: 'addWall', wall }));
    if (snapEnabled) {
      sendMessage({ type: 'setRotationSnap', enabled: true, degrees: snapDegrees });
    }
    if (editorMode !== 'build') {
      sendMessage({ type: 'setEditorMode', mode: editorMode });
    }
  }, [walls, snapEnabled, snapDegrees, editorMode, sendMessage]);

  const handleIncomingMessage = useCallback((data: WebViewToAppMessage) => {
    if (data.type === 'sceneReady') {
      setSceneReady(true);
      sendMessage({ type: 'ping' });
      replayState();
    }
    if (data.type === 'pong') {
      console.log('Bridge werkt: pong ontvangen');
    }
    if (data.type === 'error') {
      console.error('WebView error:', data.message);
      setError(data.message);
    }
    if (data.type === 'wallSelected') {
      setSelectedWallId(data.wallId);
    }
    if (data.type === 'snapSuggestion') {
      setSnapSuggestion(data.suggestion);
    }
    if (data.type === 'wallMoved') {
      handleWallMoved(data.wallId, data.oldPosition, data.newPosition, data.oldRotation, data.newRotation);
    }
  }, [sendMessage, setSceneReady, setSelectedWallId, setSnapSuggestion, handleWallMoved, replayState]);

  // Web: luister naar postMessage van iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function handler(event: MessageEvent) {
      let data: WebViewToAppMessage;
      try {
        data = JSON.parse(event.data) as WebViewToAppMessage;
      } catch {
        return;
      }
      handleIncomingMessage(data);
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [handleIncomingMessage]);

  function handleMessage(event: WebViewMessageEvent) {
    let data: WebViewToAppMessage;
    try {
      data = JSON.parse(event.nativeEvent.data) as WebViewToAppMessage;
    } catch {
      return;
    }
    handleIncomingMessage(data);
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!htmlUri) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={styles.loadingText}>Scene laden...</Text>
      </View>
    );
  }

  // Compacte phone toolbar (alleen als sidebar niet beschikbaar is)
  const phoneToolbar = !isTablet && sceneReady ? (
    <View style={[styles.phoneToolbar, { top: Math.max(12, insets.top + 4) }]}>
      <Pressable style={styles.phoneButton} onPress={addWall}>
        <Text style={styles.phoneButtonText}>+ Wand</Text>
      </Pressable>
      {selectedWallId && (
        <Pressable style={styles.phoneDeleteButton} onPress={removeSelectedWall}>
          <Text style={styles.phoneDeleteText}>Verwijder</Text>
        </Pressable>
      )}
    </View>
  ) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          ref={iframeRef as React.RefObject<HTMLIFrameElement>}
          src={htmlUri}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as unknown as object}
        />
        {!sceneReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={styles.loadingText}>3D scene laden...</Text>
          </View>
        )}
        {phoneToolbar}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={(ref) => registerWebView(ref)}
        source={{ uri: htmlUri }}
        onMessage={handleMessage}
        onError={() => setError('Er ging iets mis bij het laden van de 3D scene.')}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        originWhitelist={['*']}
      />
      {!sceneReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={palette.accent} />
          <Text style={styles.loadingText}>3D scene laden...</Text>
        </View>
      )}
      {phoneToolbar}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: palette.mutedText,
  },
  errorText: {
    fontSize: 15,
    color: palette.danger,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  phoneToolbar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  phoneButton: {
    backgroundColor: palette.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  phoneButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneDeleteButton: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.danger,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  phoneDeleteText: {
    color: palette.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
