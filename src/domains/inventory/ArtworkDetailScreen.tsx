import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ArtworkStatusBadge } from '@/src/domains/inventory/ArtworkStatusBadge';
import { deleteArtworkPhotoAsync } from '@/src/domains/inventory/artworkStorage';
import { deleteArtwork, getArtworkById } from '@/src/domains/inventory/repository';
import { confirmAction } from '@/src/shared/confirmAction';
import { type Artwork } from '@/src/domains/inventory/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { Screen } from '@/src/shared/components/Screen';
import { formatPrice as formatEuroPrice } from '@/src/shared/formatters';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  artworkId?: string;
};

export function ArtworkDetailScreen({ artworkId }: Props) {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    if (!artworkId) {
      setError('Ongeldig kunstwerk.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextArtwork = await getArtworkById(db, artworkId);
      if (!isMounted()) return;
      setArtwork(nextArtwork);
      if (!nextArtwork) {
        setError('Dit kunstwerk bestaat niet meer.');
      }
    } catch {
      if (!isMounted()) return;
      setError('Het kunstwerk kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [artworkId, db, isFocused]);

  const confirmDelete = () => {
    if (!artworkId || !artwork || deleting) {
      return;
    }

    confirmAction(
      'Kunstwerk verwijderen',
      `Verwijder "${artwork.title}" uit je voorraad? Deze actie kan niet ongedaan worden gemaakt.`,
      'Verwijderen',
      async () => {
        try {
          setDeleting(true);
          await deleteArtwork(db, artworkId);
          await deleteArtworkPhotoAsync(artwork.photoPath);
          await deleteArtworkPhotoAsync(artwork.thumbnailPath);
          router.replace('/inventory');
        } catch {
          setDeleting(false);
          setError('Verwijderen mislukt. Probeer het opnieuw.');
        }
      }
    );
  };

  const goToInventory = () => router.replace('/inventory');

  if (loading) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Voorraad', onPress: goToInventory },
            { label: 'Laden...' },
          ]}
          action={{ label: 'Terug naar voorraad', onPress: goToInventory }}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Kunstwerk laden...</Text>
        </View>
      </Screen>
    );
  }

  if (!artwork) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Voorraad', onPress: goToInventory },
            { label: 'Niet gevonden' },
          ]}
          action={{ label: 'Terug naar voorraad', onPress: goToInventory }}
        />
        <EmptyState
          title="Kunstwerk niet gevonden"
          description={error ?? 'Het gevraagde kunstwerk kon niet worden geladen.'}
          actionLabel="Terug naar voorraad"
          onAction={goToInventory}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BreadcrumbHeader
        breadcrumbs={[
          { label: 'Voorraad', onPress: goToInventory },
          { label: artwork.title || 'Kunstwerk' },
        ]}
        action={{ label: 'Bewerken', onPress: () => router.push(`/inventory/${artwork.id}/edit`) }}
      />
      <Card>
          {artwork.photoPath ? (
            <Image source={{ uri: artwork.photoPath }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroPlaceholderTitle}>Geen foto opgeslagen</Text>
              <Text style={styles.heroPlaceholderText}>
                Voeg in het bewerkscherm een foto toe vanuit camera of bibliotheek.
              </Text>
            </View>
          )}

          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text accessibilityRole="header" style={styles.title}>{artwork.title}</Text>
              <Text style={styles.artistLine}>{artwork.artistName ?? 'Kunstenaar nog niet ingevuld'}</Text>
              <Text style={styles.subtitle}>{formatTechniqueAndSeries(artwork)}</Text>
            </View>
            <ArtworkStatusBadge status={artwork.status} />
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Overzicht</Text>
          <View style={styles.metaGrid}>
            <MetaItem label="Kunstenaar" value={artwork.artistName ?? 'Niet ingevuld'} />
            <MetaItem label="Vraagprijs" value={formatPrice(artwork.askingPrice)} />
            <MetaItem label="Afmetingen" value={formatDimensions(artwork)} />
            <MetaItem label="Jaar" value={artwork.year ? `${artwork.year}` : 'Niet ingevuld'} />
            <MetaItem label="Serie" value={artwork.series ?? 'Niet ingevuld'} />
          </View>
        </Card>

        <AppButton
          label={deleting ? 'Verwijderen...' : 'Verwijderen'}
          onPress={confirmDelete}
          disabled={deleting}
          variant="secondary"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </Screen>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function formatTechniqueAndSeries(artwork: Artwork) {
  const values = [artwork.technique, artwork.series].filter(Boolean);
  return values.length > 0 ? values.join(' · ') : 'Techniek of serie nog niet ingevuld';
}

function formatDimensions(artwork: Artwork) {
  const segments = [
    artwork.heightCm ? `${artwork.heightCm}h` : null,
    artwork.widthCm ? `${artwork.widthCm}b` : null,
    artwork.depthCm ? `${artwork.depthCm}d` : null,
  ].filter(Boolean);

  return segments.length > 0 ? `${segments.join(' × ')} cm` : 'Niet ingevuld';
}

function formatPrice(price: number | null) {
  return formatEuroPrice(price, 'Niet ingevuld') ?? 'Niet ingevuld';
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  stateText: {
    color: palette.mutedText,
    fontSize: 15,
  },
  heroImage: {
    width: '100%',
    height: 320,
    borderRadius: 20,
    backgroundColor: palette.softAccent,
  },
  heroPlaceholder: {
    height: 220,
    borderRadius: 20,
    backgroundColor: palette.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  heroPlaceholderText: {
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    color: palette.mutedText,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: palette.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.mutedText,
  },
  artistLine: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    color: palette.accent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  metaGrid: {
    gap: 12,
  },
  metaItem: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.text,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
