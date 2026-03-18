import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getReportData } from '@/src/domains/reports/repository';
import { barWidthPercent } from '@/src/domains/reports/formatters';
import { type ReportData } from '@/src/domains/reports/types';
import { formatFairDateRange } from '@/src/domains/fairs/formatters';
import { Card } from '@/src/shared/components/Card';
import { EmptyState } from '@/src/shared/components/EmptyState';
import { FilterChip } from '@/src/shared/components/FilterChip';
import { LoadingView } from '@/src/shared/components/LoadingView';
import { Screen } from '@/src/shared/components/Screen';
import { formatPrice } from '@/src/shared/formatters';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

export function ReportsScreen() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { isTablet } = useResponsive();
  const [data, setData] = useState<ReportData | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    setLoading(true);
    try {
      const result = await getReportData(db, selectedYear);
      if (!isMounted()) return;
      setData(result);
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, isFocused, selectedYear]);

  const maxRevenue = useMemo(
    () => Math.max(0, ...(data?.fairRows.map((r) => r.revenue) ?? [])),
    [data?.fairRows]
  );

  const maxTechniqueRevenue = useMemo(
    () => Math.max(0, ...(data?.techniqueRows.map((r) => r.totalRevenue) ?? [])),
    [data?.techniqueRows]
  );

  if (loading) {
    return <LoadingView label="Rapporten laden..." />;
  }

  // Global empty state: no fairs at all
  if (!data || data.summary.fairCount === 0) {
    return (
      <Screen scroll>
        <Card>
          <Text style={styles.pageTitle}>Rapporten</Text>
          <Text style={styles.heroTitle}>Overzicht</Text>
          <Text style={styles.emptyHint}>
            Voeg eerst een beurs toe om rapporten te kunnen bekijken.
          </Text>
        </Card>

        <EmptyState
          title="Nog geen rapportdata"
          description="Voeg eerst een beurs toe om rapporten te kunnen bekijken."
          actionLabel="Ga naar beurzen"
          onAction={() => router.push('/fairs')}
        />
      </Screen>
    );
  }

  const showYearFilter = data.availableYears.length > 1;

  const summarySection = (
    <Card>
      <Text style={styles.pageTitle}>Rapporten</Text>
      <Text style={styles.heroTitle}>Overzicht</Text>

      {showYearFilter && (
        <View style={styles.filterRow}>
          <FilterChip
            label="Alle jaren"
            active={selectedYear === null}
            onPress={() => setSelectedYear(null)}
          />
          {data.availableYears.map((year) => (
            <FilterChip
              key={year}
              label={`${year}`}
              active={selectedYear === year}
              onPress={() => setSelectedYear(year)}
            />
          ))}
        </View>
      )}

      <View style={styles.metricsGrid}>
        <MetricTile value={`${data.summary.fairCount}`} label="beurzen" />
        <MetricTile value={`${data.summary.salesCount}`} label="verkopen" />
        <MetricTile value={formatPrice(data.summary.totalRevenue, 'EUR 0') ?? 'EUR 0'} label="omzet" />
        <MetricTile value={formatPrice(data.summary.totalExpenses, 'EUR 0') ?? 'EUR 0'} label="kosten" />
        <MetricTile
          value={formatPrice(data.summary.totalProfit, 'EUR 0') ?? 'EUR 0'}
          label="resultaat"
        />
        <MetricTile
          value={formatPrice(Math.round(data.summary.averageRevenuePerFair), 'EUR 0') ?? 'EUR 0'}
          label="gem. omzet/beurs"
        />
        <MetricTile
          value={formatPrice(
            data.summary.salesCount > 0
              ? Math.round(data.summary.totalRevenue / data.summary.salesCount)
              : 0,
            'EUR 0'
          ) ?? 'EUR 0'}
          label="gem. verkoopprijs"
        />
      </View>
    </Card>
  );

  const bestFair = data.fairRows.reduce((best, row) =>
    row.profit > best.profit ? row : best, data.fairRows[0]);
  const worstFair = data.fairRows.reduce((worst, row) =>
    row.profit < worst.profit ? row : worst, data.fairRows[0]);
  const showHighlights = bestFair && worstFair && bestFair.fairId !== worstFair.fairId;

  const highlightsSection = showHighlights ? (
    <Card>
      <Text style={styles.sectionTitle}>Highlights</Text>
      <View style={styles.highlightRow}>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightLabel}>Beste resultaat</Text>
          <Text style={styles.highlightFairName}>{bestFair.fairName}</Text>
          <Text style={styles.highlightValue}>
            {formatPrice(bestFair.profit, 'EUR 0')}
          </Text>
        </View>
        <View style={styles.highlightItem}>
          <Text style={styles.highlightLabel}>Zwakste resultaat</Text>
          <Text style={styles.highlightFairName}>{worstFair.fairName}</Text>
          <Text style={[
            styles.highlightValue,
            worstFair.profit < 0 && styles.highlightValueNegative,
          ]}>
            {formatPrice(worstFair.profit, 'EUR 0')}
          </Text>
        </View>
      </View>
    </Card>
  ) : null;

  const fairsSection = (
    <Card>
      <Text style={styles.sectionTitle}>Per beurs</Text>
      <Text style={styles.sectionHint}>Omzet en kosten per beurs, gesorteerd op datum.</Text>
      {data.fairRows.map((fair) => (
        <Pressable
          key={fair.fairId}
          onPress={() => router.push(`/fairs/${fair.fairId}`)}
          style={({ pressed }) => [styles.fairRow, pressed && styles.fairRowPressed]}>
          <View style={styles.fairRowHeader}>
            <Text style={styles.fairRowName} numberOfLines={1}>
              {fair.fairName}
            </Text>
            <Text style={styles.fairRowDate}>
              {formatFairDateRange(fair.startDate ?? undefined, fair.endDate ?? undefined)}
            </Text>
          </View>
          <Text style={styles.fairRowMeta}>
            {fair.salesCount} {fair.salesCount === 1 ? 'verkoop' : 'verkopen'}
          </Text>
          <View style={styles.fairBarGroup}>
            <View style={styles.fairBarRow}>
              <Text style={styles.barLabel}>Omzet</Text>
              <HorizontalBar value={fair.revenue} maxValue={maxRevenue} color={palette.accent} />
              <Text style={styles.barValue}>{formatPrice(fair.revenue, 'EUR 0')}</Text>
            </View>
            <View style={styles.fairBarRow}>
              <Text style={styles.barLabel}>Kosten</Text>
              <HorizontalBar value={fair.expenses} maxValue={maxRevenue} color={palette.danger} />
              <Text style={styles.barValue}>{formatPrice(fair.expenses, 'EUR 0')}</Text>
            </View>
          </View>
          <Text style={[styles.fairResult, fair.profit < 0 && styles.fairResultNegative]}>
            Resultaat: {formatPrice(fair.profit, 'EUR 0')}
          </Text>
        </Pressable>
      ))}
    </Card>
  );

  const techniquesSection =
    data.techniqueRows.length > 0 ? (
      <Card>
        <Text style={styles.sectionTitle}>Technieken</Text>
        <Text style={styles.sectionHint}>Omzet en aantal verkopen per techniek.</Text>
        {data.techniqueRows.map((row) => (
          <View key={row.technique} style={styles.techniqueRow}>
            <View style={styles.techniqueHeader}>
              <Text style={styles.techniqueName}>{row.technique}</Text>
              <Text style={styles.techniqueMeta}>
                {row.salesCount} {row.salesCount === 1 ? 'verkoop' : 'verkopen'}
              </Text>
            </View>
            <View style={styles.techniqueBarRow}>
              <HorizontalBar
                value={row.totalRevenue}
                maxValue={maxTechniqueRevenue}
                color={palette.accent}
              />
              <Text style={styles.barValue}>{formatPrice(row.totalRevenue, 'EUR 0')}</Text>
            </View>
          </View>
        ))}
      </Card>
    ) : (
      <Card>
        <Text style={styles.sectionTitle}>Technieken</Text>
        <Text style={styles.emptyHint}>Nog geen verkopen geregistreerd.</Text>
      </Card>
    );

  const topArtworksSection =
    data.topArtworks.length > 0 ? (
      <Card>
        <Text style={styles.sectionTitle}>Top verkopen</Text>
        <Text style={styles.sectionHint}>De 10 duurste verkochte werken.</Text>
        {data.topArtworks.map((artwork, index) => (
          <View key={`${artwork.artworkId}-${index}`} style={styles.topArtworkRow}>
            <Text style={styles.topArtworkRank}>{index + 1}</Text>
            <View style={styles.topArtworkThumbWrap}>
              {artwork.thumbnailPath || artwork.photoPath ? (
                <Image
                  source={{ uri: artwork.thumbnailPath ?? artwork.photoPath ?? undefined }}
                  style={styles.topArtworkThumb}
                />
              ) : (
                <View style={styles.topArtworkThumbPlaceholder}>
                  <Text style={styles.topArtworkThumbText}>?</Text>
                </View>
              )}
            </View>
            <View style={styles.topArtworkContent}>
              <Text style={styles.topArtworkTitle} numberOfLines={1}>
                {artwork.artworkTitle}
              </Text>
              <Text style={styles.topArtworkMeta} numberOfLines={1}>
                {[formatPrice(artwork.salePrice), artwork.technique, artwork.fairName]
                  .filter(Boolean)
                  .join(' \u00B7 ')}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    ) : (
      <Card>
        <Text style={styles.sectionTitle}>Top verkopen</Text>
        <Text style={styles.emptyHint}>Nog geen verkopen geregistreerd.</Text>
      </Card>
    );

  return (
      <Screen scroll>
        {summarySection}
        {highlightsSection}

        {isTablet ? (
          <View style={styles.tabletColumns}>
            <View style={styles.tabletMainColumn}>{fairsSection}</View>
            <View style={styles.tabletSideColumn}>
              {techniquesSection}
              {topArtworksSection}
            </View>
          </View>
        ) : (
          <>
            {fairsSection}
            {techniquesSection}
            {topArtworksSection}
          </>
        )}
      </Screen>
  );
}

// --- Local sub-components ---

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function HorizontalBar({
  value,
  maxValue,
  color,
}: {
  value: number;
  maxValue: number;
  color: string;
}) {
  const width = barWidthPercent(value, maxValue);
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color }]} />
    </View>
  );
}

