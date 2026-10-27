import { expect, test } from 'vite-plus/test';
import { advanceLiveApGauge } from '../../src/runtime/live/apGauge.ts';

test('Live APはmax未満かつMental Downでないframeだけ厳密なinterval超過分を加算する', () => {
  const equalInterval = advanceLiveApGauge(
    { currentAp: 2, maxAp: 5, timerSeconds: 0 },
    {
      deltaTimeSeconds: 1,
      mentalDown: false,
      increaseIntervalSeconds: 1,
      boundaryToleranceSeconds: null,
    },
  );
  expect(equalInterval).toEqual({
    state: { currentAp: 2, maxAp: 5, timerSeconds: 1 },
    gaugeDisplayValue: 2,
  });

  const multipleIntervals = advanceLiveApGauge(equalInterval.state, {
    deltaTimeSeconds: 2.5,
    mentalDown: false,
    increaseIntervalSeconds: 1,
    boundaryToleranceSeconds: null,
  });
  expect(multipleIntervals).toEqual({
    state: { currentAp: 5, maxAp: 5, timerSeconds: 0.5 },
    gaugeDisplayValue: 5,
  });

  const mentalDown = advanceLiveApGauge(
    { currentAp: 2, maxAp: 5, timerSeconds: 0.25 },
    {
      deltaTimeSeconds: 4,
      mentalDown: true,
      increaseIntervalSeconds: 1,
      boundaryToleranceSeconds: null,
    },
  );
  expect(mentalDown).toEqual({
    state: { currentAp: 2, maxAp: 5, timerSeconds: 0.25 },
    gaugeDisplayValue: null,
  });
});

test('Live APはintervalが0以下ならmaxへ設定する', () => {
  expect(
    advanceLiveApGauge(
      { currentAp: 1, maxAp: 4, timerSeconds: 0.25 },
      {
        deltaTimeSeconds: 0.5,
        mentalDown: false,
        increaseIntervalSeconds: 0,
        boundaryToleranceSeconds: null,
      },
    ),
  ).toEqual({
    state: { currentAp: 4, maxAp: 4, timerSeconds: 0.75 },
    gaugeDisplayValue: 4,
  });
});

test('固定刻みのAP更新は指定した誤差以内の境界でだけ回復する', () => {
  const state = { currentAp: 2, maxAp: 5, timerSeconds: 0 };
  const input = {
    mentalDown: false,
    increaseIntervalSeconds: 1,
    boundaryToleranceSeconds: 0.000001,
  };
  const before = advanceLiveApGauge(state, { ...input, deltaTimeSeconds: 0.999998 });
  expect(before.state.currentAp).toBe(2);
  const boundary = advanceLiveApGauge(state, { ...input, deltaTimeSeconds: 0.9999995 });
  expect(boundary.state.currentAp).toBe(3);
  expect(boundary.state.timerSeconds).toBe(0);
  const strict = advanceLiveApGauge(state, {
    ...input,
    deltaTimeSeconds: 1,
    boundaryToleranceSeconds: null,
  });
  expect(strict.state.currentAp).toBe(2);
});
