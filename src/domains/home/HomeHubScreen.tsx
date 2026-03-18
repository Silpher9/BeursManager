import { useIsFocused } from '@react-navigation/native';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatFairDateRange } from '@/src/domains/fairs/formatters';
import {
  getHomeSummary,
  getPrimaryFairWithMetrics,
  getRecentFairResult,
} from '@/src/domains/home/repository';
import {
  type HomePrimaryFairExtended,
  type HomeRecentFairResult,
  type HomeSummary,
} from '@/src/domains/home/types';
import { AppButton } from '@/src/shared/components/AppButton';
import { Card } from '@/src/shared/components/Card';
import { Screen } from '@/src/shared/components/Screen';
import { useFairDayMode } from '@/src/shared/fair-day/FairDayModeProvider';
import { formatPrice } from '@/src/shared/formatters';
import { useAsyncEffect } from '@/src/shared/hooks/useAsyncEffect';
import { useResponsive } from '@/src/shared/hooks/useResponsive';
import { palette } from '@/src/shared/theme/colors';

const SEGMENT_SOLD_COLOR = '#6D5A3A';
const SEGMENT_RESERVED_COLOR = '#C4A96A';
const SEGMENT_AVAILABLE_COLOR = palette.softAccent;

const DONUT_SIZE = 120;
const DONUT_STROKE = 14;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function DonutRing({
  soldPct,
  reservedPct,
}: {
  soldPct: number;
  reservedPct: number;
}) {
  const soldLength = soldPct * DONUT_CIRCUMFERENCE;
  const reservedLength = reservedPct * DONUT_CIRCUMFERENCE;
  const center = DONUT_SIZE / 2;

  return (
    <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
      <Circle
        cx={center}
        cy={center}
        r={DONUT_RADIUS}
        stroke={SEGMENT_AVAILABLE_COLOR}
        strokeWidth={DONUT_STROKE}
        fill="none"
      />
      {reservedPct > 0 ? (
        <Circle
          cx={center}
          cy={center}
          r={DONUT_RADIUS}
          stroke={SEGMENT_RESERVED_COLOR}
          strokeWidth={DONUT_STROKE}
          fill="none"
          strokeDasharray={`${soldLength + reservedLength} ${DONUT_CIRCUMFERENCE}`}
          strokeDashoffset={0}
          strokeLinecap="butt"
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
      {soldPct > 0 ? (
        <Circle
          cx={center}
          cy={center}
          r={DONUT_RADIUS}
          stroke={SEGMENT_SOLD_COLOR}
          strokeWidth={DONUT_STROKE}
          fill="none"
          strokeDasharray={`${soldLength} ${DONUT_CIRCUMFERENCE}`}
          strokeDashoffset={0}
          strokeLinecap="butt"
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
    </Svg>
  );
}

const progressStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: palette.mutedText,
  },
  mainText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  subText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.mutedText,
  },
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginVertical: 4,
  },
  breakEvenSection: {
    gap: 6,
  },
  breakEvenBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.softAccent,
    overflow: 'hidden',
  },
  breakEvenBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: palette.accent,
  },
  breakEvenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

