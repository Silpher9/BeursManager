import { StyleSheet, Text, View } from 'react-native';

import { type FairAssignmentItem } from '@/src/domains/fairs/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { FilterChip } from '@/src/shared/components/FilterChip';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

type FairAssignmentCardProps = {
  assignments: FairAssignmentItem[];
  artistOptions: string[];
  selectedArtist: string | 'all';
  savingArtworkId: string | null;
  onSelectArtist: (artist: string | 'all') => void;
  onToggleArtwork: (assignment: FairAssignmentItem) => void;
};

export function FairAssignmentCard({
  assignments,
  artistOptions,
  selectedArtist,
  savingArtworkId,
  onSelectArtist,
  onToggleArtwork,
}: FairAssignmentCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Kunstwerken koppelen</Text>
      <Text style={styles.sectionHint}>
        Toggle direct vanuit je voorraad. Verkochte werken blijven vergrendeld aan de beurs
        gekoppeld.
      </Text>
      {artistOptions.length > 0 ? (
        <View style={styles.assignmentFilterRow}>
          <FilterChip
            label="Alle kunstenaars"
            active={selectedArtist === 'all'}
            onPress={() => onSelectArtist('all')}
          />
          {artistOptions.map((artistName) => (
            <FilterChip
              key={artistName}
              label={artistName}
              active={selectedArtist === artistName}
              onPress={() => onSelectArtist(artistName)}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.assignmentList}>
        {assignments.length === 0 ? (
          <Text style={styles.emptyText}>Geen kunstwerken gevonden voor deze kunstenaarfilter.</Text>
        ) : (
          assignments.map((assignment) => (
            <View key={assignment.artworkId} style={styles.assignmentRow}>
              <View style={styles.assignmentText}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.assignmentMeta}>
                  {[
                    assignment.artistName,
                    assignment.series,
                    assignment.status,
                    assignment.sold ? `Verkocht ${formatPrice(assignment.salePrice)}` : null,
                    formatPrice(assignment.askingPrice),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <AppButton
                label={
                  savingArtworkId === assignment.artworkId
                    ? 'Opslaan...'
                    : assignment.sold
                      ? 'Verkocht'
                      : assignment.included
                        ? 'Verwijder'
                        : 'Neem mee'
                }
                onPress={() => onToggleArtwork(assignment)}
                disabled={savingArtworkId === assignment.artworkId || assignment.sold}
                compact
                variant={assignment.included || assignment.sold ? 'secondary' : 'primary'}
              />
            </View>
          ))
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.mutedText,
  },
  assignmentFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assignmentList: {
    gap: 10,
  },
  assignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 12,
  },
  assignmentText: {
    flex: 1,
    gap: 4,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  assignmentMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.mutedText,
  },
});
