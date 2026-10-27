import { expect, test } from 'vite-plus/test';
import {
  decodeLiveMusicScoreCsv,
  encodeLiveMusicScoreCsv,
} from '../../src/runtime/music/musicScore.ts';

const source = `id,song_time,key_type,key_value,heart_appear_ratio
1,0,10,0,0
2,2963,1,0,10000
3,28148,20,0,0
4,40000,10,55,0
5,139259,99,0,0
`;

test('LiveMusicScoreは公式enumとratioでCSVをstrict IRへdecodeする', () => {
  const score = decodeLiveMusicScoreCsv(new TextEncoder().encode(source));

  expect(score.keys.map(({ kind }) => kind)).toEqual([
    'mood',
    'heart',
    'section-change',
    'mood',
    'music-end',
  ]);
  expect(score.keys[1]).toMatchObject({
    songTime: 2963,
    songTimeSeconds: 2.963,
    heartAppearRatio: 10_000,
  });
  expect(score.musicEndTimeSeconds).toBe(139.259);
  expect(score.unresolvedReferences.map(({ reason }) => reason)).toEqual([
    'gauge-formula-unobserved',
    'score-formula-unobserved',
    'skill-formula-unobserved',
  ]);
  expect(new TextDecoder().decode(encodeLiveMusicScoreCsv(score))).toBe(source);
});

test('LiveMusicScoreは未知key typeを拒否しMusicEnd欠損は公式loader同様0秒とする', () => {
  expect(() =>
    decodeLiveMusicScoreCsv(new TextEncoder().encode(source.replace(',20,', ',30,'))),
  ).toThrow('key type is unknown');
  expect(
    decodeLiveMusicScoreCsv(new TextEncoder().encode(source.replace('5,139259,99,0,0\n', '')))
      .musicEndTimeSeconds,
  ).toBe(0);
});
