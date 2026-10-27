import { expect, test } from 'vite-plus/test';
import {
  decodeLiveMusicScoreCsv,
  type LiveMusicScore,
  type LiveMusicScoreKey,
} from '../../src/runtime/music/musicScore.ts';
import {
  createLiveMusicScoreClockIndex,
  projectLiveMusicScoreClock,
  projectLiveMusicScoreClockIndex,
} from '../../src/runtime/music/musicScoreClock.ts';

const score = decodeLiveMusicScoreCsv(
  new TextEncoder().encode(`id,song_time,key_type,key_value,heart_appear_ratio
1,3000,1,31,3000
2,1000,10,11,0
3,3000,10,32,0
4,2000,20,21,0
5,3000,1,33,7000
6,4000,20,41,0
7,5000,99,0,0
`),
);

function requireKey(score: LiveMusicScore, index: number): LiveMusicScoreKey {
  const key = score.keys[index];
  if (key === undefined) {
    throw new Error(`Live MusicScore fixture key ${index} is missing`);
  }
  return key;
}

test('Live MusicScore clockはraw行をsongTime順に投影し同時刻ではraw順を維持する', () => {
  expect(projectLiveMusicScoreClock(score, 3)).toEqual({
    currentTimeSeconds: 3,
    previousHeartKey: requireKey(score, 4),
    nextHeartKey: null,
    previousMoodKey: requireKey(score, 2),
    nextMoodKey: null,
    previousSectionChangeKey: requireKey(score, 3),
    nextSectionChangeKey: requireKey(score, 5),
    musicEndReached: false,
  });
});

test('Live MusicScore clock indexはframe間で再利用して同じ投影を返す', () => {
  const index = createLiveMusicScoreClockIndex(score);
  expect(projectLiveMusicScoreClockIndex(index, 3)).toEqual(projectLiveMusicScoreClock(score, 3));
  expect(projectLiveMusicScoreClockIndex(index, 4)).toEqual(projectLiveMusicScoreClock(score, 4));
});

test('Live MusicScore clockは境界外をnullとしMusicEnd時刻の到達だけを返す', () => {
  const beforeFirstRow = projectLiveMusicScoreClock(score, 0);
  expect(beforeFirstRow.previousHeartKey).toBeNull();
  expect(beforeFirstRow.nextHeartKey).toBe(requireKey(score, 0));
  expect(beforeFirstRow.previousMoodKey).toBeNull();
  expect(beforeFirstRow.nextMoodKey).toBe(requireKey(score, 1));
  expect(beforeFirstRow.previousSectionChangeKey).toBeNull();
  expect(beforeFirstRow.nextSectionChangeKey).toBe(requireKey(score, 3));
  expect(beforeFirstRow.musicEndReached).toBe(false);

  expect(projectLiveMusicScoreClock(score, 5).musicEndReached).toBe(true);
  expect(() => projectLiveMusicScoreClock(score, Number.NaN)).toThrow(
    'Live MusicScore current time is invalid',
  );
  expect(() => projectLiveMusicScoreClock(score, -0.001)).toThrow(
    'Live MusicScore current time is invalid',
  );
});
