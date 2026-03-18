import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { listArtworksForInterestPicker } from '@/src/domains/contacts/repository';
import { type InterestPickerArtwork } from '@/src/domains/contacts/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  existingInterestArtworkIds: string[];
  onSelect: (artwork: InterestPickerArtwork) => void;
  onClose: () => void;
};

export function ArtworkInterestPicker({
  existingInterestArtworkIds,
  onSelect,
  onClose,
}: Props) {
  const db = useSQLiteContext();
  const [artworks, setArtworks] = useState<InterestPickerArtwork[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useAsyncEffect(async (isMounted) => {
    try {
      const allArtworks = await listArtworksForInterestPicker(db);
      if (!isMounted()) return;
      setArtworks(allArtworks);
    } catch {
      // Picker toont lege staat
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db]);

  const availableArtworks = useMemo(() => {
    let filtered = artworks.filter(
      (artwork) => !existingInterestArtworkIds.includes(artwork.id)
    );

    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (normalizedQuery) {
      filtered = filtered.filter((artwork) =>
        [artwork.title, artwork.artistName]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery))
      );
    }

    return filtered;
  }, [artworks, existingInterestArtworkIds, searchQuery]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Interesse toevoegen</Text>
          <AppButton label="Sluiten" compact variant="secondary" onPress={onClose} />
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            placeholder="Zoek op titel of kunstenaar"
            placeholderTextColor={palette.placeholder}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {loading ? (
            <Text style={styles.emptyText}>Kunstwerken laden...</Text>
          ) : null}

          {!loading && availableArtworks.length === 0 ? (
            <Text style={styles.emptyText}>
              {artworks.length === 0
                ? 'Nog geen kunstwerken in voorraad.'
                : 'Geen beschikbare kunstwerken gevonden.'}
            </Text>
          ) : null}

          {availableArtworks.map((artwork) => (
            <Pressable
              key={artwork.id}
              onPress={() => onSelect(artwork)}
              style={({ pressed }) => [
                styles.artworkRow,
                pressed && styles.artworkRowPressed,
              ]}>
              <View style={styles.thumbWrap}>
                {artwork.thumbnailPath || artwork.photoPath ? (
                  <Image
                    source={{ uri: artwork.thumbnailPath ?? artwork.photoPath ?? undefined }}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Text style={styles.thumbPlaceholderText}>?</Text>
                  </View>
                )}
              </View>
              <View style={styles.artworkContent}>
                <Text style={styles.artworkTitle} numberOfLines={1}>
                  {artwork.title}
                </Text>
                <Text style={styles.artworkMeta} numberOfLines={1}>
                  {[artwork.artistName, artwork.status].filter(Boolean).join(' \u00B7 ')}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: palette.text,
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: palette.text,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 4,
  },
  emptyText: {
    paddingVertical: 24,
    textAlign: 'center',
    color: palette.mutedText,
    fontSize: 15,
  },
  artworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  artworkRowPressed: {
    opacity: 0.7,
    backgroundColor: palette.softAccent,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: palette.softAccent,
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 16,
    color: palette.mutedText,
  },
  artworkContent: {
    flex: 1,
    gap: 2,
  },
  artworkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  artworkMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
});
