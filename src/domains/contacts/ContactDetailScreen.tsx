import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  addContactInterest,
  deleteContact,
  getContactById,
  getContactInterests,
  removeContactInterest,
} from '@/src/domains/contacts/repository';
import {
  type Contact,
  type ContactInterest,
  type ContactType,
  type InterestPickerArtwork,
  contactTypeLabels,
} from '@/src/domains/contacts/types';
import { ArtworkInterestPicker } from '@/src/domains/contacts/ArtworkInterestPicker';
import { confirmAction } from '@/src/shared/confirmAction';
import { AppButton } from '@/src/shared/components/AppButton';
import { BreadcrumbHeader } from '@/src/shared/components/BreadcrumbHeader';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { Screen } from '@/src/shared/components/Screen';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { palette } from '@/src/shared/theme/colors';

type Props = {
  contactId?: string;
};

export function ContactDetailScreen({ contactId }: Props) {
  const db = useSQLiteContext();
  const [contact, setContact] = useState<Contact | null>(null);
  const [interests, setInterests] = useState<ContactInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInterestPicker, setShowInterestPicker] = useState(false);

  useAsyncEffect(async (isMounted) => {
    if (!contactId) {
      setError('Ongeldig contact.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextContact, nextInterests] = await Promise.all([
        getContactById(db, contactId),
        getContactInterests(db, contactId),
      ]);
      if (!isMounted()) return;
      setContact(nextContact);
      setInterests(nextInterests);
      if (!nextContact) {
        setError('Dit contact bestaat niet meer.');
      }
    } catch {
      if (!isMounted()) return;
      setError('Het contact kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [contactId, db]);

  const confirmDelete = () => {
    if (!contactId || !contact || deleting) {
      return;
    }

    confirmAction(
      'Contact verwijderen',
      `Verwijder "${contact.name}"? Deze actie kan niet ongedaan worden gemaakt.`,
      'Verwijderen',
      async () => {
        try {
          setDeleting(true);
          await deleteContact(db, contactId);
          router.replace('/contacts');
        } catch {
          setDeleting(false);
          setError('Verwijderen mislukt. Probeer het opnieuw.');
        }
      }
    );
  };

  const handleAddInterest = async (artwork: InterestPickerArtwork) => {
    if (!contactId) return;

    try {
      await addContactInterest(db, contactId, artwork.id);
      const nextInterests = await getContactInterests(db, contactId);
      setInterests(nextInterests);
      setShowInterestPicker(false);
    } catch {
      setError('Interesse toevoegen mislukt.');
    }
  };

  const handleRemoveInterest = (interest: ContactInterest) => {
    if (!contactId) return;

    confirmAction(
      'Interesse verwijderen',
      `Verwijder "${interest.artworkTitle}" als interesse?`,
      'Verwijderen',
      async () => {
        try {
          await removeContactInterest(db, contactId, interest.artworkId);
          const nextInterests = await getContactInterests(db, contactId);
          setInterests(nextInterests);
        } catch {
          setError('Interesse verwijderen mislukt.');
        }
      }
    );
  };

  const goToContacts = () => router.replace('/contacts');

  if (loading) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Contacten', onPress: goToContacts },
            { label: 'Laden...' },
          ]}
          action={{ label: 'Terug naar contacten', onPress: goToContacts }}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Contact laden...</Text>
        </View>
      </Screen>
    );
  }

  if (!contact) {
    return (
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Contacten', onPress: goToContacts },
            { label: 'Niet gevonden' },
          ]}
          action={{ label: 'Terug naar contacten', onPress: goToContacts }}
        />
        <EmptyState
          title="Contact niet gevonden"
          description={error ?? 'Het gevraagde contact kon niet worden geladen.'}
          actionLabel="Terug naar contacten"
          onAction={goToContacts}
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen scroll>
        <BreadcrumbHeader
          breadcrumbs={[
            { label: 'Contacten', onPress: goToContacts },
            { label: contact.name || 'Contact' },
          ]}
          action={{ label: 'Bewerken', onPress: () => router.push(`/contacts/${contactId}/edit`) }}
        />
        <Card>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text accessibilityRole="header" style={styles.title}>{contact.name}</Text>
              <ContactTypeBadge type={contact.type} />
            </View>
          </View>
          {contact.fairName ? (
            <Pressable onPress={() => router.push(`/fairs/${contact.fairId}`)}>
              <Text style={styles.fairLink}>Ontstaan op: {contact.fairName}</Text>
            </Pressable>
          ) : null}
        </Card>

        {contact.email || contact.phone ? (
          <Card>
            <Text style={styles.sectionTitle}>Contactgegevens</Text>
            <View style={styles.metaGrid}>
              {contact.email ? <MetaItem label="E-MAIL" value={contact.email} /> : null}
              {contact.phone ? <MetaItem label="TELEFOON" value={contact.phone} /> : null}
            </View>
          </Card>
        ) : null}

        {contact.notes ? (
          <Card>
            <Text style={styles.sectionTitle}>Notities</Text>
            <Text style={styles.notesText}>{contact.notes}</Text>
          </Card>
        ) : null}

        {contact.purchasedArtworkTitles.length > 0 ? (
          <Card>
            <Text style={styles.sectionTitle}>Aankopen</Text>
            {contact.purchasedArtworkTitles.map((artworkTitle, index) => (
              <Text key={index} style={styles.purchaseItem}>
                {artworkTitle}
              </Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Interesses</Text>
          {interests.length === 0 ? (
            <Text style={styles.emptyHint}>Nog geen interesses vastgelegd.</Text>
          ) : (
            <View style={styles.interestList}>
              {interests.map((interest) => (
                <InterestRow
                  key={interest.artworkId}
                  interest={interest}
                  onRemove={() => handleRemoveInterest(interest)}
                />
              ))}
            </View>
          )}
          <AppButton
            label="Interesse toevoegen"
            variant="secondary"
            compact
            onPress={() => setShowInterestPicker(true)}
          />
        </Card>

        <AppButton
          label={deleting ? 'Verwijderen...' : 'Verwijderen'}
          onPress={confirmDelete}
          disabled={deleting}
          variant="secondary"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Screen>

      {showInterestPicker ? (
        <ArtworkInterestPicker
          existingInterestArtworkIds={interests.map((i) => i.artworkId)}
          onSelect={handleAddInterest}
          onClose={() => setShowInterestPicker(false)}
        />
      ) : null}
    </>
  );
}

function ContactTypeBadge({ type }: { type: ContactType }) {
  return (
    <View style={styles.typeBadge}>
      <Text style={styles.typeBadgeLabel}>{contactTypeLabels[type]}</Text>
    </View>
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

function InterestRow({
  interest,
  onRemove,
}: {
  interest: ContactInterest;
  onRemove: () => void;
}) {
  const imageUri = interest.artworkThumbnailPath ?? interest.artworkPhotoPath;

  return (
    <View style={styles.interestRow}>
      <View style={styles.interestThumbWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.interestThumb} />
        ) : (
          <View style={styles.interestThumbPlaceholder}>
            <Text style={styles.interestThumbPlaceholderText}>?</Text>
          </View>
        )}
      </View>
      <View style={styles.interestContent}>
        <Text style={styles.interestTitle} numberOfLines={2}>
          {interest.artworkTitle}
        </Text>
        {interest.fairName ? (
          <Text style={styles.interestFair} numberOfLines={1}>
            {interest.fairName}
          </Text>
        ) : null}
      </View>
      <AppButton label="Verwijder" compact variant="secondary" onPress={onRemove} />
    </View>
  );
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: palette.text,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.softAccent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.accent,
  },
  fairLink: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: palette.accent,
    textDecorationLine: 'underline',
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
  notesText: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.text,
  },
  purchaseItem: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.text,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
  },
  emptyHint: {
    fontSize: 14,
    color: palette.mutedText,
    lineHeight: 22,
  },
  interestList: {
    gap: 12,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  interestThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: palette.softAccent,
  },
  interestThumb: {
    width: '100%',
    height: '100%',
  },
  interestThumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interestThumbPlaceholderText: {
    fontSize: 18,
    color: palette.mutedText,
  },
  interestContent: {
    flex: 1,
    gap: 2,
  },
  interestTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  interestFair: {
    fontSize: 13,
    color: palette.mutedText,
  },
  errorText: {
    color: palette.danger,
    fontSize: 15,
    lineHeight: 22,
  },
});
