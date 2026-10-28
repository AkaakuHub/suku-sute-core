import { expect, test } from 'vite-plus/test';
import { floatToInt32 } from '../../src/runtime/numeric.ts';

test.each([
  [1.9, 1],
  [-1.9, -1],
  [2_147_483_648, 2_147_483_647],
  [-2_147_483_649, -2_147_483_648],
  [Number.POSITIVE_INFINITY, 2_147_483_647],
  [Number.NEGATIVE_INFINITY, -2_147_483_648],
  [Number.NaN, 0],
])('浮動小数点数%sを32bit整数へ変換する', (value, expected) => {
  expect(floatToInt32(value)).toBe(expected);
});