function FairProgressCard({
  primaryFair,
}: {
  primaryFair: HomePrimaryFairExtended | null;
}) {
  if (!primaryFair) return null;

  const { assignedArtworkCount, soldCount, reservedCount, availableCount } = primaryFair;
  const total = assignedArtworkCount;

  const soldPct = total > 0 ? soldCount / total : 0;
  const reservedPct = total > 0 ? reservedCount / total : 0;

  const hasExpenses = primaryFair.expensesTotal > 0;
  const breakEvenPct = hasExpenses
    ? Math.min(primaryFair.salesTotal / primaryFair.expensesTotal, 1)
    : 0;

  return (
    <Card>
      <Text style={styles.sectionTitle}>Beursvoortgang</Text>

      {total > 0 ? (
        <View style={progressStyles.row}>
          <DonutRing soldPct={soldPct} reservedPct={reservedPct} />
          <View style={progressStyles.textColumn}>
            <Text style={progressStyles.mainText}>
              {soldCount} van {total} werken verkocht
            </Text>
            {reservedCount > 0 || availableCount > 0 ? (
              <Text style={progressStyles.subText}>
                {[
                  reservedCount > 0 ? `${reservedCount} gereserveerd` : null,
                  availableCount > 0 ? `${availableCount} nog beschikbaar` : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            ) : null}
            <View style={progressStyles.legendRow}>
              <View style={progressStyles.legendItem}>
                <View style={[progressStyles.legendDot, { backgroundColor: SEGMENT_SOLD_COLOR }]} />
                <Text style={progressStyles.legendText}>verkocht</Text>
              </View>
              <View style={progressStyles.legendItem}>
                <View style={[progressStyles.legendDot, { backgroundColor: SEGMENT_RESERVED_COLOR }]} />
                <Text style={progressStyles.legendText}>gereserveerd</Text>
              </View>
              <View style={progressStyles.legendItem}>
                <View style={[progressStyles.legendDot, { backgroundColor: SEGMENT_AVAILABLE_COLOR }]} />
                <Text style={progressStyles.legendText}>beschikbaar</Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <Text style={progressStyles.subText}>Nog geen werken gekoppeld</Text>
      )}

      <View style={progressStyles.divider} />

      {hasExpenses ? (
        <View style={progressStyles.breakEvenSection}>
          <View style={progressStyles.breakEvenBarTrack}>
            <View
              style={[
                progressStyles.breakEvenBarFill,
                { width: `${Math.round(breakEvenPct * 100)}%` },
              ]}
            />
          </View>
          <Text style={progressStyles.breakEvenLabel}>break-even</Text>
          <Text style={progressStyles.subText}>
            {formatPrice(primaryFair.salesTotal)} omzet / {formatPrice(primaryFair.expensesTotal)}{' '}
            onkosten
          </Text>
        </View>
      ) : (
        <Text style={progressStyles.subText}>Nog geen onkosten geregistreerd</Text>
      )}
    </Card>
  );
}

export function HomeHubScreen() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { activeFair } = useFairDayMode();
  const { isTablet } = useResponsive();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [primaryFair, setPrimaryFair] = useState<HomePrimaryFairExtended | null>(null);
  const [recentFairResult, setRecentFairResult] = useState<HomeRecentFairResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useAsyncEffect(async (isMounted) => {
    if (!isFocused) return;

    setLoading(true);
    setError(null);

    try {
      const [nextSummary, nextPrimaryFair, nextRecentFairResult] = await Promise.all([
        getHomeSummary(db),
        getPrimaryFairWithMetrics(db, activeFair?.fairId),
        getRecentFairResult(db),
      ]);
      if (!isMounted()) return;
      setSummary(nextSummary);
      setPrimaryFair(nextPrimaryFair);
      setRecentFairResult(nextRecentFairResult);
    } catch {
      if (!isMounted()) return;
      setError('Home kon niet geladen worden.');
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [db, isFocused, activeFair?.fairId]);

  return (
    <Screen scroll={!isTablet}>
      {loading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.stateText}>Home laden...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <Card>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {!loading && !error ? (
        isTablet ? (
          <View style={styles.tabletFillWrapper}>
            <View style={styles.tabletTopRow}>
              <View style={styles.tabletHeroColumn}>
                <PrimaryFairCard
                  primaryFair={primaryFair}
                  onOpenFair={(nextFairId) => router.push(`/fairs/${nextFairId}`)}
                />
              </View>
              <View style={styles.tabletActionColumn}>
                <QuickActionsCard hasFair={primaryFair !== null} />
              </View>
            </View>
            <FairProgressCard primaryFair={primaryFair} />
            <View style={styles.tabletBottomRow}>
              <View style={styles.tabletHalfColumn}>
                <SummaryCard summary={summary} />
              </View>
              <View style={styles.tabletHalfColumn}>
                <RecentFairResultCard
                  recentFairResult={recentFairResult}
                  onOpenFair={(nextFairId) => router.push(`/fairs/${nextFairId}`)}
                />
              </View>
            </View>
          </View>
        ) : (
          <>
            <PrimaryFairCard
              primaryFair={primaryFair}
              onOpenFair={(nextFairId) => router.push(`/fairs/${nextFairId}`)}
            />
            <FairProgressCard primaryFair={primaryFair} />
            <QuickActionsCard hasFair={primaryFair !== null} />
            <SummaryCard summary={summary} />
            <RecentFairResultCard
              recentFairResult={recentFairResult}
              onOpenFair={(nextFairId) => router.push(`/fairs/${nextFairId}`)}
            />
          </>
        )
      ) : null}
    </Screen>
  );
}

type PrimaryFairCardProps = {
  primaryFair: HomePrimaryFairExtended | null;
  onOpenFair: (fairId: string) => void;
};

function PrimaryFairCard({ primaryFair, onOpenFair }: PrimaryFairCardProps) {
  return (
    <Card>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Actieve of eerstvolgende beurs</Text>
        {primaryFair ? (
          <Text
            style={[
              styles.statusPill,
              primaryFair.timing === 'active' ? styles.statusPillActive : null,
            ]}>
            {primaryFair.timing === 'active' ? 'Actief' : 'Komt eraan'}
          </Text>
        ) : null}
      </View>

      {primaryFair ? (
        <>
          <Text style={styles.primaryTitle}>{primaryFair.name}</Text>
          <Text style={styles.metaText}>
            {primaryFair.location || 'Locatie nog leeg'} ·{' '}
            {formatFairDateRange(primaryFair.startDate, primaryFair.endDate)}
          </Text>
          <View style={styles.metricsRow}>
            <MetricTile value={`${primaryFair.assignedArtworkCount}`} label="werken" />
            <MetricTile value={`${primaryFair.salesCount}`} label="verkopen" />
            <MetricTile value={formatPrice(primaryFair.salesTotal, 'EUR 0') ?? 'EUR 0'} label="omzet" />
            <MetricTile
              value={formatPrice(primaryFair.result, 'EUR 0') ?? 'EUR 0'}
              label="resultaat"
            />
          </View>
          <View style={styles.inlineActionsRow}>
            <AppButton
              label="Verkoop"
              variant="secondary"
              compact
              stretch
              onPress={() => router.push(`/fairs/${primaryFair.id}/sales/new`)}
            />
            <AppButton
              label="Contact"
              variant="secondary"
              compact
              stretch
              onPress={() => router.push(`/contacts/new?fairId=${primaryFair.id}`)}
            />
            <AppButton
              label="Onkosten"
              variant="secondary"
              compact
              stretch
              onPress={() => router.push(`/fairs/${primaryFair.id}/expenses/new`)}
            />
          </View>
          <AppButton
            label="Beurs beheren"
            variant="secondary"
            onPress={() => onOpenFair(primaryFair.id)}
          />
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>Nog geen aankomende beurzen</Text>
          <Text style={styles.emptyText}>
            Maak je eerste beurs aan en gebruik Home daarna als praktische startlaag.
          </Text>
          <AppButton label="Maak eerste beurs aan" onPress={() => router.push('/fairs/new')} />
        </>
      )}
    </Card>
  );
}

type QuickActionsCardProps = {
  hasFair: boolean;
};

function QuickActionsCard({ hasFair }: QuickActionsCardProps) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Snelle acties</Text>
      <View style={styles.actionGrid}>
        <QuickActionTile
          label="Nieuw kunstwerk"
          description="Voeg direct een werk toe aan je voorraad."
          icon={{ ios: 'photo.stack.fill', android: 'imagesmode', web: 'imagesmode' }}
          accentColor="#6D5A3A"
          surfaceColor="#EFE6D7"
          onPress={() => router.push('/inventory/new')}
        />
        <QuickActionTile
          label="Nieuwe beurs"
          description="Plan een nieuwe beurs en koppel daarna je selectie."
          icon={{ ios: 'calendar.badge.plus', android: 'calendar_add_on', web: 'calendar_add_on' }}
          accentColor={hasFair ? '#8B8478' : '#4E5F88'}
          surfaceColor={hasFair ? '#F0ECE6' : '#E4EAF7'}
          onPress={() => router.push('/fairs/new')}
        />
      </View>
    </Card>
  );
}

type HomeActionIcon = {
  ios: 'photo.stack.fill' | 'calendar.badge.plus';
  android: 'imagesmode' | 'calendar_add_on';
  web: 'imagesmode' | 'calendar_add_on';
};

type QuickActionTileProps = {
  label: string;
  description: string;
  icon: HomeActionIcon;
  accentColor: string;
  surfaceColor: string;
  onPress: () => void;
};

function QuickActionTile({
  label,
  description,
  icon,
  accentColor,
  surfaceColor,
  onPress,
}: QuickActionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionTile,
        styles.actionTileFull,
        { backgroundColor: surfaceColor },
        pressed && styles.actionTilePressed,
      ]}>
      <View style={styles.actionHeader}>
        <View style={[styles.actionIconWrap, { backgroundColor: accentColor }]}>
          <SymbolView name={icon} tintColor="#FFFDF9" size={18} weight="medium" />
        </View>
        <Text style={styles.actionTitle}>{label}</Text>
      </View>
      <Text style={styles.actionDescription}>{description}</Text>
    </Pressable>
  );
}

