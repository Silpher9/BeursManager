import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { AppToWebViewMessage, WallConfig, WebViewToAppMessage } from '@/src/domains/stand/types';
import { palette } from '@/src/shared/theme/colors';

import sceneHtml from '@/src/domains/stand/webview/scene.html';

let wallCounter = 0;

export function StandScreen() {
  const webViewRef = useRef<WebView>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walls, setWalls] = useState<WallConfig[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);

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

  const sendMessage = useCallback((message: AppToWebViewMessage) => {
    const json = JSON.stringify(message);
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(json, '*');
    } else {
      webViewRef.current?.postMessage(json);
    }
  }, []);

  const handleIncomingMessage = useCallback((data: WebViewToAppMessage) => {
    if (data.type === 'sceneReady') {
      setSceneReady(true);
      sendMessage({ type: 'ping' });
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
  }, [sendMessage]);

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

  function addWall() {
    wallCounter++;
    const wall: WallConfig = {
      id: `wall-${wallCounter}`,
      width: 300,
      height: 250,
    };
    setWalls(prev => [...prev, wall]);
    sendMessage({ type: 'addWall', wall });
  }

  function removeSelectedWall() {
    if (!selectedWallId) return;
    sendMessage({ type: 'removeWall', wallId: selectedWallId });
    setWalls(prev => prev.filter(w => w.id !== selectedWallId));
    setSelectedWallId(null);
  }

  function updateWallDimension(wallId: string, field: 'width' | 'height', value: string) {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 50 || num > 1000) return;

    setWalls(prev => prev.map(w => w.id === wallId ? { ...w, [field]: num } : w));
    const wall = walls.find(w => w.id === wallId);
    if (wall) {
      sendMessage({
        type: 'updateWall',
        wallId,
        width: field === 'width' ? num : wall.width,
        height: field === 'height' ? num : wall.height,
      });
    }
  }

  const selectedWall = walls.find(w => w.id === selectedWallId);

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

  const toolbar = sceneReady ? (
    <View style={styles.toolbar}>
      <View style={styles.toolbarRow}>
        <Pressable style={styles.button} onPress={addWall}>
          <Text style={styles.buttonText}>+ Wand</Text>
        </Pressable>
        {selectedWallId && (
          <Pressable style={[styles.button, styles.dangerButton]} onPress={removeSelectedWall}>
            <Text style={[styles.buttonText, styles.dangerText]}>Verwijder</Text>
          </Pressable>
        )}
      </View>
      {selectedWall && (
        <View key={selectedWall.id} style={styles.dimensionRow}>
          <Text style={styles.dimensionLabel}>Breedte (cm):</Text>
          <TextInput
            style={styles.dimensionInput}
            keyboardType="numeric"
            defaultValue={String(selectedWall.width)}
            onEndEditing={(e) => updateWallDimension(selectedWall.id, 'width', e.nativeEvent.text)}
          />
          <Text style={styles.dimensionLabel}>Hoogte (cm):</Text>
          <TextInput
            style={styles.dimensionInput}
            keyboardType="numeric"
            defaultValue={String(selectedWall.height)}
            onEndEditing={(e) => updateWallDimension(selectedWall.id, 'height', e.nativeEvent.text)}
          />
        </View>
      )}
    </View>
  ) : null;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {toolbar}
        <View style={styles.sceneContainer}>
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
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {toolbar}
      <View style={styles.sceneContainer}>
        <WebView
          ref={webViewRef}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  sceneContainer: {
    flex: 1,
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
  toolbar: {
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    backgroundColor: palette.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  dangerText: {
    color: palette.danger,
  },
  dimensionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimensionLabel: {
    fontSize: 13,
    color: palette.text,
  },
  dimensionInput: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 70,
    fontSize: 14,
    color: palette.text,
  },
});
