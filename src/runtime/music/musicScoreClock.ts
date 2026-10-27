import type { LiveMusicScore, LiveMusicScoreKey } from './musicScore.ts';

export type LiveMusicScoreClockProjection = Readonly<{
  currentTimeSeconds: number;
  previousHeartKey: LiveMusicScoreKey | null;
  nextHeartKey: LiveMusicScoreKey | null;
  previousMoodKey: LiveMusicScoreKey | null;
  nextMoodKey: LiveMusicScoreKey | null;
  previousSectionChangeKey: LiveMusicScoreKey | null;
  nextSectionChangeKey: LiveMusicScoreKey | null;
  musicEndReached: boolean;
}>;

export type LiveMusicScoreClockIndex = Readonly<{
  heart: readonly LiveMusicScoreKey[];
  mood: readonly LiveMusicScoreKey[];
  sectionChange: readonly LiveMusicScoreKey[];
  musicEndTimeSeconds: number;
}>;

export function createLiveMusicScoreClockIndex(score: LiveMusicScore): LiveMusicScoreClockIndex {
  return {
    heart: orderedKeys(score.keys, 'heart'),
    mood: orderedKeys(score.keys, 'mood'),
    sectionChange: orderedKeys(score.keys, 'section-change'),
    musicEndTimeSeconds: score.musicEndTimeSeconds,
  };
}

export function projectLiveMusicScoreClock(
  score: LiveMusicScore,
  currentTimeSeconds: number,
): LiveMusicScoreClockProjection {
  return projectLiveMusicScoreClockIndex(createLiveMusicScoreClockIndex(score), currentTimeSeconds);
}

export function projectLiveMusicScoreClockIndex(
  index: LiveMusicScoreClockIndex,
  currentTimeSeconds: number,
): LiveMusicScoreClockProjection {
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) {
    throw new Error('Live MusicScore current time is invalid');
  }

  const heart = surroundingKeys(index.heart, currentTimeSeconds);
  const mood = surroundingKeys(index.mood, currentTimeSeconds);
  const sectionChange = surroundingKeys(index.sectionChange, currentTimeSeconds);

  return {
    currentTimeSeconds,
    previousHeartKey: heart.previous,
    nextHeartKey: heart.next,
    previousMoodKey: mood.previous,
    nextMoodKey: mood.next,
    previousSectionChangeKey: sectionChange.previous,
    nextSectionChangeKey: sectionChange.next,
    musicEndReached: currentTimeSeconds >= index.musicEndTimeSeconds,
  };
}

function orderedKeys(
  keys: readonly LiveMusicScoreKey[],
  kind: 'heart' | 'mood' | 'section-change',
): readonly LiveMusicScoreKey[] {
  return keys
    .filter((key) => key.kind === kind)
    .sort((left, right) => left.songTime - right.songTime);
}

function surroundingKeys(
  timeline: readonly LiveMusicScoreKey[],
  currentTimeSeconds: number,
): Readonly<{
  previous: LiveMusicScoreKey | null;
  next: LiveMusicScoreKey | null;
}> {
  const nextIndex = timeline.findIndex((key) => key.songTimeSeconds > currentTimeSeconds);
  if (nextIndex === -1) {
    return { previous: timeline.at(-1) ?? null, next: null };
  }
  return {
    previous: timeline[nextIndex - 1] ?? null,
    next: timeline[nextIndex] ?? null,
  };
}
