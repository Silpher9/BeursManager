/** Bereken balkbreedte als percentage (0–100) van maximum */
export function barWidthPercent(value: number, maxValue: number): number {
  if (maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, (value / maxValue) * 100));
}
