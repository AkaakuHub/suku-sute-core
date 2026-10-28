import { expect, test } from 'vite-plus/test';
import { advanceLiveApGauge } from '../../src/runtime/live/apGauge.ts';

test('Live APはmax未満かつMental Downでないframeだけ厳密なinterval超過分を加算する', () => {
  const equalInterval = advanceLiveApGauge(
    { currentAp: 2, maxAp: 5, timerSeconds: 0 },
    {
      deltaTimeSeconds: 1,
      mentalDown: false,
      increaseIntervalSeconds: 1,
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
      },
    ),
  ).toEqual({
    state: { currentAp: 4, maxAp: 4, timerSeconds: 0.75 },
    gaugeDisplayValue: 4,
  });
});

test('APはFloat32の間隔の直前・一致では増えず、直後だけ増える', () => {
  const state = { currentAp: 2, maxAp: 5, timerSeconds: 0 };
  const input = { mentalDown: false, increaseIntervalSeconds: 1 };
  for (const deltaTimeSeconds of [0.9999995, 1]) {
    const frame = advanceLiveApGauge(state, { ...input, deltaTimeSeconds });
    expect(frame.state.currentAp).toBe(2);
    expect(frame.state.timerSeconds).toBe(Math.fround(deltaTimeSeconds));
  }
  const deltaTimeSeconds = 1 + 2 ** -23;
  const frame = advanceLiveApGauge(state, { ...input, deltaTimeSeconds });
  expect(frame.state.currentAp).toBe(3);
  expect(frame.state.timerSeconds).toBe(2 ** -23);
});
