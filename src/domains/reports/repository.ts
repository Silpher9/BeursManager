import { type SQLiteDatabase } from 'expo-sqlite';

import {
  type FairReportRow,
  type ReportData,
  type ReportSummary,
  type TechniqueReportRow,
  type TopArtworkRow,
} from '@/src/domains/reports/types';

// --- Row types (snake_case from SQLite) ---

type SummaryRevenueRow = {
  fair_count: number | null;
  sales_count: number | null;
  total_revenue: number | null;
};

type SummaryExpensesRow = {
  total_expenses: number | null;
};

type FairRow = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  sales_count: number | null;
  revenue: number | null;
  expenses: number | null;
};

type TechniqueRow = {
  technique: string;
  sales_count: number | null;
  total_revenue: number | null;
};

type TopArtworkSqlRow = {
  id: string;
  title: string;
  technique: string | null;
  thumbnail_path: string | null;
  photo_path: string | null;
  sale_price: number;
  fair_name: string;
  sold_at: string;
};

type YearRow = {
  year: number;
};

// --- Helpers ---

/** Build parameter array for year filter: [yearStr, yearStr] */
function yearParams(yearStr: string | null): [string | null, string | null] {
  return [yearStr, yearStr];
}

// --- Queries ---

async function getAvailableYears(db: SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<YearRow>(
    `SELECT DISTINCT CAST(substr(start_date, 1, 4) AS INTEGER) AS year
     FROM fairs
     WHERE start_date IS NOT NULL
     ORDER BY year DESC`
  );
  return rows.map((r) => r.year);
}

async function getReportSummary(
  db: SQLiteDatabase,
  yearStr: string | null
): Promise<ReportSummary> {
  // Two separate queries to avoid cross-join between sales and expenses
  const [revenueRow, expensesRow] = await Promise.all([
    db.getFirstAsync<SummaryRevenueRow>(
      `SELECT
         COUNT(DISTINCT f.id) AS fair_count,
         COUNT(s.id) AS sales_count,
         COALESCE(SUM(s.sale_price), 0) AS total_revenue
       FROM fairs f
       LEFT JOIN sales s ON s.fair_id = f.id
       WHERE (? IS NULL OR substr(f.start_date, 1, 4) = ?)`,
      yearParams(yearStr)
    ),
    db.getFirstAsync<SummaryExpensesRow>(
      `SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
       FROM expenses e
       INNER JOIN fairs f ON f.id = e.fair_id
       WHERE (? IS NULL OR substr(f.start_date, 1, 4) = ?)`,
      yearParams(yearStr)
    ),
  ]);

  const fairCount = revenueRow?.fair_count ?? 0;
  const salesCount = revenueRow?.sales_count ?? 0;
  const totalRevenue = revenueRow?.total_revenue ?? 0;
  const totalExpenses = expensesRow?.total_expenses ?? 0;

  return {
    fairCount,
    salesCount,
    totalRevenue,
    totalExpenses,
    totalProfit: totalRevenue - totalExpenses,
    averageRevenuePerFair: fairCount > 0 ? totalRevenue / fairCount : 0,
  };
}

async function getFairReportRows(
  db: SQLiteDatabase,
  yearStr: string | null
): Promise<FairReportRow[]> {
  // Correlated subquery for expenses avoids cross-join with sales
  const rows = await db.getAllAsync<FairRow>(
    `SELECT
       f.id,
       f.name,
       f.start_date,
       f.end_date,
       COUNT(s.id) AS sales_count,
       COALESCE(SUM(s.sale_price), 0) AS revenue,
       COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.fair_id = f.id), 0) AS expenses
     FROM fairs f
     LEFT JOIN sales s ON s.fair_id = f.id
     WHERE (? IS NULL OR substr(f.start_date, 1, 4) = ?)
     GROUP BY f.id
     ORDER BY f.start_date DESC, f.created_at DESC`,
    yearParams(yearStr)
  );

  return rows.map((r) => ({
    fairId: r.id,
    fairName: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    salesCount: r.sales_count ?? 0,
    revenue: r.revenue ?? 0,
    expenses: r.expenses ?? 0,
    profit: (r.revenue ?? 0) - (r.expenses ?? 0),
  }));
}

async function getTechniqueReportRows(
  db: SQLiteDatabase,
  yearStr: string | null
): Promise<TechniqueReportRow[]> {
  const rows = await db.getAllAsync<TechniqueRow>(
    `SELECT
       COALESCE(a.technique, 'Onbekend') AS technique,
       COUNT(s.id) AS sales_count,
       COALESCE(SUM(s.sale_price), 0) AS total_revenue
     FROM sales s
     INNER JOIN artworks a ON a.id = s.artwork_id
     INNER JOIN fairs f ON f.id = s.fair_id
     WHERE (? IS NULL OR substr(f.start_date, 1, 4) = ?)
     GROUP BY COALESCE(a.technique, 'Onbekend')
     ORDER BY total_revenue DESC
     LIMIT 10`,
    yearParams(yearStr)
  );

  return rows.map((r) => ({
    technique: r.technique,
    salesCount: r.sales_count ?? 0,
    totalRevenue: r.total_revenue ?? 0,
  }));
}

async function getTopArtworks(
  db: SQLiteDatabase,
  yearStr: string | null
): Promise<TopArtworkRow[]> {
  const rows = await db.getAllAsync<TopArtworkSqlRow>(
    `SELECT
       a.id,
       a.title,
       a.technique,
       a.thumbnail_path,
       a.photo_path,
       s.sale_price,
       f.name AS fair_name,
       s.sold_at
     FROM sales s
     INNER JOIN artworks a ON a.id = s.artwork_id
     INNER JOIN fairs f ON f.id = s.fair_id
     WHERE (? IS NULL OR substr(f.start_date, 1, 4) = ?)
     ORDER BY s.sale_price DESC
     LIMIT 10`,
    yearParams(yearStr)
  );

  return rows.map((r) => ({
    artworkId: r.id,
    artworkTitle: r.title,
    technique: r.technique,
    thumbnailPath: r.thumbnail_path,
    photoPath: r.photo_path,
    salePrice: r.sale_price,
    fairName: r.fair_name,
    soldAt: r.sold_at,
  }));
}

// --- Facade ---

export async function getReportData(
  db: SQLiteDatabase,
  year: number | null
): Promise<ReportData> {
  const yearStr = year?.toString() ?? null;

  const [availableYears, summary, fairRows, techniqueRows, topArtworks] = await Promise.all([
    getAvailableYears(db),
    getReportSummary(db, yearStr),
    getFairReportRows(db, yearStr),
    getTechniqueReportRows(db, yearStr),
    getTopArtworks(db, yearStr),
  ]);

  return { summary, fairRows, techniqueRows, topArtworks, availableYears };
}
