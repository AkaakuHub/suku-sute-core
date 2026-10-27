export type MoodSample = Readonly<{ timeMilliseconds: number; moodValue: number }>;

export function recordMoodHistory(
  history: readonly MoodSample[],
  sample: MoodSample,
): readonly MoodSample[] {
  const previous = history.at(-1);
  return previous ? [...history, { ...sample, moodValue: previous.moodValue }, sample] : [sample];
}
