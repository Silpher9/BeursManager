import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

import { type StandArtworkItem, listFairArtworksForStand } from './repository';
import { useStandEditor } from './StandEditorContext';

const PANEL_BG = '#3A2E22';
const ACTIVE_TINT = '#FFFDF9';
const INACTIVE_TINT = '#D8C5AB';
const ACCENT = '#8A6A45';
const ERROR_COLOR = '#e05555';

type Props = {
  fairId: string;
  docked?: boolean;
};

function DropdownFilter({ label, value, options, onSelect }: {
  label: string;
  value: string | null;
  options: string[];
  onSelect: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  if (options.length === 0) return null;

  return (
    <View style={styles.dropdownContainer}>
      <Pressable style={styles.dropdownTrigger} onPress={() => setOpen(!open)}>
        <Text style={styles.dropdownLabel}>{label}:</Text>
        <Text style={styles.dropdownValue} numberOfLines={1}>{value ?? 'Alles'}</Text>
        <Text style={styles.dropdownArrow}>{open ? '\u25B2' : '\u25BC'}</Text>
      </Pressable>
      {open && (
        <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
          <Pressable style={styles.dropdownOption} onPress={() => { onSelect(null); setOpen(false); }}>
            <Text style={[styles.dropdownOptionText, !value && styles.dropdownOptionTextActive]}>Alles</Text>
          </Pressable>
          {options.map(opt => (
            <Pressable key={opt} style={styles.dropdownOption} onPress={() => { onSelect(opt); setOpen(false); }}>
              <Text style={[styles.dropdownOptionText, value === opt && styles.dropdownOptionTextActive]} numberOfLines={1}>{opt}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function ArtworkBrowserPanel({ fairId, docked }: Props) {
  const db = useSQLiteContext();
  const { placedArtworks, pendingArtworkId, setPendingArtwork } = useStandEditor();
  const [artworks, setArtworks] = useState<StandArtworkItem[]>([]);
  const [artistFilter, setArtistFilter] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);

  useEffect(() => {
    setArtistFilter(null);
    setSeriesFilter(null);
    listFairArtworksForStand(db, fairId).then(setArtworks);
  }, [db, fairId]);

  const artists = useMemo(() => {
    const names = new Set<string>();
    artworks.forEach(a => { if (a.artistName) names.add(a.artistName); });
    return Array.from(names).sort();
  }, [artworks]);

  const seriesList = useMemo(() => {
    const names = new Set<string>();
    artworks.forEach(a => { if (a.series) names.add(a.series); });
    return Array.from(names).sort();
  }, [artworks]);

  const filtered = useMemo(() => {
    let result = artworks;
    if (artistFilter) result = result.filter(a => a.artistName === artistFilter);
    if (seriesFilter) result = result.filter(a => a.series === seriesFilter);
    return result;
  }, [artworks, artistFilter, seriesFilter]);

  return (
    <View style={[styles.panel, docked && styles.panelDocked]}>
      <View style={styles.header}>
        <Text style={styles.title}>Kunstwerken ({filtered.length})</Text>
        <View style={styles.filterRow}>
          <DropdownFilter label="Kunstenaar" value={artistFilter} options={artists} onSelect={setArtistFilter} />
          <DropdownFilter label="Serie" value={seriesFilter} options={seriesList} onSelect={setSeriesFilter} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {artworks.length === 0 ? 'Geen werken aan deze beurs gekoppeld' : 'Geen werken voor dit filter'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.artworkGrid}
          style={styles.artworkScroll}
          renderItem={({ item }) => {
            const isPlaced = placedArtworks.some(a => a.artworkId === item.id);
            const isPending = pendingArtworkId === item.id;
            const canPlace = item.placeable && !isPlaced;

            return (
            <Pressable
              style={[styles.artworkCard, isPlaced && styles.artworkCardPlaced, isPending && styles.artworkCardPending]}
              onPress={async () => {
                if (!canPlace) return;
                if (isPending) {
                  setPendingArtwork(null);
                  return;
                }
                // Convert thumbnail to base64 data URI for WebView
                let imageUri = '';
                if (item.thumbnailPath && Platform.OS !== 'web') {
                  try {
                    const b64 = await readAsStringAsync(item.thumbnailPath, { encoding: EncodingType.Base64 });
                    imageUri = `data:image/jpeg;base64,${b64}`;
                  } catch {
                    imageUri = item.thumbnailPath;
                  }
                } else {
                  imageUri = item.thumbnailPath ?? '';
                }
                setPendingArtwork(item.id, { heightCm: item.heightCm!, widthCm: item.widthCm!, imageUri });
              }}
              disabled={!item.placeable}
            >
              {item.thumbnailPath ? (
                <Image source={{ uri: item.thumbnailPath }} style={styles.thumbnail} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                  <Text style={styles.thumbnailPlaceholderText}>?</Text>
                </View>
              )}
              <Text style={styles.artworkTitle} numberOfLines={1}>{item.title}</Text>
              {item.artistName && (
                <Text style={styles.artworkArtist} numberOfLines={1}>{item.artistName}</Text>
              )}
              {item.placeable ? (
                <Text style={styles.artworkDimensions}>{item.widthCm} x {item.heightCm} cm</Text>
              ) : (
                <Text style={styles.artworkError}>Afmetingen ontbreken</Text>
              )}
              {isPending && <Text style={styles.pendingLabel}>Klik op wand</Text>}
            </Pressable>
          );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: PANEL_BG,
    borderRadius: 20,
    padding: 12,
    gap: 8,
    height: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  panelDocked: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: ACTIVE_TINT,
    fontSize: 14,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  // Dropdown filter
  dropdownContainer: {
    position: 'relative',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  dropdownLabel: {
    color: INACTIVE_TINT,
    fontSize: 11,
  },
  dropdownValue: {
    color: ACTIVE_TINT,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },
  dropdownArrow: {
    color: INACTIVE_TINT,
    fontSize: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 28,
    left: 0,
    minWidth: 140,
    maxHeight: 160,
    backgroundColor: PANEL_BG,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 253, 249, 0.15)',
    zIndex: 10,
    padding: 4,
  },
  dropdownOption: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dropdownOptionText: {
    color: INACTIVE_TINT,
    fontSize: 12,
  },
  dropdownOptionTextActive: {
    color: ACTIVE_TINT,
    fontWeight: '700',
  },
  // Content
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: 'rgba(255, 253, 249, 0.3)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  artworkScroll: {
    flex: 1,
  },
  artworkGrid: {
    gap: 12,
    paddingVertical: 4,
  },
  artworkCard: {
    width: 130,
    gap: 3,
  },
  artworkCardPlaced: {
    opacity: 0.35,
  },
  artworkCardPending: {
    borderWidth: 2,
    borderColor: ACCENT,
    borderRadius: 10,
    padding: 2,
  },
  pendingLabel: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  thumbnail: {
    width: 130,
    height: 130,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 253, 249, 0.1)',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    color: INACTIVE_TINT,
    fontSize: 24,
  },
  artworkTitle: {
    color: ACTIVE_TINT,
    fontSize: 12,
    fontWeight: '600',
  },
  artworkArtist: {
    color: INACTIVE_TINT,
    fontSize: 11,
  },
  artworkDimensions: {
    color: INACTIVE_TINT,
    fontSize: 11,
  },
  artworkError: {
    color: ERROR_COLOR,
    fontSize: 11,
    fontWeight: '600',
  },
});
