export type LiveScoreRankLightCounts = Readonly<{
  blue: number;
  green: number;
  yellow: number;
}>;

const lightCounts = {
  blue: 35,
  green: 21,
  yellow: 15,
} as const;

export function projectLiveScoreRankLightCounts(
  displayScore: bigint,
  thresholds: Readonly<{
    bRankScore: bigint;
    aRankScore: bigint;
    sRankScore: bigint;
  }>,
): LiveScoreRankLightCounts {
  if (
    displayScore < 0n ||
    thresholds.bRankScore <= 0n ||
    thresholds.aRankScore <= thresholds.bRankScore ||
    thresholds.sRankScore <= thresholds.aRankScore
  ) {
    throw new Error('Live score rank light input is invalid');
  }
  return {
    blue: litCount(displayScore, 0n, thresholds.bRankScore, lightCounts.blue),
    green: litCount(displayScore, thresholds.bRankScore, thresholds.aRankScore, lightCounts.green),
    yellow: litCount(
      displayScore,
      thresholds.aRankScore,
      thresholds.sRankScore,
      lightCounts.yellow,
    ),
  };
}

function litCount(score: bigint, rangeStart: bigint, rangeEnd: bigint, count: number): number {
  if (score < rangeStart) return 0;
  const numerator = (score - rangeStart) * BigInt(count);
  const denominator = rangeEnd - rangeStart;
  return Math.min(count, Number(numerator / denominator));
}
