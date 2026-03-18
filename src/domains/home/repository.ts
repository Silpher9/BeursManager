import { type SQLiteDatabase } from 'expo-sqlite';

import { getFairById, listFairs } from '@/src/domains/fairs/repository';
import { localIsoDate, localIsoDateOffset } from '@/src/shared/date';

import {
  type HomePrimaryFair,
  type HomePrimaryFairExtended,
  type HomeRecentFairResult,
  type HomeSummary,
} from '@/src/domains/home/types';

type SummaryRow = {
  available_artwork_count: number | null;
  reserved_artwork_count: number | null;
  upcoming_fair_count: number | null;
};

type RecentFairResultRow = {
  fair_id: string;
  fair_name: string;
  fair_end_date: string;
  sales_count: number | null;
  sales_total: number | null;
};

export async function getHomeSummary(db: SQLiteDatabase): Promise<HomeSummary> {
  const today = localIsoDate();
  const row = await db.getFirstAsync<SummaryRow>(
    `SELECT
        COALESCE(SUM(CASE WHEN status = 'beschikbaar' THEN 1 ELSE 0 END), 0) AS available_artwork_count,
        COALESCE(SUM(CASE WHEN status = 'gereserveerd' THEN 1 ELSE 0 END), 0) AS reserved_artwork_count,
        (
          SELECT COUNT(*)
          FROM fairs
          WHERE end_date IS NULL OR end_date >= ?
        ) AS upcoming_fair_count
     FROM artworks`,
    [today]
  );

  return {
    availableArtworkCount: row?.available_artwork_count ?? 0,
    reservedArtworkCount: row?.reserved_artwork_count ?? 0,
    upcomingFairCount: row?.upcoming_fair_count ?? 0,
  };
}

export async function getPrimaryFair(db: SQLiteDatabase): Promise<HomePrimaryFair | null> {
  const today = localIsoDate();
  const fairs = await listFairs(db);

  const activeFair = fairs
    .filter((fair) => isFairActive(fair.startDate, fair.endDate, today))
    .sort(compareByStartDate)[0];

  if (activeFair) {
    return {
      id: activeFair.id,
      name: activeFair.name,
      location: activeFair.location,
      startDate: activeFair.startDate,
      endDate: activeFair.endDate,
      assignedArtworkCount: activeFair.assignedArtworkCount,
      timing: 'active',
    };
  }

  const upcomingFair = fairs
    .filter((fair) => isFairUpcoming(fair.startDate, fair.endDate, today))
    .sort(compareByStartDate)[0];

  if (!upcomingFair) {
    return null;
  }

  return {
    id: upcomingFair.id,
    name: upcomingFair.name,
    location: upcomingFair.location,
    startDate: upcomingFair.startDate,
    endDate: upcomingFair.endDate,
    assignedArtworkCount: upcomingFair.assignedArtworkCount,
    timing: 'upcoming',
  };
}

type FairMetricsRow = {
  assigned_count: number | null;
  sales_count: number | null;
  sales_total: number | null;
  expenses_total: number | null;
  reserved_count: number | null;
  available_count: number | null;
};

export async function getPrimaryFairWithMetrics(
  db: SQLiteDatabase,
  overrideFairId?: string | null
): Promise<HomePrimaryFairExtended | null> {
  let baseFair: HomePrimaryFair | null = null;

  if (overrideFairId) {
    const fair = await getFairById(db, overrideFairId);
    if (fair) {
      baseFair = {
        id: fair.id,
        name: fair.name,
        location: fair.location,
        startDate: fair.startDate,
        endDate: fair.endDate,
        assignedArtworkCount: 0,
        timing: 'active',
      };
    }
  } else {
    baseFair = await getPrimaryFair(db);
  }

  if (!baseFair) return null;

  const metrics = await db.getFirstAsync<FairMetricsRow>(
    `SELECT
      COALESCE((SELECT COUNT(artwork_id) FROM fair_artworks WHERE fair_id = ? AND included = 1), 0) AS assigned_count,
      COALESCE((SELECT COUNT(*) FROM sales WHERE fair_id = ?), 0) AS sales_count,
      COALESCE((SELECT SUM(sale_price) FROM sales WHERE fair_id = ?), 0) AS sales_total,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE fair_id = ?), 0) AS expenses_total,
      COALESCE((
        SELECT COUNT(*)
        FROM fair_artworks fa
        JOIN artworks a ON a.id = fa.artwork_id
        WHERE fa.fair_id = ? AND fa.included = 1 AND fa.sold = 0 AND a.status = 'gereserveerd'
      ), 0) AS reserved_count,
      COALESCE((
        SELECT COUNT(*)
        FROM fair_artworks fa
        JOIN artworks a ON a.id = fa.artwork_id
        WHERE fa.fair_id = ? AND fa.included = 1 AND fa.sold = 0 AND a.status NOT IN ('gereserveerd', 'verkocht')
      ), 0) AS available_count`,
    [baseFair.id, baseFair.id, baseFair.id, baseFair.id, baseFair.id, baseFair.id]
  );

  const salesCount = metrics?.sales_count ?? 0;
  const salesTotal = metrics?.sales_total ?? 0;
  const expensesTotal = metrics?.expenses_total ?? 0;

  return {
    ...baseFair,
    assignedArtworkCount: metrics?.assigned_count ?? 0,
    salesCount,
    salesTotal,
    expensesTotal,
    result: salesTotal - expensesTotal,
    soldCount: salesCount,
    reservedCount: metrics?.reserved_count ?? 0,
    availableCount: metrics?.available_count ?? 0,
    breakEvenProgress: expensesTotal > 0 ? salesTotal / expensesTotal : null,
  };
}

export async function getRecentFairResult(
  db: SQLiteDatabase
): Promise<HomeRecentFairResult | null> {
  const today = localIsoDate();
  const cutoff = localIsoDateOffset(-30);
  const row = await db.getFirstAsync<RecentFairResultRow>(
    `SELECT
        fairs.id AS fair_id,
        fairs.name AS fair_name,
        fairs.end_date AS fair_end_date,
        COUNT(sales.id) AS sales_count,
        COALESCE(SUM(sales.sale_price), 0) AS sales_total
     FROM fairs
     LEFT JOIN sales ON sales.fair_id = fairs.id
     WHERE fairs.end_date IS NOT NULL
       AND fairs.end_date < ?
       AND fairs.end_date >= ?
     GROUP BY fairs.id
     ORDER BY fairs.end_date DESC
     LIMIT 1`,
    [today, cutoff]
  );

  if (!row) {
    return null;
  }

  return {
    fairId: row.fair_id,
    fairName: row.fair_name,
    fairEndDate: row.fair_end_date,
    salesCount: row.sales_count ?? 0,
    salesTotal: row.sales_total ?? 0,
  };
}

function compareByStartDate(
  left: { startDate: string | null; createdAt: string },
  right: { startDate: string | null; createdAt: string }
) {
  const leftKey = left.startDate ?? left.createdAt;
  const rightKey = right.startDate ?? right.createdAt;

  return leftKey.localeCompare(rightKey);
}

function isFairActive(startDate: string | null, endDate: string | null, today: string) {
  return Boolean(startDate && startDate <= today && (!endDate || endDate >= today));
}

function isFairUpcoming(startDate: string | null, endDate: string | null, today: string) {
  return Boolean(startDate && startDate > today && (!endDate || endDate >= startDate));
}

