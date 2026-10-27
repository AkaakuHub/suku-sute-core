import { expect, test } from 'vite-plus/test';
import { ceilHeartCount } from '../../src/game/effects/heartCreation.ts';

test.each([
  [1.1, 2],
  [-1.1, -1],
  [2_147_483_647.1, 2_147_483_647],
  [Number.MAX_VALUE, 2_147_483_647],
  [Number.NEGATIVE_INFINITY, -2_147_483_648],
  [Number.POSITIVE_INFINITY, -2_147_483_648],
  [Number.NaN, 0],
])('生成数%sを整数へ変換する', (value, expected) => {
  expect(ceilHeartCount(value)).toBe(expected);
});
