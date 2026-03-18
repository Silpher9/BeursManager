export function formatFairDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) {
    return 'Data nog niet ingevuld';
  }

  const start = startDate ? formatFairDate(startDate) : 'Onbekend';
  const end = endDate ? formatFairDate(endDate) : null;

  return end && end !== start ? `${start} t/m ${end}` : start;
}

export function formatFairDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
