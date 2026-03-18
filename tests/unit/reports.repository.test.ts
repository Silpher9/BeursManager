import { describe, expect, it, vi } from 'vitest';

import { getReportData } from '@/src/domains/reports/repository';
import { barWidthPercent } from '@/src/domains/reports/formatters';

// --- Helper: build a mock db that routes queries by content ---

function mockDb(config: {
  years?: Array<{ year: number }>;
  summaryRevenue?: { fair_count: number; sales_count: number; total_revenue: number };
  summaryExpenses?: { total_expenses: number };
  fairRows?: Array<{
    id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    sales_count: number;
    revenue: number;
    expenses: number;
  }>;
  techniqueRows?: Array<{ technique: string; sales_count: number; total_revenue: number }>;
  topArtworks?: Array<{
    id: string;
    title: string;
    technique: string | null;
    thumbnail_path: string | null;
    photo_path: string | null;
    sale_price: number;
    fair_name: string;
    sold_at: string;
  }>;
}) {
  return {
    getAllAsync: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('DISTINCT CAST(substr(start_date')) {
        return Promise.resolve(config.years ?? []);
      }
      if (sql.includes('GROUP BY f.id')) {
        return Promise.resolve(config.fairRows ?? []);
      }
      if (sql.includes("COALESCE(a.technique, 'Onbekend')")) {
        return Promise.resolve(config.techniqueRows ?? []);
      }
      if (sql.includes('a.thumbnail_path')) {
        return Promise.resolve(config.topArtworks ?? []);
      }
      return Promise.resolve([]);
    }),
    getFirstAsync: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes('total_expenses')) {
        return Promise.resolve(config.summaryExpenses ?? { total_expenses: 0 });
      }
      if (sql.includes('fair_count')) {
        return Promise.resolve(
          config.summaryRevenue ?? { fair_count: 0, sales_count: 0, total_revenue: 0 }
        );
      }
      return Promise.resolve(null);
    }),
  };
}

// --- Tests ---

