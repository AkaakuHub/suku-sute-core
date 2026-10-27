export type MoodKey = Readonly<{ songTimeSeconds: number; keyValue: number }>;

export function moodAtTime(keys: readonly MoodKey[], seconds: number): number {
  const key = keys.findLast((item) => item.songTimeSeconds <= seconds);
  if (!key) throw new Error('現在時刻の空模様がありません。');
  return key.keyValue;
}

export function validateMoodTimeline(keys: readonly MoodKey[], duration: number): void {
  if (keys[0]?.songTimeSeconds !== 0) throw new Error('空模様の開始時刻が正しくありません。');
  let previous = -1;
  for (const key of keys) {
    if (
      !Number.isFinite(key.songTimeSeconds) ||
      key.songTimeSeconds <= previous ||
      key.songTimeSeconds > duration ||
      !Number.isSafeInteger(key.keyValue) ||
      key.keyValue < -100 ||
      key.keyValue > 100
    )
      throw new Error('空模様の設定が正しくありません。');
    previous = key.songTimeSeconds;
  }
}
