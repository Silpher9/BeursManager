/** Returns today's date as YYYY-MM-DD in the device's local timezone. */
export function localIsoDate(): string {
  return dateToLocalIso(new Date());
}

/** Returns a date N days from today as YYYY-MM-DD in the device's local timezone. */
export function localIsoDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateToLocalIso(date);
}

/** Converts a Date object to YYYY-MM-DD using local date components. */
export function dateToLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
