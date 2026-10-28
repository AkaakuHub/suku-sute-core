import { expect, test } from 'vite-plus/test';
import { setLiveVoltageGaugeValue } from '../../src/runtime/live/voltageGaugeChange.ts';
import { advanceLiveVoltageGauge } from '../../src/runtime/live/voltageGauge.ts';
import {
  activateLiveGenesisEffect,
  createLiveGenesisState,
} from '../../src/runtime/skills/genesisSkill.ts';

function initial(currentVoltage = 10n) {
  return { voltage: { currentVoltage, timerSeconds: 0 }, genesis: createLiveGenesisState() };
}

function active(currentVoltage = 10n) {
  const state = initial(currentVoltage);
  return {
    ...state,
    genesis: activateLiveGenesisEffect(
      state.genesis,
      {
        effectId: 'genesis',
        effectValue: 1,
        duration: { kind: 'full-end' },
      },
      { currentAp: 0, currentMental: 100, currentVoltage, currentVoltageLevel: 1 },
    ),
  };
}

test('通常Voltage設定はint64に折り返して最低0へ制限し、レベル上限で切り詰めない', () => {
  const state = initial();
  expect(
    setLiveVoltageGaugeValue(state, 9_007_199_254_740_993n, false).voltage.currentVoltage,
  ).toBe(9_007_199_254_740_993n);
  expect(setLiveVoltageGaugeValue(state, -1n, false).voltage.currentVoltage).toBe(0n);
  expect(setLiveVoltageGaugeValue(state, 1n << 63n, false).voltage.currentVoltage).toBe(0n);
});

test('Voltage設定のGenesis変換はInfinityより先に行い、通常ポイントを維持する', () => {
  const state = active();
  const next = setLiveVoltageGaugeValue(state, 11n, true);
  expect(next.voltage).toBe(state.voltage);
  expect(next.genesis.currentGauge).toBe(state.genesis.currentGauge + 1);
  const ordinary = initial();
  expect(setLiveVoltageGaugeValue(ordinary, 11n, true)).toBe(ordinary);
});

test('Genesisへ渡すVoltage差分はint64で減算してからFloat32へ変換する', () => {
  const state = active((1n << 63n) - 1n);
  const next = setLiveVoltageGaugeValue(state, -(1n << 63n), false);
  expect(next.genesis.currentGauge).toBe(state.genesis.currentGauge + 1);
});

test('間隔0では直接設定を変換し、加算用の処理を呼ばない', () => {
  let state = active();
  const frame = advanceLiveVoltageGauge(
    state.voltage,
    {
      deltaTimeSeconds: 0.5,
      stopIncreaseRequestCount: 0,
      increaseIntervalSeconds: 0,
      maxBaseVoltageLevel: 2,
      voltageInfinity: false,
    },
    {
      getVoltageThreshold: () => 30n,
      setVoltage: (value) => {
        state = setLiveVoltageGaugeValue(state, value, false);
        return state.voltage.currentVoltage;
      },
      addVoltage: () => {
        throw new Error('間隔0では加算しません。');
      },
    },
  );
  expect(frame.state).toEqual({ currentVoltage: 10n, timerSeconds: 0.5 });
  expect(state.genesis.currentGauge).toBe(active().genesis.currentGauge + 5);
});
