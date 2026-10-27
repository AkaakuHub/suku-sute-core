export function formatLiveLoveScore(value: number | bigint): string {
  if (
    (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) ||
    (typeof value === 'bigint' && value < 0n)
  ) {
    throw new Error('Live LOVE scoreは非負の整数が必要です');
  }
  return value
    .toString(10)
    .padStart(12, '0')
    .replace(/\B(?=(\d{3})+(?!\d))/gu, ',');
}
