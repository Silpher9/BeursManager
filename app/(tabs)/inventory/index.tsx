import { useIsFocused } from '@react-navigation/native';
import { Link, router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ArtworkStatusBadge } from '@/src/domains/inventory/ArtworkStatusBadge';
import { listArtists, listArtworks, listArtworkSeries } from '@/src/domains/inventory/repository';
import {
  type ArtistOption,
  type Artwork,
  type ArtworkStatus,
  artworkStatuses,
} from '@/src/domains/inventory/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { FilterChip } from '@/src/shared/components/FilterChip';
import { Screen } from '@/src/shared/components/Screen';
import { euroFormatter, formatPrice } from '@/src/shared/formatters';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artistOptions, setArtistOptions] = useState<ArtistOption[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ArtworkStatus | 'all'>('all');
  const [selectedSeries, setSelectedSeries] = useState<string | 'all'>('all');
  const [selectedArtistId, setSelectedArtistId] = useState<string | 'all'>('all');

  const { isTablet, contentMaxWidth, windowWidth } = useResponsive();
  const effectiveWidth = isTablet ? Math.min(windowWidth - 88, contentMaxWidth) : windowWidth;
  const columnCount = effectiveWidth < 500 ? 2 : effectiveWidth < 900 ? 3 : 4;
  const cardWidth = { 2: '48%', 3: '32%', 4: '23.5%' }[columnCount];

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    setLoading(true);
    setError(null);

    try {
      const [nextArtists, nextArtworks, nextSeries] = await Promise.all([
        listArtists(db),
        listArtworks(db, {
          status: selectedStatus,
          series: selectedSeries,
          artistId: selectedArtistId,
        }),
        listArtworkSeries(db),
      ]);
      if (!isMounted()) return;
      setArtistOptions(nextArtists);
      setArtworks(nextArtworks);
      setSeriesOptions(nextSeries);
    } catch {
      if (!isMounted()) return;
      setError('Voorraad kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, isFocused, selectedArtistId, selectedSeries, selectedStatus]);

  const visibleArtworks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return artworks;
    }

    return artworks.filter((artwork) =>
      [artwork.title, artwork.artistName, artwork.technique, artwork.series]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
    );
  }, [artworks, searchQuery]);

  const stats = useMemo(() => {
    const available = visibleArtworks.filter((artwork) => artwork.status === 'beschikbaar').length;
    const reserved = visibleArtworks.filter((artwork) => artwork.status === 'gereserveerd').length;
    const askingPriceTotal = visibleArtworks.reduce(
      (total, artwork) => total + (artwork.askingPrice ?? 0),
      0
    );

    return { available, reserved, askingPriceTotal };
  }, [visibleArtworks]);

  return (
      <Screen scroll>
        <InventoryStatsCard
          totalCount={visibleArtworks.length}
          available={stats.available}
          reserved={stats.reserved}
          askingPriceTotal={stats.askingPriceTotal}
        />

        <InventoryFilterCard
          searchQuery={searchQuery}
          selectedStatus={selectedStatus}
          selectedSeries={selectedSeries}
          selectedArtistId={selectedArtistId}
          seriesOptions={seriesOptions}
          artistOptions={artistOptions}
          onChangeSearchQuery={setSearchQuery}
          onChangeStatus={setSelectedStatus}
          onChangeSeries={setSelectedSeries}
          onChangeArtistId={setSelectedArtistId}
        />

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.stateText}>Voorraad laden...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <Card>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {!loading && !error && artworks.length === 0 ? (
          <EmptyState
            title="Je voorraad is nog leeg"
            description="Voeg je eerste kunstwerk toe met foto, afmetingen, status en vraagprijs."
            actionLabel="Nieuw kunstwerk"
            onAction={() => router.push('/inventory/new')}
          />
        ) : null}

        {!loading && !error && artworks.length > 0 && visibleArtworks.length === 0 ? (
          <EmptyState
            title="Geen treffers"
            description="Pas je zoekterm of filters aan om andere kunstwerken te tonen."
            actionLabel="Filters wissen"
            onAction={() => {
              setSearchQuery('');
              setSelectedArtistId('all');
              setSelectedSeries('all');
              setSelectedStatus('all');
            }}
          />
        ) : null}

        {!loading && !error && visibleArtworks.length > 0 ? (
          <View style={styles.grid}>
            {visibleArtworks.map((artwork) => (
              <ArtworkGridItem key={artwork.id} artwork={artwork} cardWidth={cardWidth} />
            ))}
          </View>
        ) : null}
      </Screen>
  );
}

// --- Local sub-components ---

function InventoryStatsCard({
  totalCount,
  available,
  reserved,
  askingPriceTotal,
}: {
  totalCount: number;
  available: number;
  reserved: number;
  askingPriceTotal: number;
}) {
  return (
    <Card>
      <Text accessibilityRole="header" style={styles.heroTitle}>Voorraad</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{totalCount}</Text>
          <Text style={styles.statLabel}>werken totaal</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{available}</Text>
          <Text style={styles.statLabel}>beschikbaar</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{reserved}</Text>
          <Text style={styles.statLabel}>gereserveerd</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{euroFormatter.format(askingPriceTotal)}</Text>
          <Text style={styles.statLabel}>vraagprijs</Text>
        </View>
      </View>
      <Link href="/inventory/new" asChild>
        <AppButton label="Toevoegen" compact />
      </Link>
    </Card>
  );
}

