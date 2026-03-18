import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dateToLocalIso, localIsoDate, localIsoDateOffset } from '@/src/shared/date';

describe('shared date helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today in YYYY-MM-DD format', () => {
    vi.setSystemTime(new Date(2026, 2, 14, 23, 30, 0));
    expect(localIsoDate()).toBe('2026-03-14');
  });

  it('returns a positive offset date', () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0));
    expect(localIsoDateOffset(5)).toBe('2026-03-19');
  });

  it('returns a negative offset date', () => {
    vi.setSystemTime(new Date(2026, 2, 14, 10, 0, 0));
    expect(localIsoDateOffset(-30)).toBe('2026-02-12');
  });

  it('converts a Date object using local components', () => {
    const date = new Date(2026, 0, 5);
    expect(dateToLocalIso(date)).toBe('2026-01-05');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 3);
    expect(dateToLocalIso(date)).toBe('2026-01-03');
  });
});
