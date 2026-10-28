import { expect, test } from 'vite-plus/test';
import { liveMentalRatio } from '../../src/runtime/live/mentalGauge.ts';

test.each([
  [1.9, 3, 0.3333333432674408],
  [99.99, 100, 0.9900000095367432],
  [Number.POSITIVE_INFINITY, 100, -21_474_836],
])(
  'Mental現在値%sと最大値%sからAPKの割合%sを取得する',
  (currentMental, maximumMental, expected) => {
    expect(
      liveMentalRatio({ currentMental, timerSeconds: 0, mentalDown: false }, maximumMental),
    ).toBe(expected);
  },
);
