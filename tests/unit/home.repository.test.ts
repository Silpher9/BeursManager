import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getHomeSummary,
  getPrimaryFair,
  getPrimaryFairWithMetrics,
  getRecentFairResult,
} from '@/src/domains/home/repository';

const { listFairsMock, getFairByIdMock } = vi.hoisted(() => ({
  listFairsMock: vi.fn(),
  getFairByIdMock: vi.fn(),
}));

vi.mock('@/src/domains/fairs/repository', () => ({
  listFairs: listFairsMock,
  getFairById: getFairByIdMock,
}));

describe('home repository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 13, 10, 0, 0));
    listFairsMock.mockReset();
    getFairByIdMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds the summary from db aggregates', async () => {
    const db = {
      getFirstAsync: vi.fn().mockResolvedValue({
        available_artwork_count: 12,
        reserved_artwork_count: 3,
        upcoming_fair_count: 4,
      }),
    };

    await expect(getHomeSummary(db as never)).resolves.toEqual({
      availableArtworkCount: 12,
      reservedArtworkCount: 3,
      upcomingFairCount: 4,
    });

    expect(db.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('available_artwork_count'), [
      '2026-03-13',
    ]);
  });

  it('prefers an active fair over upcoming fairs', async () => {
    listFairsMock.mockResolvedValue([
      {
        id: 'upcoming',
        name: 'Vooruit',
        location: 'Den Haag',
        startDate: '2026-03-20',
        endDate: '2026-03-21',
        notes: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
        assignedArtworkCount: 4,
      },
      {
        id: 'active',
        name: 'Nu bezig',
        location: 'Utrecht',
        startDate: '2026-03-12',
        endDate: '2026-03-14',
        notes: null,
        createdAt: '2026-01-02T08:00:00.000Z',
        updatedAt: '2026-01-02T08:00:00.000Z',
        assignedArtworkCount: 7,
      },
    ]);

    await expect(getPrimaryFair({} as never)).resolves.toEqual({
      id: 'active',
      name: 'Nu bezig',
      location: 'Utrecht',
      startDate: '2026-03-12',
      endDate: '2026-03-14',
      assignedArtworkCount: 7,
      timing: 'active',
    });
  });

  it('falls back to the earliest upcoming fair', async () => {
    listFairsMock.mockResolvedValue([
      {
        id: 'later',
        name: 'Later',
        location: null,
        startDate: '2026-04-10',
        endDate: '2026-04-12',
        notes: null,
        createdAt: '2026-01-02T08:00:00.000Z',
        updatedAt: '2026-01-02T08:00:00.000Z',
        assignedArtworkCount: 2,
      },
      {
        id: 'first',
        name: 'Eerst',
        location: 'Amsterdam',
        startDate: '2026-03-20',
        endDate: '2026-03-22',
        notes: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
        assignedArtworkCount: 5,
      },
    ]);

    await expect(getPrimaryFair({} as never)).resolves.toMatchObject({
      id: 'first',
      timing: 'upcoming',
      assignedArtworkCount: 5,
    });
  });

  it('returns the most recent fair result within the cutoff window', async () => {
    const db = {
      getFirstAsync: vi.fn().mockResolvedValue({
        fair_id: 'fair-1',
        fair_name: 'Art Breda',
        fair_end_date: '2026-03-10',
        sales_count: 2,
        sales_total: 3400,
      }),
    };

    await expect(getRecentFairResult(db as never)).resolves.toEqual({
      fairId: 'fair-1',
      fairName: 'Art Breda',
      fairEndDate: '2026-03-10',
      salesCount: 2,
      salesTotal: 3400,
    });

    expect(db.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('sales_total'), [
      '2026-03-13',
      '2026-02-11',
    ]);
  });

  it('returns extended metrics for the primary fair', async () => {
    listFairsMock.mockResolvedValue([
      {
        id: 'fair-a',
        name: 'AAF Amsterdam',
        location: 'RAI',
        startDate: '2026-03-12',
        endDate: '2026-03-14',
        notes: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
        assignedArtworkCount: 10,
      },
    ]);

    const db = {
      getFirstAsync: vi.fn().mockResolvedValue({
        assigned_count: 8,
        sales_count: 3,
        sales_total: 4200,
        expenses_total: 1500,
        reserved_count: 1,
        available_count: 4,
      }),
    };

    await expect(getPrimaryFairWithMetrics(db as never)).resolves.toEqual({
      id: 'fair-a',
      name: 'AAF Amsterdam',
      location: 'RAI',
      startDate: '2026-03-12',
      endDate: '2026-03-14',
      assignedArtworkCount: 8,
      timing: 'active',
      salesCount: 3,
      salesTotal: 4200,
      expensesTotal: 1500,
      result: 2700,
      soldCount: 3,
      reservedCount: 1,
      availableCount: 4,
      breakEvenProgress: 2.8,
    });

    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('assigned_count'),
      ['fair-a', 'fair-a', 'fair-a', 'fair-a', 'fair-a', 'fair-a']
    );
  });

  it('returns null from getPrimaryFairWithMetrics when no fair exists', async () => {
    listFairsMock.mockResolvedValue([]);
    const db = { getFirstAsync: vi.fn() };

    await expect(getPrimaryFairWithMetrics(db as never)).resolves.toBeNull();
    expect(db.getFirstAsync).not.toHaveBeenCalled();
  });

  it('handles zero sales and expenses in getPrimaryFairWithMetrics', async () => {
    listFairsMock.mockResolvedValue([
      {
        id: 'fair-empty',
        name: 'Lege Beurs',
        location: null,
        startDate: '2026-03-20',
        endDate: '2026-03-22',
        notes: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
        assignedArtworkCount: 0,
      },
    ]);

    const db = {
      getFirstAsync: vi.fn().mockResolvedValue({
        assigned_count: null,
        sales_count: null,
        sales_total: null,
        expenses_total: null,
        reserved_count: null,
        available_count: null,
      }),
    };

    await expect(getPrimaryFairWithMetrics(db as never)).resolves.toMatchObject({
      id: 'fair-empty',
      assignedArtworkCount: 0,
      salesCount: 0,
      salesTotal: 0,
      expensesTotal: 0,
      result: 0,
      soldCount: 0,
      reservedCount: 0,
      availableCount: 0,
      breakEvenProgress: null,
    });
  });

  it('uses overrideFairId when provided in getPrimaryFairWithMetrics', async () => {
    getFairByIdMock.mockResolvedValue({
      id: 'override-fair',
      name: 'Beursdag Beurs',
      location: 'Den Haag',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      notes: null,
      createdAt: '2026-01-01T08:00:00.000Z',
      updatedAt: '2026-01-01T08:00:00.000Z',
    });

    const db = {
      getFirstAsync: vi.fn().mockResolvedValue({
        assigned_count: 5,
        sales_count: 2,
        sales_total: 3000,
        expenses_total: 800,
        reserved_count: 1,
        available_count: 2,
      }),
    };

    const result = await getPrimaryFairWithMetrics(db as never, 'override-fair');

    expect(result).toEqual({
      id: 'override-fair',
      name: 'Beursdag Beurs',
      location: 'Den Haag',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      assignedArtworkCount: 5,
      timing: 'active',
      salesCount: 2,
      salesTotal: 3000,
      expensesTotal: 800,
      result: 2200,
      soldCount: 2,
      reservedCount: 1,
      availableCount: 2,
      breakEvenProgress: 3.75,
    });

    expect(getFairByIdMock).toHaveBeenCalledWith(db, 'override-fair');
    expect(listFairsMock).not.toHaveBeenCalled();
  });

  it('returns breakEvenProgress as null when expenses are zero', async () => {
    listFairsMock.mockResolvedValue([
      {
        id: 'fair-no-exp',
        name: 'Gratis Beurs',
        location: 'Amsterdam',
        startDate: '2026-03-12',
        endDate: '2026-03-14',
        notes: null,
        createdAt: '2026-01-01T08:00:00.000Z',
        updatedAt: '2026-01-01T08:00:00.000Z',
        assignedArtworkCount: 6,
      },
    ]);

    const db = {
      getFirstAsync: vi.fn().mockResolvedValue({
        assigned_count: 6,
        sales_count: 2,
        sales_total: 1500,
        expenses_total: 0,
        reserved_count: 1,
        available_count: 3,
      }),
    };

    const result = await getPrimaryFairWithMetrics(db as never);

    expect(result).toMatchObject({
      soldCount: 2,
      reservedCount: 1,
      availableCount: 3,
      breakEvenProgress: null,
    });
  });
});