describe('reports repository', () => {
  it('maps summary with correct profit and average', async () => {
    const db = mockDb({
      summaryRevenue: { fair_count: 3, sales_count: 5, total_revenue: 9000 },
      summaryExpenses: { total_expenses: 3000 },
    });

    const result = await getReportData(db as never, null);

    expect(result.summary).toEqual({
      fairCount: 3,
      salesCount: 5,
      totalRevenue: 9000,
      totalExpenses: 3000,
      totalProfit: 6000,
      averageRevenuePerFair: 3000,
    });
  });

  it('handles zero fairs without division by zero', async () => {
    const db = mockDb({
      summaryRevenue: { fair_count: 0, sales_count: 0, total_revenue: 0 },
      summaryExpenses: { total_expenses: 0 },
    });

    const result = await getReportData(db as never, null);

    expect(result.summary.averageRevenuePerFair).toBe(0);
  });

  it('keeps sales and expenses separate (no cross-join inflation)', async () => {
    // A fair with 2 sales (total 1000) and 3 expenses (total 600).
    // Without separate queries this would cross-join to 6 rows and inflate totals.
    const db = mockDb({
      summaryRevenue: { fair_count: 1, sales_count: 2, total_revenue: 1000 },
      summaryExpenses: { total_expenses: 600 },
      fairRows: [
        {
          id: 'f1',
          name: 'Beurs A',
          start_date: '2026-03-01',
          end_date: '2026-03-03',
          sales_count: 2,
          revenue: 1000,
          expenses: 600,
        },
      ],
    });

    const result = await getReportData(db as never, null);

    expect(result.summary.totalRevenue).toBe(1000);
    expect(result.summary.totalExpenses).toBe(600);
    expect(result.summary.totalProfit).toBe(400);

    expect(result.fairRows[0].revenue).toBe(1000);
    expect(result.fairRows[0].expenses).toBe(600);
    expect(result.fairRows[0].profit).toBe(400);
  });

  it('maps fair rows with profit calculation', async () => {
    const db = mockDb({
      fairRows: [
        {
          id: 'f1',
          name: 'Art Breda',
          start_date: '2026-03-01',
          end_date: '2026-03-03',
          sales_count: 3,
          revenue: 4500,
          expenses: 1200,
        },
        {
          id: 'f2',
          name: 'KunstRAI',
          start_date: '2026-06-10',
          end_date: '2026-06-12',
          sales_count: 0,
          revenue: 0,
          expenses: 800,
        },
      ],
    });

    const result = await getReportData(db as never, null);

    expect(result.fairRows).toHaveLength(2);
    expect(result.fairRows[0]).toMatchObject({
      fairId: 'f1',
      fairName: 'Art Breda',
      profit: 3300,
    });
    // Fair with only expenses → negative profit
    expect(result.fairRows[1]).toMatchObject({
      fairId: 'f2',
      fairName: 'KunstRAI',
      revenue: 0,
      expenses: 800,
      profit: -800,
    });
  });

  it('maps technique rows including "Onbekend" for null technique', async () => {
    const db = mockDb({
      techniqueRows: [
        { technique: 'Olieverf', sales_count: 4, total_revenue: 6000 },
        { technique: 'Onbekend', sales_count: 1, total_revenue: 500 },
      ],
    });

    const result = await getReportData(db as never, null);

    expect(result.techniqueRows).toHaveLength(2);
    expect(result.techniqueRows[1]).toEqual({
      technique: 'Onbekend',
      salesCount: 1,
      totalRevenue: 500,
    });
  });

  it('maps top artwork rows with all fields', async () => {
    const db = mockDb({
      topArtworks: [
        {
          id: 'a1',
          title: 'Zonsondergang',
          technique: 'Acryl',
          thumbnail_path: '/thumbs/a1.jpg',
          photo_path: '/photos/a1.jpg',
          sale_price: 2500,
          fair_name: 'Art Breda',
          sold_at: '2026-03-02T14:30:00.000Z',
        },
      ],
    });

    const result = await getReportData(db as never, null);

    expect(result.topArtworks[0]).toEqual({
      artworkId: 'a1',
      artworkTitle: 'Zonsondergang',
      technique: 'Acryl',
      thumbnailPath: '/thumbs/a1.jpg',
      photoPath: '/photos/a1.jpg',
      salePrice: 2500,
      fairName: 'Art Breda',
      soldAt: '2026-03-02T14:30:00.000Z',
    });
  });

  it('passes year filter as string to all queries', async () => {
    const db = mockDb({
      years: [{ year: 2026 }, { year: 2025 }],
    });

    await getReportData(db as never, 2026);

    // Every getFirstAsync call should receive ['2026', '2026']
    for (const call of db.getFirstAsync.mock.calls) {
      expect(call[1]).toEqual(['2026', '2026']);
    }
    // getAllAsync calls (except getAvailableYears which has no params) should also get year filter
    const filteredCalls = db.getAllAsync.mock.calls.filter(
      (call: unknown[]) => Array.isArray(call[1]) && call[1].length === 2
    );
    for (const call of filteredCalls) {
      expect(call[1]).toEqual(['2026', '2026']);
    }
  });

  it('passes null year when no filter is selected', async () => {
    const db = mockDb({});

    await getReportData(db as never, null);

    for (const call of db.getFirstAsync.mock.calls) {
      expect(call[1]).toEqual([null, null]);
    }
  });

  it('returns available years from the facade', async () => {
    const db = mockDb({
      years: [{ year: 2026 }, { year: 2025 }, { year: 2024 }],
    });

    const result = await getReportData(db as never, null);

    expect(result.availableYears).toEqual([2026, 2025, 2024]);
  });

  it('handles null values in summary rows gracefully', async () => {
    const db = mockDb({
      summaryRevenue: { fair_count: null as unknown as number, sales_count: null as unknown as number, total_revenue: null as unknown as number },
      summaryExpenses: { total_expenses: null as unknown as number },
    });

    const result = await getReportData(db as never, null);

    expect(result.summary).toEqual({
      fairCount: 0,
      salesCount: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      averageRevenuePerFair: 0,
    });
  });
});

describe('barWidthPercent', () => {
  it('returns 100 for the max value', () => {
    expect(barWidthPercent(500, 500)).toBe(100);
  });

  it('returns 50 for half the max', () => {
    expect(barWidthPercent(250, 500)).toBe(50);
  });

  it('returns 0 when maxValue is 0', () => {
    expect(barWidthPercent(100, 0)).toBe(0);
  });

  it('returns 0 when maxValue is negative', () => {
    expect(barWidthPercent(100, -10)).toBe(0);
  });

  it('clamps to 0 for negative values', () => {
    expect(barWidthPercent(-50, 100)).toBe(0);
  });

  it('clamps to 100 for values exceeding max', () => {
    expect(barWidthPercent(200, 100)).toBe(100);
  });
});
