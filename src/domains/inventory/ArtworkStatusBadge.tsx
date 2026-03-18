import { StyleSheet, Text, View } from 'react-native';

import {
  type ArtworkStatus,
  artworkStatusLabels,
} from '@/src/domains/inventory/types';

type Props = {
  status: ArtworkStatus;
};

const statusStyles: Record<ArtworkStatus, { backgroundColor: string; color: string }> = {
  beschikbaar: { backgroundColor: '#E6F2EA', color: '#2F6B45' },
  gereserveerd: { backgroundColor: '#F2E7D3', color: '#8A5A12' },
  ingepakt: { backgroundColor: '#E7EBF5', color: '#425A87' },
  op_beurs: { backgroundColor: '#F7E2DE', color: '#A04A3D' },
  verkocht: { backgroundColor: '#E9E4F2', color: '#5A4B8A' },
};

export function ArtworkStatusBadge({ status }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: statusStyles[status].backgroundColor }]}>
      <Text style={[styles.label, { color: statusStyles[status].color }]}>
        {artworkStatusLabels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
