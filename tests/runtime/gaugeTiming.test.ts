import { expect, test } from 'vite-plus/test';
import {
  calculateLiveApIncreaseIntervalSeconds,
  calculateLiveBaseGaugeIntervalSeconds,
  calculateLiveMentalDownRecovery,
  calculateLiveShortMemberCount,
  liveCeilAtFirstDecimalPlace,
} from '../../src/runtime/live/gaugeTiming.ts';

test('Live共通interval処理はfloat32の小数部をruntimeと同じ閾値で丸める', () => {
  expect(liveCeilAtFirstDecimalPlace(51.09)).toBe(51);
  expect(liveCeilAtFirstDecimalPlace(51.1)).toBe(51);
  expect(liveCeilAtFirstDecimalPlace(51.11)).toBe(52);
  expect(liveCeilAtFirstDecimalPlace(51.16)).toBe(52);
});

test('Live AP intervalは欠員数による上限95%の倍率を適用する', () => {
  expect(calculateLiveApIncreaseIntervalSeconds(914, 0)).toBeCloseTo(0.914);
  expect(calculateLiveApIncreaseIntervalSeconds(914, 3)).toBeCloseTo(1.306);
  expect(calculateLiveApIncreaseIntervalSeconds(914, 33)).toBeCloseTo(18.281);
});

test('Live AP欠員数はdeckの最大カード数と登録済みカード数から算出する', () => {
  expect(calculateLiveShortMemberCount(33, 33)).toBe(0);
  expect(calculateLiveShortMemberCount(33, 30)).toBe(3);
  expect(() => calculateLiveShortMemberCount(33, 34)).toThrow('Live filled card count is invalid');
});

test('Live MentalとVoltageの基準intervalはLiveStages値とSongTimeから算出する', () => {
  expect(calculateLiveBaseGaugeIntervalSeconds(56, 9_136)).toBeCloseTo(0.052);
  expect(calculateLiveBaseGaugeIntervalSeconds(6, 9_136)).toBeCloseTo(0.006);
});

test('Live Mental Down回復値と回復時間をMusicEndTimeから算出する', () => {
  expect(calculateLiveMentalDownRecovery(503, 109.63)).toEqual({
    recoveryTimeSeconds: expect.closeTo(5.481),
    recoveryMental: 301,
  });
});
