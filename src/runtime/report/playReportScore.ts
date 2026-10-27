export type LivePlayReportScore = Readonly<{
  timeMilliseconds: number;
  totalScore: bigint;
}>;

export function createLivePlayReportScores(): readonly LivePlayReportScore[] {
  return [{ timeMilliseconds: 0, totalScore: 0n }];
}

export function createLivePlayReportScore(
  currentTimeSeconds: number,
  totalScore: bigint,
): LivePlayReportScore {
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0 || totalScore < 0n) {
    throw new Error('Live PlayReport score input is invalid');
  }
  const timeMilliseconds = Math.trunc(Math.fround(Math.fround(currentTimeSeconds) * 1000));
  return { timeMilliseconds, totalScore };
}

export function appendLivePlayReportScore(
  scores: readonly LivePlayReportScore[],
  currentTimeSeconds: number,
  totalScore: bigint,
): readonly LivePlayReportScore[] {
  const sample = createLivePlayReportScore(currentTimeSeconds, totalScore);
  const { timeMilliseconds } = sample;
  const previous = scores.at(-1);
  if (previous === undefined) return [sample];
  if (timeMilliseconds < previous.timeMilliseconds) {
    throw new Error('Live PlayReport score time moved backwards');
  }
  if (timeMilliseconds === previous.timeMilliseconds) return [...scores.slice(0, -1), sample];
  return [...scores, { timeMilliseconds, totalScore: previous.totalScore }, sample];
}
