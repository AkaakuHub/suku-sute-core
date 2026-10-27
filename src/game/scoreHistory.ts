export type ScoreSample = Readonly<{ timeMilliseconds: number; totalScore: bigint }>;

export function recordScoreHistory(
  history: readonly ScoreSample[],
  sample: ScoreSample,
): readonly ScoreSample[] {
  const previous = history.at(-1);
  if (previous?.timeMilliseconds === sample.timeMilliseconds)
    return [...history.slice(0, -1), sample];
  return previous ? [...history, { ...sample, totalScore: previous.totalScore }, sample] : [sample];
}
