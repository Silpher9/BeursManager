export const euroFormatter = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null, fallback: string | null = null) {
  return typeof price === 'number' ? euroFormatter.format(price) : fallback;
}
