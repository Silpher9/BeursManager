import { Asset } from 'expo-asset';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { listFairs } from '@/src/domains/fairs/repository';
import type { FairListItem } from '@/src/domains/fairs/types';
import type { WebViewToAppMessage } from '@/src/domains/stand/types';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

import { ArtworkBrowserPanel } from './ArtworkBrowserPanel';
import { useStandEditor } from './StandEditorContext';

import sceneHtml from '@/src/domains/stand/webview/scene.html';

export function StandScreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlUri, setHtmlUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [fairs, setFairs] = useState<FairListItem[]>([]);

  const { walls, sceneReady, snapEnabled, snapDegrees, editorMode, selectedFairId, selectedWallId, artworkPanelVisible, placedArtworks, addWall, removeSelectedWall, selectFair, setSceneReady, sendMessage, setSelectedWallId, setSnapSuggestion, handleWallMoved, handleWallTapped, handleArtworkPlaced, handleArtworkMoved, setSelectedArtworkId, replayTransforms, registerWebView, registerIframe } = useStandEditor();

  // Fetch fairs for selection gate
  useEffect(() => {
    listFairs(db).then(setFairs);
  }, [db]);

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
    replayTransforms();
    if (snapEnabled) {
      sendMessage({ type: 'setRotationSnap', enabled: true, degrees: snapDegrees });
    }
    if (editorMode !== 'build') {
      sendMessage({ type: 'setEditorMode', mode: editorMode });
    }
    // Replay placed artworks
    placedArtworks.forEach(a => {
      sendMessage({ type: 'placeArtwork', artworkId: a.artworkId, wallId: a.wallId, position: a.position, hitNormal: a.hitNormal, heightCm: a.heightCm, widthCm: a.widthCm, imageUri: a.imageUri, isLocal: true });
    });
  }, [walls, snapEnabled, snapDegrees, editorMode, placedArtworks, sendMessage, replayTransforms]);

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
    if (data.type === 'wallTapped') {
      handleWallTapped(data.wallId, data.hitPoint, data.hitNormal);
    }
    if (data.type === 'artworkPlaced') {
      handleArtworkPlaced(data.artworkId, data.wallId, data.localPosition);
    }
    if (data.type === 'artworkSelected') {
      setSelectedArtworkId(data.artworkId);
    }
    if (data.type === 'artworkMoved') {
      handleArtworkMoved(data.artworkId, data.oldLocalPosition, data.newLocalPosition);
    }
  }, [sendMessage, setSceneReady, setSelectedWallId, setSnapSuggestion, handleWallMoved, handleWallTapped, handleArtworkPlaced, handleArtworkMoved, setSelectedArtworkId, replayState]);

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

  // Fair selection gate — must choose a fair before entering the editor
  if (!selectedFairId) {
    return (
      <View style={[styles.fairGate, { paddingTop: Math.max(32, insets.top + 16) }]}>
        <Text style={styles.fairGateTitle}>Stand Configurator</Text>
        <Text style={styles.fairGateSubtitle}>Kies een beurs om te beginnen</Text>
        <FlatList
          data={fairs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.fairGateList}
          renderItem={({ item }) => (
            <Pressable style={styles.fairGateItem} onPress={() => selectFair(item.id)}>
              <Text style={styles.fairGateItemName}>{item.name}</Text>
              {item.location && <Text style={styles.fairGateItemDetail}>{item.location}</Text>}
              {item.startDate && item.endDate && (
                <Text style={styles.fairGateItemDetail}>{item.startDate} — {item.endDate}</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.fairGateEmpty}>Geen beurzen gevonden. Maak eerst een beurs aan via Beurzen.</Text>
          }
        />
      </View>
    );
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

  const artworkPanel = artworkPanelVisible && selectedFairId ? (
    <View style={[styles.artworkPanelContainer, { bottom: Math.max(16, insets.bottom + 8), left: isTablet ? Math.max(16, insets.left + 8) : 16, right: Math.max(16, insets.right + 8) }]}>
      <ArtworkBrowserPanel fairId={selectedFairId} docked={isTablet} />
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
        {artworkPanel}
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
      {artworkPanel}
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
  fairGate: {
    flex: 1,
    backgroundColor: palette.background,
    paddingHorizontal: 32,
  },
  fairGateTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  fairGateSubtitle: {
    fontSize: 16,
    color: palette.mutedText,
    marginBottom: 24,
  },
  fairGateList: {
    gap: 12,
  },
  fairGateItem: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  fairGateItemName: {
    fontSize: 17,
    fontWeight: '600',
    color: palette.text,
  },
  fairGateItemDetail: {
    fontSize: 14,
    color: palette.mutedText,
  },
  fairGateEmpty: {
    fontSize: 15,
    color: palette.mutedText,
    textAlign: 'center',
    paddingVertical: 32,
  },
  artworkPanelContainer: {
    position: 'absolute',
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
