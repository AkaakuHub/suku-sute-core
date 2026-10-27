export type LivePlayReportMood = Readonly<{
  timeMilliseconds: number;
  moodValue: number;
}>;

export function appendLivePlayReportMood(
  moods: readonly LivePlayReportMood[],
  currentTimeSeconds: number,
  moodValue: number,
): readonly LivePlayReportMood[] {
  if (
    !Number.isFinite(currentTimeSeconds) ||
    currentTimeSeconds < 0 ||
    !Number.isSafeInteger(moodValue)
  ) {
    throw new Error('Live PlayReport mood input is invalid');
  }
  const timeMilliseconds = Math.trunc(Math.fround(Math.fround(currentTimeSeconds) * 1000));
  const sample = { timeMilliseconds, moodValue };
  const previous = moods.at(-1);
  if (previous === undefined) return [sample];
  if (timeMilliseconds < previous.timeMilliseconds) {
    throw new Error('Live PlayReport mood time moved backwards');
  }
  return [...moods, { timeMilliseconds, moodValue: previous.moodValue }, sample];
}
