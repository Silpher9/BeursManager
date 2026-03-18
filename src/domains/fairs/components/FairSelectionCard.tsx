import { Image, StyleSheet, Text, View } from 'react-native';

import { type FairAssignmentItem } from '@/src/domains/fairs/types';
import { Card } from '@/src/shared/components/Card';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

export function FairSelectionCard({
  assignedItems,
  totalAssignedCount,
}: {
  assignedItems: FairAssignmentItem[];
  totalAssignedCount: number;
}) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Selectie voor deze beurs</Text>
      <Text style={styles.sectionHint}>
        {assignedItems.length} {assignedItems.length === 1 ? 'werk' : 'werken'} gekoppeld
      </Text>
      {assignedItems.length === 0 ? (
        <Text style={styles.emptyText}>
          {totalAssignedCount === 0
            ? 'Nog geen kunstwerken toegewezen.'
            : 'Geen gekoppelde werken voor deze kunstenaarfilter.'}
        </Text>
      ) : (
        <View style={styles.selectedList}>
          {assignedItems.map((item) => (
            <View key={item.artworkId} style={styles.selectedRow}>
              <View style={styles.selectedThumbWrap}>
                {item.thumbnailPath || item.photoPath ? (
                  <Image
                    source={{ uri: item.thumbnailPath ?? item.photoPath ?? undefined }}
                    style={styles.selectedThumb}
                  />
                ) : (
                  <View style={styles.selectedThumbPlaceholder}>
                    <Text style={styles.selectedThumbText}>Geen foto</Text>
                  </View>
                )}
              </View>
              <View style={styles.selectedContent}>
                <Text style={styles.selectedTitle}>{item.title}</Text>
                <Text style={styles.selectedMeta}>
                  {[
                    item.artistName,
                    item.series,
                    item.sold ? `Verkocht ${formatPrice(item.salePrice)}` : item.status,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
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
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: palette.mutedText,
  },
  selectedList: {
    gap: 10,
  },
  selectedRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  selectedThumbWrap: {
    width: 64,
    height: 64,
  },
  selectedThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.softAccent,
  },
  selectedThumbPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  selectedThumbText: {
    textAlign: 'center',
    fontSize: 11,
    color: palette.mutedText,
  },
  selectedContent: {
    flex: 1,
    gap: 4,
  },
  selectedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  selectedMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
});
