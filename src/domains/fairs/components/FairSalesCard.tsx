import { Link, router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type SaleListItem } from '@/src/domains/sales/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { formatPrice } from '@/src/shared/formatters';
import { palette } from '@/src/shared/theme/colors';

import { formatActivityTimestamp } from './formatActivityTimestamp';

export function FairSalesCard({ fairId, sales }: { fairId: string; sales: SaleListItem[] }) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.sectionTitle}>Verkopen</Text>
          <Text style={styles.sectionHint}>
            Registreer verkopen vanuit de beursselectie en bewaar de transactie historisch.
          </Text>
        </View>
        <Link href={`/fairs/${fairId}/sales/new`} asChild>
          <AppButton label="Nieuwe verkoop" compact />
        </Link>
      </View>
      {sales.length === 0 ? (
        <Text style={styles.emptyText}>Nog geen verkopen geregistreerd.</Text>
      ) : (
        <View style={styles.salesList}>
          {sales.map((sale) => (
            <Pressable
              key={sale.id}
              onPress={() => router.push(`/fairs/${fairId}/sales/${sale.id}`)}
              style={({ pressed }) => [styles.saleRow, pressed && styles.saleRowPressed]}>
              <View style={styles.saleThumbWrap}>
                {sale.artworkThumbnailPath || sale.artworkPhotoPath ? (
                  <Image
                    source={{ uri: sale.artworkThumbnailPath ?? sale.artworkPhotoPath ?? undefined }}
                    style={styles.saleThumb}
                  />
                ) : (
                  <View style={styles.saleThumbPlaceholder}>
                    <Text style={styles.saleThumbText}>Geen foto</Text>
                  </View>
                )}
              </View>
              <View style={styles.saleContent}>
                <Text style={styles.saleTitle}>{sale.artworkTitle}</Text>
                <Text style={styles.saleMeta}>
                  {[formatPrice(sale.salePrice), sale.paymentMethod, sale.paymentStatus]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {sale.contactName ? <Text style={styles.saleMeta}>Koper: {sale.contactName}</Text> : null}
                <Text style={styles.saleMeta}>{formatActivityTimestamp(sale.soldAt)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardHeaderText: {
    flex: 1,
    gap: 6,
  },
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
  salesList: {
    gap: 10,
  },
  saleRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderRadius: 16,
    padding: 4,
  },
  saleRowPressed: {
    opacity: 0.85,
  },
  saleThumbWrap: {
    width: 64,
    height: 64,
  },
  saleThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.softAccent,
  },
  saleThumbPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: palette.softAccent,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  saleThumbText: {
    textAlign: 'center',
    fontSize: 11,
    color: palette.mutedText,
  },
  saleContent: {
    flex: 1,
    gap: 4,
  },
  saleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.text,
  },
  saleMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
});
