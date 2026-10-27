import { expect, test } from 'vite-plus/test';
import {
  advanceLiveVoltageGauge,
  type LiveNaturalVoltageRequest,
  type LiveVoltageGaugePorts,
} from '../../src/runtime/live/voltageGauge.ts';

test('Live Voltageは停止requestがないframeだけ厳密なinterval超過ごとにAddVoltageを呼ぶ', () => {
  const requests: LiveNaturalVoltageRequest[] = [];
  const ports: LiveVoltageGaugePorts = {
    getVoltageThreshold: () => 999n,
    addVoltage: (currentVoltage, request) => {
      requests.push(request);
      return currentVoltage + 10n;
    },
  };
  const equalInterval = advanceLiveVoltageGauge(
    { currentVoltage: 100n, timerSeconds: 0 },
    {
      deltaTimeSeconds: 1,
      stopIncreaseRequestCount: 0,
      increaseIntervalSeconds: 1,
      maxBaseVoltageLevel: 10,
      voltageInfinity: false,
    },
    ports,
  );
  expect(equalInterval).toEqual({
    state: { currentVoltage: 100n, timerSeconds: 1 },
    gaugeDisplayValue: 100n,
  });

  const multipleIntervals = advanceLiveVoltageGauge(
    equalInterval.state,
    {
      deltaTimeSeconds: 2.5,
      stopIncreaseRequestCount: 0,
      increaseIntervalSeconds: 1,
      maxBaseVoltageLevel: 10,
      voltageInfinity: false,
    },
    ports,
  );
  expect(multipleIntervals).toEqual({
    state: { currentVoltage: 130n, timerSeconds: 0.5 },
    gaugeDisplayValue: 130n,
  });
  expect(requests).toEqual([
    { addValue: 1, induceVoltageUp: false, absorbTarget: true, playEffect: false },
    { addValue: 1, induceVoltageUp: false, absorbTarget: true, playEffect: false },
    { addValue: 1, induceVoltageUp: false, absorbTarget: true, playEffect: false },
  ]);
});

test('Live Voltageはintervalが0以下ならmax levelのthresholdへ設定する', () => {
  const result = advanceLiveVoltageGauge(
    { currentVoltage: 100n, timerSeconds: 0.25 },
    {
      deltaTimeSeconds: 0.5,
      stopIncreaseRequestCount: 0,
      increaseIntervalSeconds: 0,
      maxBaseVoltageLevel: 12,
      voltageInfinity: false,
    },
    {
      getVoltageThreshold: (level) => BigInt(level) * 1_000n,
      addVoltage: () => {
        throw new Error('AddVoltage must not run');
      },
    },
  );
  expect(result).toEqual({
    state: { currentVoltage: 12_000n, timerSeconds: 0.75 },
    gaugeDisplayValue: 12_000n,
  });
});

test('Live Voltageは停止中に更新せずInfinity時にgauge表示を更新しない', () => {
  const ports: LiveVoltageGaugePorts = {
    getVoltageThreshold: () => 500n,
    addVoltage: (currentVoltage) => currentVoltage + 1n,
  };
  expect(
    advanceLiveVoltageGauge(
      { currentVoltage: 20n, timerSeconds: 0.25 },
      {
        deltaTimeSeconds: 5,
        stopIncreaseRequestCount: 1,
        increaseIntervalSeconds: 1,
        maxBaseVoltageLevel: 10,
        voltageInfinity: false,
      },
      ports,
    ),
  ).toEqual({
    state: { currentVoltage: 20n, timerSeconds: 0.25 },
    gaugeDisplayValue: null,
  });
  expect(
    advanceLiveVoltageGauge(
      { currentVoltage: 20n, timerSeconds: 0 },
      {
        deltaTimeSeconds: 2,
        stopIncreaseRequestCount: 0,
        increaseIntervalSeconds: 1,
        maxBaseVoltageLevel: 10,
        voltageInfinity: true,
      },
      ports,
    ),
  ).toEqual({
    state: { currentVoltage: 21n, timerSeconds: 1 },
    gaugeDisplayValue: null,
  });
});
