import { expect, test } from 'vite-plus/test';
import { clampLiveUnitInterval } from '../../src/runtime/live/liveUnitInterval.ts';

test('Liveのunit interval clampはNaNを保持し、数値を0から1へ制限する', () => {
  expect(clampLiveUnitInterval(Number.NEGATIVE_INFINITY)).toBe(0);
  expect(clampLiveUnitInterval(-0.5)).toBe(0);
  expect(clampLiveUnitInterval(0)).toBe(0);
  expect(clampLiveUnitInterval(0.5)).toBe(0.5);
  expect(clampLiveUnitInterval(1)).toBe(1);
  expect(clampLiveUnitInterval(1.5)).toBe(1);
  expect(clampLiveUnitInterval(Number.POSITIVE_INFINITY)).toBe(1);
  expect(Number.isNaN(clampLiveUnitInterval(Number.NaN))).toBe(true);
});
