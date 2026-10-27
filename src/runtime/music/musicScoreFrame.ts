import type { LiveMusicScore, LiveMusicScoreKey } from './musicScore.ts';

export type LiveMusicScoreFrameState = Readonly<{
  previousTimeSeconds: number;
  nextKeyIndex: number;
  moodBaseValue: number | null;
  section: number;
}>;

export type LiveMusicScoreFrameEvent = Readonly<
  | {
      kind: 'mood';
      rowIndex: number;
      key: LiveMusicScoreKey;
      eventTimeSeconds: number;
      moodBaseValue: number;
      section: number;
    }
  | {
      kind: 'section-change';
      rowIndex: number;
      key: LiveMusicScoreKey;
      eventTimeSeconds: number;
      moodBaseValue: number | null;
      section: number;
    }
  | {
      kind: 'heart';
      rowIndex: number;
      key: LiveMusicScoreKey;
      eventTimeSeconds: number;
      heartAppearRatio: number;
      moodBaseValue: number | null;
      section: number;
    }
  | {
      kind: 'music-end';
      rowIndex: number;
      key: LiveMusicScoreKey;
      eventTimeSeconds: number;
      moodBaseValue: number | null;
      section: number;
    }
>;

export type LiveMusicScoreFrameProjection = Readonly<{
  events: readonly LiveMusicScoreFrameEvent[];
  state: LiveMusicScoreFrameState;
}>;

export function createLiveMusicScoreFrameState(): LiveMusicScoreFrameState {
  return {
    previousTimeSeconds: 0,
    nextKeyIndex: 0,
    moodBaseValue: null,
    section: 0,
  };
}

export function replayLiveMusicScoreFrame(
  score: LiveMusicScore,
  currentTimeSeconds: number,
): LiveMusicScoreFrameProjection {
  return projectLiveMusicScoreFrame(score, createLiveMusicScoreFrameState(), currentTimeSeconds);
}

export function projectLiveMusicScoreFrame(
  score: LiveMusicScore,
  state: LiveMusicScoreFrameState,
  currentTimeSeconds: number,
): LiveMusicScoreFrameProjection {
  validateFrameInput(score, state, currentTimeSeconds);
  let nextKeyIndex = state.nextKeyIndex;
  let moodBaseValue = state.moodBaseValue;
  let section = state.section;
  let eventTimeSeconds = state.previousTimeSeconds;
  const events: LiveMusicScoreFrameEvent[] = [];

  while (nextKeyIndex < score.keys.length) {
    const key = requiredKey(score.keys, nextKeyIndex);
    if (key.songTimeSeconds > currentTimeSeconds) break;
    if (key.songTimeSeconds > eventTimeSeconds) {
      eventTimeSeconds = key.songTimeSeconds;
    }
    const rowIndex = nextKeyIndex;
    nextKeyIndex += 1;
    switch (key.kind) {
      case 'mood':
        moodBaseValue = key.keyValue;
        events.push({
          kind: 'mood',
          rowIndex,
          key,
          eventTimeSeconds,
          moodBaseValue,
          section,
        });
        break;
      case 'section-change':
        section += 1;
        events.push({
          kind: 'section-change',
          rowIndex,
          key,
          eventTimeSeconds,
          moodBaseValue,
          section,
        });
        break;
      case 'heart':
        events.push({
          kind: 'heart',
          rowIndex,
          key,
          eventTimeSeconds,
          heartAppearRatio: key.heartAppearRatio,
          moodBaseValue,
          section,
        });
        break;
      case 'music-end':
        events.push({
          kind: 'music-end',
          rowIndex,
          key,
          eventTimeSeconds,
          moodBaseValue,
          section,
        });
        break;
    }
  }

  return {
    events,
    state: {
      previousTimeSeconds: currentTimeSeconds,
      nextKeyIndex,
      moodBaseValue,
      section,
    },
  };
}

function validateFrameInput(
  score: LiveMusicScore,
  state: LiveMusicScoreFrameState,
  currentTimeSeconds: number,
): void {
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < state.previousTimeSeconds) {
    throw new Error('Live MusicScore frame clock is invalid');
  }
  if (!Number.isFinite(state.previousTimeSeconds) || state.previousTimeSeconds < 0) {
    throw new Error('Live MusicScore previous frame clock is invalid');
  }
  if (
    !Number.isSafeInteger(state.nextKeyIndex) ||
    state.nextKeyIndex < 0 ||
    state.nextKeyIndex > score.keys.length
  ) {
    throw new Error('Live MusicScore next key index is invalid');
  }
  if (state.moodBaseValue !== null && !Number.isSafeInteger(state.moodBaseValue)) {
    throw new Error('Live MusicScore mood base value is invalid');
  }
  if (!Number.isSafeInteger(state.section) || state.section < 0) {
    throw new Error('Live MusicScore section is invalid');
  }
}

function requiredKey(keys: readonly LiveMusicScoreKey[], index: number): LiveMusicScoreKey {
  const key = keys[index];
  if (key === undefined) {
    throw new Error('Live MusicScore key is absent');
  }
  return key;
}
