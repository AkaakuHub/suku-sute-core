import { expect, test } from 'vite-plus/test';
import { calculateLiveHandCardCountAmount } from '../../../src/runtime/skills/handCardCount.ts';

test.each([
  { amount: 1, addValue: 0, multiplyFactor: 1.2, effectPower: 1, expected: 2 },
  { amount: -1, addValue: 0, multiplyFactor: 1.2, effectPower: 1, expected: -1 },
  { amount: 1, addValue: 0.1, multiplyFactor: 1, effectPower: 1, expected: 2 },
  { amount: 2, addValue: 0, multiplyFactor: 1.1, effectPower: 0.5, expected: 2 },
  { amount: 16_777_217, addValue: 0, multiplyFactor: 1, effectPower: 1, expected: 16_777_216 },
  {
    amount: 2_147_483_647,
    addValue: 0,
    multiplyFactor: 2,
    effectPower: 1,
    expected: 2_147_483_647,
  },
  {
    amount: -2_147_483_648,
    addValue: 0,
    multiplyFactor: 2,
    effectPower: 1,
    expected: -2_147_483_648,
  },
])('手札枚数変更をFloat32で計算して切り上げる: %j', ({ amount, expected, ...power }) => {
  expect(calculateLiveHandCardCountAmount(amount, power)).toBe(expected);
});
