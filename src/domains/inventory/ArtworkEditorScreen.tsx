import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ArtworkStatusBadge } from '@/src/domains/inventory/ArtworkStatusBadge';
import {
  deleteArtworkPhotoAsync,
  persistArtworkPhotoAssetsAsync,
} from '@/src/domains/inventory/artworkStorage';
import { getArtworkById, listArtists, saveArtwork } from '@/src/domains/inventory/repository';
import {
  type Artwork,
  type ArtistOption,
  type ArtworkEditorValues,
  type ArtworkStatus,
  artworkStatuses,
  artworkStatusLabels,
  emptyArtworkEditorValues,
  toArtworkEditorValues,
  validateArtworkEditorValues,
} from '@/src/domains/inventory/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Card } from '@/src/shared/components/Card';
import { Field } from '@/src/shared/components/Field';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  artworkId?: string;
};

export function ArtworkEditorScreen({ artworkId }: Props) {
  const db = useSQLiteContext();
  const [values, setValues] = useState<ArtworkEditorValues>(emptyArtworkEditorValues);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [artistPickerOpen, setArtistPickerOpen] = useState(false);
  const [originalArtwork, setOriginalArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(Boolean(artworkId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    try {
      const nextArtists = await listArtists(db);
      if (!isMounted()) return;
      setArtists(nextArtists);
    } catch {
      // Keep the editor usable even when artist suggestions cannot be loaded.
    }
  }, [db]);

  useAsyncEffect(async (isMounted) => {
    if (!artworkId) {
      setValues(emptyArtworkEditorValues);
      setOriginalArtwork(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const artwork = await getArtworkById(db, artworkId);
      if (!isMounted()) return;
      if (!artwork) {
        setError('Dit kunstwerk kon niet gevonden worden.');
        return;
      }
      setOriginalArtwork(artwork);
      setValues(toArtworkEditorValues(artwork));
      setArtistPickerOpen(false);
    } catch {
      if (!isMounted()) return;
      setError('Het kunstwerk kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [artworkId, db]);

  const setValue = <Key extends keyof ArtworkEditorValues>(
    key: Key,
    value: ArtworkEditorValues[Key]
  ) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  };

  const handleSave = async () => {
    const validationError = validateArtworkEditorValues(values);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    let nextPhotoPath = values.photoPath;
    let nextThumbnailPath = values.thumbnailPath;
    let copiedAssets: { photoPath: string; thumbnailPath: string | null } | null = null;
    let savedArtworkId: string | null = null;

    try {
      if (values.photoPath && values.photoPath !== originalArtwork?.photoPath) {
        copiedAssets = await persistArtworkPhotoAssetsAsync(values.photoPath);
        nextPhotoPath = copiedAssets.photoPath;
        nextThumbnailPath = copiedAssets.thumbnailPath;
      }

      savedArtworkId = await saveArtwork(
        db,
        {
          ...values,
          photoPath: nextPhotoPath,
          thumbnailPath: nextThumbnailPath,
        },
        artworkId
      );

      setArtists(await listArtists(db));

      if (originalArtwork?.photoPath && originalArtwork.photoPath !== nextPhotoPath) {
        await deleteArtworkPhotoAsync(originalArtwork.photoPath);
      }
      if (originalArtwork?.thumbnailPath && originalArtwork.thumbnailPath !== nextThumbnailPath) {
        await deleteArtworkPhotoAsync(originalArtwork.thumbnailPath);
      }
    } catch (caughtError) {
      if (copiedAssets) {
        await deleteArtworkPhotoAsync(copiedAssets.photoPath);
        await deleteArtworkPhotoAsync(copiedAssets.thumbnailPath);
      }

      const message =
        caughtError instanceof Error ? caughtError.message : 'Onbekende fout tijdens opslaan.';

      console.error('Artwork save failed', caughtError);
      setError(`Opslaan mislukt: ${message}`);
    } finally {
      setSaving(false);
    }

    if (savedArtworkId) {
      router.replace(`/inventory/${savedArtworkId}`);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Toegang nodig', 'Geef foto-toegang om een bestaand werk te selecteren.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled) {
        setValue('photoPath', result.assets[0]?.uri ?? null);
      }
    } catch {
      Alert.alert('Fout', 'De fotobibliotheek kon niet worden geopend.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Toegang nodig', 'Geef cameratoegang om een kunstwerk vast te leggen.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled) {
        setValue('photoPath', result.assets[0]?.uri ?? null);
      }
    } catch {
      Alert.alert('Fout', 'De camera kon niet worden geopend.');
    }
  };

  const handleRemovePhoto = () => {
    setValue('photoPath', null);
    setValue('thumbnailPath', null);
  };

  const goToInventory = () => {
    router.replace('/inventory');
  };

  const goToArtworkDetail = () => {
    if (artworkId) {
      router.replace({ pathname: '/inventory/[id]', params: { id: artworkId } });
      return;
    }
    goToInventory();
  };

  const header = (
    <BreadcrumbHeader
      breadcrumbs={[
        { label: 'Voorraad', onPress: goToInventory },
        ...(artworkId && originalArtwork
          ? [
              { label: originalArtwork.title || 'Kunstwerk', onPress: goToArtworkDetail },
              { label: 'Bewerken' },
            ]
          : [{ label: 'Nieuw kunstwerk' }]),
      ]}
      screenTitle={artworkId ? 'Kunstwerk bewerken' : 'Nieuw kunstwerk'}
      action={{ label: 'Annuleren', onPress: artworkId ? goToArtworkDetail : goToInventory }}
    />
  );

  if (loading) {
    return (
      <Screen scroll>
        {header}
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.loadingText}>Kunstwerk laden...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {header}

      <PhotoSection
        photoPath={values.photoPath}
        onTake={handleTakePhoto}
        onPick={handlePickFromLibrary}
        onRemove={handleRemovePhoto}
      />

        <ArtistSection
          artistName={values.artistName}
          artists={artists}
          pickerOpen={artistPickerOpen}
          onTogglePicker={() => setArtistPickerOpen((current) => !current)}
          onSelectArtist={(name) => {
            setValue('artistName', name);
            setArtistPickerOpen(false);
          }}
          onChangeArtistName={(value) => setValue('artistName', value)}
        />

        <BasicInfoSection
          title={values.title}
          technique={values.technique}
          series={values.series}
          year={values.year}
          onChangeTitle={(value) => setValue('title', value)}
          onChangeTechnique={(value) => setValue('technique', value)}
          onChangeSeries={(value) => setValue('series', value)}
          onChangeYear={(value) => setValue('year', value)}
        />

        <DimensionsSection
          heightCm={values.heightCm}
          widthCm={values.widthCm}
          depthCm={values.depthCm}
          askingPrice={values.askingPrice}
          onChangeHeightCm={(value) => setValue('heightCm', value)}
          onChangeWidthCm={(value) => setValue('widthCm', value)}
          onChangeDepthCm={(value) => setValue('depthCm', value)}
          onChangeAskingPrice={(value) => setValue('askingPrice', value)}
        />

        <StatusSection
          status={values.status}
          onChangeStatus={(value) => setValue('status', value)}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton
          label={saving ? 'Opslaan...' : artworkId ? 'Wijzigingen opslaan' : 'Kunstwerk opslaan'}
          onPress={handleSave}
          disabled={saving}
        />
    </Screen>
  );
}

// --- Local sub-components ---

type PhotoSectionProps = {
  photoPath: string | null;
  onTake: () => void;
  onPick: () => void;
  onRemove: () => void;
};

function PhotoSection({ photoPath, onTake, onPick, onRemove }: PhotoSectionProps) {
  return (
    <Card>
      <View style={styles.photoSection}>
        {photoPath ? (
          <Image source={{ uri: photoPath }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderTitle}>Nog geen foto</Text>
            <Text style={styles.photoPlaceholderText}>
              Gebruik de camera of kies een bestaande afbeelding.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        <AppButton label="Foto maken" onPress={onTake} variant="secondary" />
        <AppButton label="Kies foto" onPress={onPick} variant="secondary" />
      </View>
      {photoPath ? (
        <View style={styles.removePhotoWrap}>
          <AppButton label="Foto verwijderen" onPress={onRemove} variant="secondary" />
        </View>
      ) : null}
    </Card>
  );
}

type ArtistSectionProps = {
  artistName: string;
  artists: ArtistOption[];
  pickerOpen: boolean;
  onTogglePicker: () => void;
  onSelectArtist: (name: string) => void;
  onChangeArtistName: (value: string) => void;
};

function ArtistSection({
  artistName,
  artists,
  pickerOpen,
  onTogglePicker,
  onSelectArtist,
  onChangeArtistName,
}: ArtistSectionProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Kunstenaar</Text>
      <Pressable
        onPress={onTogglePicker}
        style={({ pressed }) => [
          styles.artistSelector,
          pickerOpen && styles.artistSelectorOpen,
          pressed && styles.artistSelectorPressed,
        ]}>
        <View style={styles.artistSelectorTextWrap}>
          <Text style={styles.artistSelectorLabel}>Bestaande kunstenaars</Text>
          <Text style={styles.artistSelectorValue}>
            {artistName.trim() || 'Selecteer of vul hieronder een nieuwe kunstenaar in'}
          </Text>
        </View>
        <Text style={styles.artistSelectorIcon}>{pickerOpen ? 'Sluit' : 'Kies'}</Text>
      </Pressable>
      {pickerOpen && artists.length > 0 ? (
        <View style={styles.artistOptions}>
          {artists.map((artist) => (
            <Pressable
              key={artist.id}
              onPress={() => onSelectArtist(artist.name)}
              style={({ pressed }) => [
                styles.artistChip,
                artistName.trim().toLowerCase() === artist.name.toLowerCase() &&
                  styles.artistChipActive,
                pressed && styles.artistChipPressed,
              ]}>
              <Text
                style={[
                  styles.artistChipLabel,
                  artistName.trim().toLowerCase() === artist.name.toLowerCase() &&
                    styles.artistChipLabelActive,
                ]}>
                {artist.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Field
        label="Nieuwe of aangepaste kunstenaar"
        placeholder="Bijv. Damon Bot"
        value={artistName}
        onChangeText={onChangeArtistName}
      />
    </Card>
  );
}

type BasicInfoSectionProps = {
  title: string;
  technique: string;
  series: string;
  year: string;
  onChangeTitle: (value: string) => void;
  onChangeTechnique: (value: string) => void;
  onChangeSeries: (value: string) => void;
  onChangeYear: (value: string) => void;
};

function BasicInfoSection({
  title,
  technique,
  series,
  year,
  onChangeTitle,
  onChangeTechnique,
  onChangeSeries,
  onChangeYear,
}: BasicInfoSectionProps) {
  return (
    <Card>
      <Field
        label="Titel"
        placeholder="Bijv. Blauwe horizon"
        value={title}
        onChangeText={onChangeTitle}
      />
      <Field
        label="Techniek"
        placeholder="Bijv. olieverf op doek"
        value={technique}
        onChangeText={onChangeTechnique}
      />
      <Field
        label="Serie"
        placeholder="Optioneel"
        value={series}
        onChangeText={onChangeSeries}
      />
      <Field
        label="Jaar"
        placeholder="2026"
        keyboardType="number-pad"
        value={year}
        onChangeText={onChangeYear}
      />
    </Card>
  );
}

type DimensionsSectionProps = {
  heightCm: string;
  widthCm: string;
  depthCm: string;
  askingPrice: string;
  onChangeHeightCm: (value: string) => void;
  onChangeWidthCm: (value: string) => void;
  onChangeDepthCm: (value: string) => void;
  onChangeAskingPrice: (value: string) => void;
};

function DimensionsSection({
  heightCm,
  widthCm,
  depthCm,
  askingPrice,
  onChangeHeightCm,
  onChangeWidthCm,
  onChangeDepthCm,
  onChangeAskingPrice,
}: DimensionsSectionProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Afmetingen en prijs</Text>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Field
            label="Hoogte (cm)"
            placeholder="100"
            keyboardType="decimal-pad"
            value={heightCm}
            onChangeText={onChangeHeightCm}
          />
        </View>
        <View style={styles.gridItem}>
          <Field
            label="Breedte (cm)"
            placeholder="80"
            keyboardType="decimal-pad"
            value={widthCm}
            onChangeText={onChangeWidthCm}
          />
        </View>
      </View>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Field
            label="Diepte (cm)"
            placeholder="3"
            keyboardType="decimal-pad"
            value={depthCm}
            onChangeText={onChangeDepthCm}
          />
        </View>
        <View style={styles.gridItem}>
          <Field
            label="Vraagprijs"
            placeholder="1250"
            keyboardType="decimal-pad"
            value={askingPrice}
            onChangeText={onChangeAskingPrice}
          />
        </View>
      </View>
    </Card>
  );
}

function StatusSection({
  status,
  onChangeStatus,
}: {
  status: ArtworkStatus;
  onChangeStatus: (status: ArtworkStatus) => void;
}) {
  return (
    <Card>
      <View style={styles.statusHeader}>
        <Text style={styles.sectionTitle}>Status</Text>
        <ArtworkStatusBadge status={status} />
      </View>
      <View style={styles.statusList}>
        {artworkStatuses.map((s) => (
          <StatusOption
            key={s}
            status={s}
            active={status === s}
            onPress={() => onChangeStatus(s)}
          />
        ))}
      </View>
    </Card>
  );
}

type StatusOptionProps = {
  status: ArtworkStatus;
  active: boolean;
  onPress: () => void;
};

function StatusOption({ status, active, onPress }: StatusOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statusOption,
        active && styles.statusOptionActive,
        pressed && styles.statusOptionPressed,
      ]}>
      <Text style={[styles.statusOptionLabel, active && styles.statusOptionLabelActive]}>
        {artworkStatusLabels[status]}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingText: {
    color: palette.mutedText,
    fontSize: 15,
  },
  photoSection: {},
  photoPreview: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    backgroundColor: palette.softAccent,
  },
  photoPlaceholder: {
    height: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    borderStyle: 'dashed',
    backgroundColor: palette.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  photoPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  photoPlaceholderText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  removePhotoWrap: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 4,
  },
  artistSelector: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#FCFAF6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  artistSelectorOpen: {
    borderColor: palette.accent,
  },
  artistSelectorPressed: {
    opacity: 0.9,
  },
  artistSelectorTextWrap: {
    flex: 1,
    gap: 4,
  },
  artistSelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: palette.mutedText,
  },
  artistSelectorValue: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  artistSelectorIcon: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.accent,
  },
  artistOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  artistChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  artistChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  artistChipPressed: {
    opacity: 0.85,
  },
  artistChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  artistChipLabelActive: {
    color: '#FFFDF9',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  statusOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusOptionActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  statusOptionPressed: {
    opacity: 0.85,
  },
  statusOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.text,
  },
  statusOptionLabelActive: {
    color: '#FFFDF9',
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
