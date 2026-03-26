import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { listFairs } from '@/src/domains/fairs/repository';
import type { FairListItem } from '@/src/domains/fairs/types';

import { useStandEditor } from './StandEditorContext';

const SIDEBAR_BG = '#3A2E22';
const ACTIVE_TINT = '#FFFDF9';
const INACTIVE_TINT = '#D8C5AB';
const ACCENT = '#8A6A45';

export function StandEditorSidebar({ onBack }: { onBack: () => void }) {
  const {
    walls,
    selectedWallId,
    snapEnabled,
    snapDegrees,
    sceneReady,
    snapSuggestion,
    editorMode,
    toggleEditorMode,
    canUndo,
    canRedo,
    undo,
    redo,
    addWall,
    removeSelectedWall,
    updateWallDimension,
    toggleSnap,
    updateSnapDegrees,
    confirmSnapSuggestion,
    dismissSnapSuggestion,
    artworkPanelVisible,
    toggleArtworkPanel,
    selectedArtworkId,
    removeSelectedArtwork,
    selectedLampId,
    lampPlacementMode,
    setLampPlacementMode,
    removeSelectedLamp,
    devToolsVisible,
    toggleDevTools,
    selectedFairId,
    selectFair,
    saveCurrentConfig,
    hasUnsavedChanges,
  } = useStandEditor();

  const db = useSQLiteContext();
  const [fairs, setFairs] = useState<FairListItem[]>([]);

  useEffect(() => {
    listFairs(db).then(setFairs);
  }, [db]);

  const handleFairSelect = (fairId: string) => {
    if (fairId === selectedFairId) return;
    if (hasUnsavedChanges) {
      Alert.alert(
        'Niet-opgeslagen wijzigingen',
        'Je hebt niet-opgeslagen wijzigingen. Wil je wisselen zonder op te slaan?',
        [
          { text: 'Annuleer', style: 'cancel' },
          { text: 'Wisselen', style: 'destructive', onPress: () => selectFair(fairId) },
        ],
      );
      return;
    }
    selectFair(fairId);
  };

  const selectedWall = walls.find(w => w.id === selectedWallId);

  return (
    <View style={styles.container}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={styles.backText}>← Terug</Text>
      </Pressable>

      <View style={styles.separator} />

      <Text style={styles.sectionTitle}>Stand Editor</Text>


      {sceneReady && (
        <Pressable
          style={[styles.modeToggle, editorMode === 'view' && styles.modeToggleActive]}
          onPress={toggleEditorMode}
        >
          <Text style={styles.modeToggleText}>
            {editorMode === 'build' ? '👁 View mode' : '🔧 Build mode'}
          </Text>
        </Pressable>
      )}

      {sceneReady && editorMode === 'build' && (
        <>
          <View style={styles.undoRedoRow}>
            <Pressable
              style={[styles.undoRedoButton, !canUndo && styles.undoRedoDisabled]}
              onPress={undo}
              disabled={!canUndo}
            >
              <Text style={[styles.undoRedoText, !canUndo && styles.undoRedoTextDisabled]}>Undo</Text>
            </Pressable>
            <Pressable
              style={[styles.undoRedoButton, !canRedo && styles.undoRedoDisabled]}
              onPress={redo}
              disabled={!canRedo}
            >
              <Text style={[styles.undoRedoText, !canRedo && styles.undoRedoTextDisabled]}>Redo</Text>
            </Pressable>
          </View>

          <Pressable style={styles.addButton} onPress={addWall}>
            <Text style={styles.addButtonText}>+ Wand toevoegen</Text>
          </Pressable>

          {walls.length > 0 && (
            <View style={styles.wallList}>
              <Text style={styles.label}>Wanden ({walls.length})</Text>
            </View>
          )}

          {selectedWall && (
            <View key={selectedWall.id} style={styles.editorSection}>
              <Text style={styles.label}>Geselecteerd</Text>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Breedte</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  defaultValue={String(selectedWall.width)}
                  onEndEditing={(e) => updateWallDimension(selectedWall.id, 'width', e.nativeEvent.text)}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Hoogte</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  defaultValue={String(selectedWall.height)}
                  onEndEditing={(e) => updateWallDimension(selectedWall.id, 'height', e.nativeEvent.text)}
                />
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Dikte</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  defaultValue={String(selectedWall.depth)}
                  onEndEditing={(e) => updateWallDimension(selectedWall.id, 'depth', e.nativeEvent.text)}
                />
              </View>

              <Text style={styles.unitHint}>cm</Text>

              <Pressable style={styles.deleteButton} onPress={removeSelectedWall}>
                <Text style={styles.deleteButtonText}>Verwijder wand</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.separator} />

          <View style={styles.snapSection}>
            <View style={styles.snapRow}>
              <Text style={styles.label}>Rotatie snap</Text>
              <Switch
                value={snapEnabled}
                onValueChange={toggleSnap}
                trackColor={{ true: ACCENT }}
              />
            </View>
            {snapEnabled && (
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Graden</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="numeric"
                  defaultValue={String(snapDegrees)}
                  onEndEditing={(e) => updateSnapDegrees(e.nativeEvent.text)}
                />
              </View>
            )}
          </View>

          <View style={styles.separator} />

          <Pressable
            style={[styles.artworkToggle, artworkPanelVisible && styles.artworkToggleActive]}
            onPress={toggleArtworkPanel}
          >
            <Text style={styles.artworkToggleText}>
              {artworkPanelVisible ? 'Kunstwerken verbergen' : 'Kunstwerken tonen'}
            </Text>
          </Pressable>

          {selectedArtworkId && (
            <Pressable style={styles.deleteButton} onPress={removeSelectedArtwork}>
              <Text style={styles.deleteButtonText}>Verwijder kunstwerk</Text>
            </Pressable>
          )}

          <View style={styles.separator} />

          <Pressable
            style={[styles.addButton, lampPlacementMode && styles.artworkToggleActive]}
            onPress={() => {
              setLampPlacementMode(!lampPlacementMode);
            }}
          >
            <Text style={styles.addButtonText}>
              {lampPlacementMode ? 'Klik op kunstwerk...' : '+ Spot lamp'}
            </Text>
          </Pressable>

          {selectedLampId && (
            <Pressable style={styles.deleteButton} onPress={removeSelectedLamp}>
              <Text style={styles.deleteButtonText}>Verwijder lamp</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.artworkToggle, devToolsVisible && styles.artworkToggleActive]}
            onPress={toggleDevTools}
          >
            <Text style={styles.artworkToggleText}>
              {devToolsVisible ? 'Dev Tools verbergen' : 'Dev Tools'}
            </Text>
          </Pressable>

          {snapSuggestion && (
            <>
              <View style={styles.separator} />
              <View style={styles.snapSuggestionCard}>
                <Text style={styles.snapSuggestionTitle}>Snap beschikbaar</Text>
                <Text style={styles.snapSuggestionText}>
                  Wand uitlijnen met aangrenzende wand?
                </Text>
                <View style={styles.snapSuggestionActions}>
                  <Pressable style={styles.snapAcceptButton} onPress={confirmSnapSuggestion}>
                    <Text style={styles.snapAcceptText}>Snap</Text>
                  </Pressable>
                  <Pressable style={styles.snapDismissButton} onPress={dismissSnapSuggestion}>
                    <Text style={styles.snapDismissText}>Negeer</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </>
      )}

      {/* Beurs-selectie onderaan, vaste hoogte */}
      <View style={styles.fairSection}>
        <View style={styles.separator} />
        <Text style={styles.label}>Beurs</Text>
        <ScrollView style={styles.fairList} nestedScrollEnabled>
          {fairs.map(fair => (
            <Pressable
              key={fair.id}
              style={[styles.fairItem, selectedFairId === fair.id && styles.fairItemActive]}
              onPress={() => handleFairSelect(fair.id)}
            >
              <Text style={[styles.fairItemText, selectedFairId === fair.id && styles.fairItemTextActive]} numberOfLines={1}>
                {fair.name}
              </Text>
            </Pressable>
          ))}
          {fairs.length === 0 && (
            <Text style={styles.fairEmptyText}>Geen beurzen gevonden</Text>
          )}
        </ScrollView>
        {selectedFairId && (
          <Pressable style={styles.saveButton} onPress={saveCurrentConfig}>
            <Text style={styles.saveButtonText}>
              {hasUnsavedChanges ? 'Opslaan *' : 'Opslaan'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backText: {
    color: INACTIVE_TINT,
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 253, 249, 0.1)',
    marginHorizontal: 4,
    marginVertical: 4,
  },
  sectionTitle: {
    color: ACTIVE_TINT,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  addButton: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  wallList: {
    paddingHorizontal: 4,
  },
  label: {
    color: INACTIVE_TINT,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editorSection: {
    backgroundColor: 'rgba(255, 253, 249, 0.06)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    color: INACTIVE_TINT,
    fontSize: 13,
  },
  fieldInput: {
    backgroundColor: 'rgba(255, 253, 249, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: 70,
    fontSize: 14,
    color: ACTIVE_TINT,
    textAlign: 'right',
  },
  unitHint: {
    color: 'rgba(255, 253, 249, 0.4)',
    fontSize: 11,
    textAlign: 'right',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#e05555',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  deleteButtonText: {
    color: '#e05555',
    fontSize: 13,
    fontWeight: '600',
  },
  snapSection: {
    gap: 6,
  },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  fairSection: {
    marginTop: 'auto' as unknown as number,
    marginBottom: 4,
    gap: 8,
  },
  fairList: {
    maxHeight: 120,
  },
  fairItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  fairItemActive: {
    backgroundColor: 'rgba(255, 253, 249, 0.12)',
  },
  fairItemText: {
    color: INACTIVE_TINT,
    fontSize: 13,
  },
  fairItemTextActive: {
    color: ACTIVE_TINT,
    fontWeight: '700',
  },
  fairEmptyText: {
    color: 'rgba(255, 253, 249, 0.3)',
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  saveRow: {
    flexDirection: 'row',
  },
  saveButton: {
    backgroundColor: ACCENT,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  undoRedoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  undoRedoButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 253, 249, 0.08)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  undoRedoDisabled: {
    opacity: 0.3,
  },
  undoRedoText: {
    color: INACTIVE_TINT,
    fontSize: 13,
    fontWeight: '600',
  },
  undoRedoTextDisabled: {
    color: INACTIVE_TINT,
  },
  artworkToggle: {
    backgroundColor: 'rgba(255, 253, 249, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  artworkToggleActive: {
    backgroundColor: ACCENT,
  },
  artworkToggleText: {
    color: INACTIVE_TINT,
    fontSize: 13,
    fontWeight: '600',
  },
  modeToggle: {
    backgroundColor: 'rgba(255, 253, 249, 0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeToggleActive: {
    backgroundColor: 'rgba(64, 156, 255, 0.15)',
  },
  modeToggleText: {
    color: INACTIVE_TINT,
    fontSize: 13,
    fontWeight: '600',
  },
  snapSuggestionCard: {
    backgroundColor: 'rgba(64, 156, 255, 0.15)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  snapSuggestionTitle: {
    color: '#6CB4FF',
    fontSize: 13,
    fontWeight: '700',
  },
  snapSuggestionText: {
    color: INACTIVE_TINT,
    fontSize: 12,
  },
  snapSuggestionActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  snapAcceptButton: {
    flex: 1,
    backgroundColor: '#409CFF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  snapAcceptText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  snapDismissButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 253, 249, 0.08)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  snapDismissText: {
    color: INACTIVE_TINT,
    fontSize: 13,
    fontWeight: '500',
  },
});
