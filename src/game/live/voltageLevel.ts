import thresholds from '../../master/voltageThresholds.json';

export function voltageThreshold(level: number): number {
  const threshold = thresholds[level - 1];
  if (threshold !== undefined) return threshold;
  const maximum = thresholds.at(-1);
  if (!maximum || level <= thresholds.length) throw new Error('熱気の段階がありません。');
  return maximum + (level - thresholds.length) * 8_000_000;
}

export function voltageLevel(points: number, maximumLevel: number): number {
  const base = thresholds.at(-1);
  if (base === undefined) throw new Error('熱気の段階がありません。');
  const level =
    points >= base
      ? thresholds.length + Math.floor((points - base) / 8_000_000)
      : thresholds.findLastIndex((threshold) => threshold <= points) + 1;
  return Math.min(maximumLevel, level);
}

export function voltageProgress(points: number, maximumLevel: number): number {
  const level = voltageLevel(points, maximumLevel);
  if (level >= maximumLevel) return 100;
  const lower = level === 0 ? 0 : voltageThreshold(level);
  const upper = voltageThreshold(level + 1);
  return ((points - lower) / (upper - lower)) * 100;
}
