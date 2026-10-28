import { expect, test } from 'vite-plus/test';
import {
  calculateLiveFlowerRank,
  calculateLiveHeartRank,
} from '../../src/runtime/live/heartRank.ts';

test('Heart rankは回収可能数とVoltage levelの積を閾値4段階へ投影する', () => {
  expect(calculateLiveHeartRank(99, 1, null)).toEqual({
    rank: 0,
    magnification: 1,
  });
  expect(calculateLiveHeartRank(100, 2, null)).toEqual({
    rank: 2,
    magnification: 2.5,
  });
  expect(calculateLiveHeartRank(180, 4, null)).toEqual({
    rank: 4,
    magnification: 3.5,
  });
});

test('Master Voltage設定時はHeart rankを指定範囲へ制限する', () => {
  expect(calculateLiveHeartRank(0, 0, { minimum: 2, maximum: 3 })).toEqual({
    rank: 2,
    magnification: 2.5,
  });
  expect(calculateLiveHeartRank(100, 10, { minimum: 1, maximum: 3 })).toEqual({
    rank: 3,
    magnification: 3,
  });
});

test.each([0, -1, -2_147_483_648])('Genesis gaugeが%sならAPKと同じく結晶ランク0を返す', (gauge) => {
  expect(calculateLiveFlowerRank(1_000_000, gauge)).toEqual({ rank: 0, magnification: 1 });
});