type InventoryFilterCardProps = {
  searchQuery: string;
  selectedStatus: ArtworkStatus | 'all';
  selectedSeries: string | 'all';
  selectedArtistId: string | 'all';
  seriesOptions: string[];
  artistOptions: ArtistOption[];
  onChangeSearchQuery: (value: string) => void;
  onChangeStatus: (value: ArtworkStatus | 'all') => void;
  onChangeSeries: (value: string | 'all') => void;
  onChangeArtistId: (value: string | 'all') => void;
};

function InventoryFilterCard({
  searchQuery,
  selectedStatus,
  selectedSeries,
  selectedArtistId,
  seriesOptions,
  artistOptions,
  onChangeSearchQuery,
  onChangeStatus,
  onChangeSeries,
  onChangeArtistId,
}: InventoryFilterCardProps) {
  return (
    <Card>
      <TextInput
        placeholder="Zoek op titel, kunstenaar, techniek of serie"
        placeholderTextColor={palette.placeholder}
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={onChangeSearchQuery}
      />
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Status</Text>
        <View style={styles.filterRow}>
          <FilterChip
            label="Alles"
            active={selectedStatus === 'all'}
            onPress={() => onChangeStatus('all')}
          />
          {artworkStatuses.map((status) => (
            <FilterChip
              key={status}
              label={status === 'op_beurs' ? 'Op beurs' : capitalize(status)}
              active={selectedStatus === status}
              onPress={() => onChangeStatus(status)}
            />
          ))}
        </View>
      </View>
      {seriesOptions.length > 0 ? (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Serie</Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="Alles"
              active={selectedSeries === 'all'}
              onPress={() => onChangeSeries('all')}
            />
            {seriesOptions.map((series) => (
              <FilterChip
                key={series}
                label={series}
                active={selectedSeries === series}
                onPress={() => onChangeSeries(series)}
              />
            ))}
          </View>
        </View>
      ) : null}
      {artistOptions.length > 0 ? (
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Kunstenaar</Text>
          <View style={styles.filterRow}>
            <FilterChip
              label="Alles"
              active={selectedArtistId === 'all'}
              onPress={() => onChangeArtistId('all')}
            />
            {artistOptions.map((artist) => (
              <FilterChip
                key={artist.id}
                label={artist.name}
                active={selectedArtistId === artist.id}
                onPress={() => onChangeArtistId(artist.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function ArtworkGridItem({ artwork, cardWidth }: { artwork: Artwork; cardWidth: string }) {
  return (
    <Pressable
      onPress={() => router.push(`/inventory/${artwork.id}`)}
      style={({ pressed }) => [
        styles.artworkCard,
        { width: cardWidth as any },
        pressed && styles.artworkCardPressed,
      ]}>
      <View style={styles.cardImageWrap}>
        {artwork.thumbnailPath || artwork.photoPath ? (
          <Image
            source={{ uri: artwork.thumbnailPath ?? artwork.photoPath ?? undefined }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Text style={styles.cardPlaceholderText}>Geen foto</Text>
          </View>
        )}
        <View style={styles.cardBadge}>
          <ArtworkStatusBadge status={artwork.status} />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {artwork.title}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {formatArtistTechniqueAndSeries(artwork.artistName, artwork.technique, artwork.series)}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {formatDimensions(artwork)}
        </Text>
        <Text style={styles.cardPrice}>
          {formatPrice(artwork.askingPrice, 'Prijs nog leeg')}
        </Text>
      </View>
    </Pressable>
  );
}

// --- Helpers ---

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ');
}

function formatArtistTechniqueAndSeries(
  artistName?: string | null,
  technique?: string | null,
  series?: string | null
) {
  const values = [artistName, technique, series].filter(Boolean);
  return values.length > 0 ? values.join(' · ') : 'Kunstenaar, techniek of serie nog niet ingevuld';
}

function formatDimensions(artwork: Artwork) {
  const dimensions = [artwork.heightCm, artwork.widthCm, artwork.depthCm]
    .map((value) => (typeof value === 'number' ? `${value} cm` : null))
    .filter(Boolean);

  return dimensions.length > 0 ? dimensions.join(' × ') : 'Afmetingen nog niet ingevuld';
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 18,
  },
  statBlock: {
    flex: 1,
    minWidth: 120,
    minHeight: 86,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: palette.text,
  },
  statLabel: {
    fontSize: 13,
    color: palette.mutedText,
  },
  searchInput: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    color: palette.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  centeredState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  stateText: {
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  artworkCard: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  artworkCardPressed: {
    opacity: 0.85,
  },
  cardImageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: palette.softAccent,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  cardPlaceholderText: {
    textAlign: 'center',
    color: palette.mutedText,
    fontSize: 14,
  },
  cardBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  cardContent: {
    padding: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: palette.text,
  },
  cardMeta: {
    fontSize: 12,
    lineHeight: 17,
    color: palette.mutedText,
  },
  cardPrice: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
});
