import { expect, test } from 'vite-plus/test';
import { decodeLiveMusicScoreCsv } from '../../src/runtime/music/musicScore.ts';
import {
  createLiveMusicScoreFrameState,
  projectLiveMusicScoreFrame,
  type LiveMusicScoreFrameState,
  replayLiveMusicScoreFrame,
} from '../../src/runtime/music/musicScoreFrame.ts';

const score = decodeLiveMusicScoreCsv(
  new TextEncoder().encode(`id,song_time,key_type,key_value,heart_appear_ratio
1,1000,10,11,0
2,2000,20,91,0
3,3000,1,0,3000
4,3000,10,32,0
5,3000,20,92,0
6,3000,1,0,7000
7,4000,99,0,0
`),
);

const initialState: LiveMusicScoreFrameState = {
  previousTimeSeconds: 0,
  nextKeyIndex: 0,
  moodBaseValue: -10,
  section: 0,
};

test('Live MusicScore frame初期stateは先頭rowから未確定Moodで開始する', () => {
  expect(createLiveMusicScoreFrameState()).toEqual({
    previousTimeSeconds: 0,
    nextKeyIndex: 0,
    moodBaseValue: null,
    section: 0,
  });
});

function requireScoreKey(keys: typeof score.keys, index: number): (typeof score.keys)[number] {
  const key = keys[index];
  if (key === undefined) {
    throw new Error(`MusicScore key is missing: ${String(index)}`);
  }
  return key;
}

test('Live MusicScore frameは到達rowをlist順に処理しHeartへ更新後snapshotを渡す', () => {
  const projection = projectLiveMusicScoreFrame(score, initialState, 3);

  expect(
    projection.events.map(({ kind, rowIndex, eventTimeSeconds, moodBaseValue, section }) => ({
      kind,
      rowIndex,
      eventTimeSeconds,
      moodBaseValue,
      section,
    })),
  ).toEqual([
    {
      kind: 'mood',
      rowIndex: 0,
      eventTimeSeconds: 1,
      moodBaseValue: 11,
      section: 0,
    },
    {
      kind: 'section-change',
      rowIndex: 1,
      eventTimeSeconds: 2,
      moodBaseValue: 11,
      section: 1,
    },
    {
      kind: 'heart',
      rowIndex: 2,
      eventTimeSeconds: 3,
      moodBaseValue: 11,
      section: 1,
    },
    {
      kind: 'mood',
      rowIndex: 3,
      eventTimeSeconds: 3,
      moodBaseValue: 32,
      section: 1,
    },
    {
      kind: 'section-change',
      rowIndex: 4,
      eventTimeSeconds: 3,
      moodBaseValue: 32,
      section: 2,
    },
    {
      kind: 'heart',
      rowIndex: 5,
      eventTimeSeconds: 3,
      moodBaseValue: 32,
      section: 2,
    },
  ]);
  expect(
    projection.events
      .filter((event) => event.kind === 'heart')
      .map(({ heartAppearRatio }) => heartAppearRatio),
  ).toEqual([3000, 7000]);
  expect(projection.state).toEqual({
    previousTimeSeconds: 3,
    nextKeyIndex: 6,
    moodBaseValue: 32,
    section: 2,
  });
});

test('Live MusicScore frameは未処理indexから再開しMusicEnd eventを一度だけ返す', () => {
  const firstFrame = projectLiveMusicScoreFrame(score, initialState, 3);
  const secondFrame = projectLiveMusicScoreFrame(score, firstFrame.state, 4);

  expect(secondFrame.events).toEqual([
    {
      kind: 'music-end',
      rowIndex: 6,
      key: requireScoreKey(score.keys, 6),
      eventTimeSeconds: 4,
      moodBaseValue: 32,
      section: 2,
    },
  ]);
  expect(secondFrame.state).toEqual({
    previousTimeSeconds: 4,
    nextKeyIndex: 7,
    moodBaseValue: 32,
    section: 2,
  });
  expect(() => projectLiveMusicScoreFrame(score, secondFrame.state, 3.999)).toThrow(
    'frame clock is invalid',
  );
});

test('Live MusicScore replayは未確定の初期Moodを補わずseek位置まで再投影する', () => {
  const scoreWithHeartBeforeMood = decodeLiveMusicScoreCsv(
    new TextEncoder().encode(`id,song_time,key_type,key_value,heart_appear_ratio
1,1000,1,0,5000
2,2000,10,45,0
3,3000,99,0,0
`),
  );

  const beforeMood = replayLiveMusicScoreFrame(scoreWithHeartBeforeMood, 1);
  expect(beforeMood.events).toEqual([
    {
      kind: 'heart',
      rowIndex: 0,
      key: requireScoreKey(scoreWithHeartBeforeMood.keys, 0),
      eventTimeSeconds: 1,
      heartAppearRatio: 5000,
      moodBaseValue: null,
      section: 0,
    },
  ]);
  expect(beforeMood.state.moodBaseValue).toBeNull();

  const afterSeek = replayLiveMusicScoreFrame(scoreWithHeartBeforeMood, 3);
  expect(afterSeek.events.map(({ kind }) => kind)).toEqual(['heart', 'mood', 'music-end']);
  expect(afterSeek.state).toEqual({
    previousTimeSeconds: 3,
    nextKeyIndex: 3,
    moodBaseValue: 45,
    section: 0,
  });
});

test('Live MusicScore frameは先頭の未到達rowで停止して後続rowを先取りしない', () => {
  const listOrderedScore = decodeLiveMusicScoreCsv(
    new TextEncoder().encode(`id,song_time,key_type,key_value,heart_appear_ratio
1,3000,1,0,5000
2,1000,10,45,0
3,3000,99,0,0
`),
  );
  const beforeFirstRow = projectLiveMusicScoreFrame(listOrderedScore, initialState, 2);

  expect(beforeFirstRow.events).toEqual([]);
  expect(beforeFirstRow.state.nextKeyIndex).toBe(0);
  const reached = projectLiveMusicScoreFrame(listOrderedScore, beforeFirstRow.state, 3);
  expect(
    reached.events.map(({ kind, eventTimeSeconds, moodBaseValue }) => ({
      kind,
      eventTimeSeconds,
      moodBaseValue,
    })),
  ).toEqual([
    { kind: 'heart', eventTimeSeconds: 3, moodBaseValue: -10 },
    { kind: 'mood', eventTimeSeconds: 3, moodBaseValue: 45 },
    { kind: 'music-end', eventTimeSeconds: 3, moodBaseValue: 45 },
  ]);
  expect(reached.state.nextKeyIndex).toBe(3);
});
