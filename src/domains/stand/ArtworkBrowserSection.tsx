import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { type StandArtworkItem, listFairArtworksForStand } from './repository';

const ACTIVE_TINT = '#FFFDF9';
const INACTIVE_TINT = '#D8C5AB';
const ACCENT = '#8A6A45';
const ERROR_COLOR = '#e05555';

type Props = {
  fairId: string;
};

export function ArtworkBrowserSection({ fairId }: Props) {
  const db = useSQLiteContext();
  const [artworks, setArtworks] = useState<StandArtworkItem[]>([]);
  const [artistFilter, setArtistFilter] = useState<string | null>(null);

  useEffect(() => {
    setArtistFilter(null);
    listFairArtworksForStand(db, fairId).then(setArtworks);
  }, [db, fairId]);

  const artists = useMemo(() => {
    const names = new Set<string>();
    artworks.forEach(a => { if (a.artistName) names.add(a.artistName); });
    return Array.from(names).sort();
  }, [artworks]);

  const filtered = useMemo(() => {
    if (!artistFilter) return artworks;
    return artworks.filter(a => a.artistName === artistFilter);
  }, [artworks, artistFilter]);

  if (artworks.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.label}>Kunstwerken</Text>
        <Text style={styles.emptyText}>Geen werken aan deze beurs gekoppeld</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Kunstwerken ({filtered.length})</Text>

      {artists.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, !artistFilter && styles.filterChipActive]}
            onPress={() => setArtistFilter(null)}
          >
            <Text style={[styles.filterChipText, !artistFilter && styles.filterChipTextActive]}>Alles</Text>
          </Pressable>
          {artists.map(name => (
            <Pressable
              key={name}
              style={[styles.filterChip, artistFilter === name && styles.filterChipActive]}
              onPress={() => setArtistFilter(artistFilter === name ? null : name)}
            >
              <Text style={[styles.filterChipText, artistFilter === name && styles.filterChipTextActive]} numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView style={styles.artworkList} nestedScrollEnabled>
        {filtered.map(artwork => (
          <View key={artwork.id} style={styles.artworkItem}>
            {artwork.thumbnailPath ? (
              <Image
                source={{ uri: artwork.thumbnailPath ?? undefined }}
                style={styles.thumbnail}
              />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <Text style={styles.thumbnailPlaceholderText}>?</Text>
              </View>
            )}
            <View style={styles.artworkInfo}>
              <Text style={styles.artworkTitle} numberOfLines={1}>{artwork.title}</Text>
              {artwork.artistName && (
                <Text style={styles.artworkArtist} numberOfLines={1}>{artwork.artistName}</Text>
              )}
              {artwork.placeable ? (
                <Text style={styles.artworkDimensions}>
                  {artwork.widthCm} x {artwork.heightCm} cm
                </Text>
              ) : (
                <Text style={styles.artworkError}>Afmetingen ontbreken</Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  label: {
    color: INACTIVE_TINT,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  emptyText: {
    color: 'rgba(255, 253, 249, 0.3)',
    fontSize: 12,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
  filterRow: {
    flexDirection: 'row',
    maxHeight: 32,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 253, 249, 0.06)',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: ACCENT,
  },
  filterChipText: {
    color: INACTIVE_TINT,
    fontSize: 12,
  },
  filterChipTextActive: {
    color: ACTIVE_TINT,
    fontWeight: '600',
  },
  artworkList: {
    maxHeight: 200,
  },
  artworkItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 253, 249, 0.06)',
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 253, 249, 0.1)',
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    color: INACTIVE_TINT,
    fontSize: 14,
  },
  artworkInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 1,
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
    fontSize: 10,
  },
  artworkError: {
    color: ERROR_COLOR,
    fontSize: 10,
    fontWeight: '600',
  },
});