function SummaryCard({ summary }: { summary: HomeSummary | null }) {
  return (
    <Card>
      <Text style={styles.sectionTitle}>Atelier overzicht</Text>
      <View style={styles.summaryGrid}>
        <MetricTile value={`${summary?.availableArtworkCount ?? 0}`} label="beschikbaar" />
        <MetricTile value={`${summary?.reservedArtworkCount ?? 0}`} label="gereserveerd" />
      </View>
    </Card>
  );
}

type RecentFairResultCardProps = {
  recentFairResult: HomeRecentFairResult | null;
  onOpenFair: (fairId: string) => void;
};

function RecentFairResultCard({
  recentFairResult,
  onOpenFair,
}: RecentFairResultCardProps) {
  if (!recentFairResult) {
    return null;
  }

  return (
    <Card>
      <Text style={styles.sectionTitle}>Laatste beursresultaat</Text>
      <Text style={styles.primaryTitle}>{recentFairResult.fairName}</Text>
      <Text style={styles.metaText}>
        Afgesloten op {formatFairDateRange(recentFairResult.fairEndDate, null)}
      </Text>
      <View style={styles.summaryGrid}>
        <MetricTile
          value={formatPrice(recentFairResult.salesTotal, 'EUR 0') ?? 'EUR 0'}
          label="omzet"
        />
        <MetricTile value={`${recentFairResult.salesCount}`} label="verkopen" />
      </View>
      <AppButton
        label="Open beurs"
        variant="secondary"
        onPress={() => onOpenFair(recentFairResult.fairId)}
      />
    </Card>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: palette.softAccent,
    color: palette.accent,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  statusPillActive: {
    backgroundColor: '#DFE9DE',
    color: '#466245',
  },
  primaryTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    color: palette.text,
  },
  metaText: {
    fontSize: 15,
    lineHeight: 23,
    color: palette.mutedText,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.text,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.mutedText,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inlineActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricTile: {
    flex: 1,
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionTile: {
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  actionTileFull: {
    width: '100%',
  },
  actionTilePressed: {
    opacity: 0.85,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: palette.text,
    flex: 1,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.mutedText,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tabletFillWrapper: {
    flex: 1,
    gap: 16,
  },
  tabletTopRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletHeroColumn: {
    flex: 3,
  },
  tabletActionColumn: {
    flex: 1,
  },
  tabletBottomRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tabletHalfColumn: {
    flex: 1,
  },
});
