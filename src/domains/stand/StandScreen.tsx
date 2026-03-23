import { Asset } from 'expo-asset';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { AppToWebViewMessage, WebViewToAppMessage } from '@/src/domains/stand/types';
import { palette } from '@/src/shared/theme/colors';

import sceneHtml from '@/src/domains/stand/webview/scene.html';

export function StandScreen() {
  const webViewRef = useRef<WebView>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAsset() {
      try {
        if (Platform.OS === 'web') {
          // Op web is de asset al een URL
          const asset = Asset.fromModule(sceneHtml);
          if (!cancelled) setHtmlUri(asset.uri);
        } else {
          // Op native moet de asset gedownload worden
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

  // Web: luister naar postMessage van iframe vóór het iframe geladen is
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function handler(event: MessageEvent) {
      let data: WebViewToAppMessage;
      try {
        data = JSON.parse(event.data) as WebViewToAppMessage;
      } catch {
        return;
      }
      if (data.type === 'sceneReady') {
        setSceneReady(true);
      }
      if (data.type === 'pong') {
        console.log('Bridge werkt: pong ontvangen');
      }
      if (data.type === 'error') {
        console.error('WebView error:', data.message);
        setError(data.message);
      }
    }

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  function handleMessage(event: WebViewMessageEvent) {
    let data: WebViewToAppMessage;
    try {
      data = JSON.parse(event.nativeEvent.data) as WebViewToAppMessage;
    } catch {
      return;
    }

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
  }

  function sendMessage(message: AppToWebViewMessage) {
    webViewRef.current?.postMessage(JSON.stringify(message));
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

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
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
    );
  }

  return (
    <View style={styles.container}>
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
});