// --- Styles ---

const POSITIVE_COLOR = '#466245';

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: palette.text,
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    color: palette.text,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  metricTile: {
    flex: 1,
    minWidth: 120,
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    justifyContent: 'space-between',
    gap: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
  },
  metricLabel: {
    fontSize: 13,
    color: palette.mutedText,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.text,
  },
  sectionHint: {
    marginTop: 4,
    fontSize: 14,
    color: palette.mutedText,
  },
  emptyHint: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: palette.mutedText,
  },

  // Highlights
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  highlightItem: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: palette.softAccent,
    padding: 14,
    gap: 4,
  },
  highlightLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.mutedText,
  },
  highlightFairName: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  highlightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: POSITIVE_COLOR,
  },
  highlightValueNegative: {
    color: palette.danger,
  },

  // Fair rows
  fairRow: {
    marginTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  fairRowPressed: {
    opacity: 0.7,
  },
  fairRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  fairRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    flex: 1,
  },
  fairRowDate: {
    fontSize: 13,
    color: palette.mutedText,
  },
  fairRowMeta: {
    fontSize: 13,
    color: palette.mutedText,
    marginTop: 2,
  },
  fairBarGroup: {
    marginTop: 10,
    gap: 6,
  },
  fairBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 52,
    fontSize: 13,
    color: palette.mutedText,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.softAccent,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barValue: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
    textAlign: 'right',
  },
  fairResult: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: POSITIVE_COLOR,
  },
  fairResultNegative: {
    color: palette.danger,
  },

  // Technique rows
  techniqueRow: {
    marginTop: 14,
  },
  techniqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  techniqueName: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  techniqueMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },
  techniqueBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },

  // Top artworks
  topArtworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  topArtworkRank: {
    width: 24,
    fontSize: 16,
    fontWeight: '700',
    color: palette.mutedText,
    textAlign: 'center',
  },
  topArtworkThumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: palette.softAccent,
  },
  topArtworkThumb: {
    width: 48,
    height: 48,
  },
  topArtworkThumbPlaceholder: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topArtworkThumbText: {
    fontSize: 16,
    color: palette.mutedText,
  },
  topArtworkContent: {
    flex: 1,
    gap: 2,
  },
  topArtworkTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.text,
  },
  topArtworkMeta: {
    fontSize: 13,
    color: palette.mutedText,
  },

  // Tablet layout
  tabletColumns: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletMainColumn: {
    flex: 3,
  },
  tabletSideColumn: {
    flex: 2,
    gap: 16,
  },
});
