import { expect, test } from 'vite-plus/test';
import {
  advanceLiveAutomaticGaugeRuntime,
  createLiveAutomaticGaugeRuntimeState,
  projectLiveVoltageLevel,
  type LiveAutomaticGaugeRuntimeInput,
} from '../../src/runtime/live/automaticGaugeRuntime.ts';

const input: LiveAutomaticGaugeRuntimeInput = {
  maximumAp: 20,
  apIncreaseIntervalSeconds: 1,
  maximumMental: 2,
  mentalDecreaseIntervalSeconds: 1,
  mentalRecoveryTimeSeconds: 1,
  mentalRecoveryValue: 1,
  voltageIncreaseIntervalSeconds: 1,
  voltageThresholds: [
    { voltageLevel: 1, requiredVoltagePoint: 1n },
    { voltageLevel: 2, requiredVoltagePoint: 31n },
    { voltageLevel: 3, requiredVoltagePoint: 61n },
  ],
};

const defaultControl = {
  setAp: (requestedAp: number) => Math.min(20, Math.max(0, requestedAp)),
  addAp: (currentAp: number, amount: 1) => Math.min(20, currentAp + amount),
  genesisSkillActive: false,
  stopVoltageIncreaseRequestCount: 0,
  disableMentalDown: false,
  mentalDecreaseIntervalFactor: 1,
  subMentalOne: (currentMental: number) => Math.max(currentMental - 1, 0),
  addVoltage: (currentVoltage: bigint) => currentVoltage + 1n,
} as const;

test('Live自動gaugeはruntimeのAP、Voltage、Mental順でframe更新する', () => {
  const initial = createLiveAutomaticGaugeRuntimeState(input);
  const first = advanceLiveAutomaticGaugeRuntime(initial, 1.1, input, defaultControl);
  expect(first.state).toEqual({
    ap: { currentAp: 1, maxAp: 20, timerSeconds: expect.closeTo(0.1) },
    apInfinity: false,
    voltage: { currentVoltage: 1n, timerSeconds: expect.closeTo(0.1) },
    mental: {
      currentMental: 1,
      timerSeconds: expect.closeTo(0.1),
      mentalDown: false,
    },
  });

  const mentalDown = advanceLiveAutomaticGaugeRuntime(first.state, 1, input, defaultControl);
  expect(mentalDown.state.ap.currentAp).toBe(2);
  expect(mentalDown.state.mental).toMatchObject({
    currentMental: 0,
    mentalDown: true,
  });

  const recovery = advanceLiveAutomaticGaugeRuntime(mentalDown.state, 1, input, defaultControl);
  expect(recovery.state.ap).toEqual(mentalDown.state.ap);
  expect(recovery.state.mental).toMatchObject({
    currentMental: 1,
    mentalDown: false,
  });
});

test('Voltage停止要求中は自動増加値とtimerを更新しない', () => {
  const state = createLiveAutomaticGaugeRuntimeState(input);
  const frame = advanceLiveAutomaticGaugeRuntime(state, 2, input, {
    ...defaultControl,
    stopVoltageIncreaseRequestCount: 2,
  });

  expect(frame.state.voltage).toEqual(state.voltage);
  expect(frame.voltage.gaugeDisplayValue).toBeNull();
});

test('GenesisとDisableMentalDownの併用中はMentalのtimer、値、Down状態を更新しない', () => {
  const state = {
    ...createLiveAutomaticGaugeRuntimeState(input),
    mental: {
      currentMental: 1,
      timerSeconds: 0.75,
      mentalDown: false,
    },
  };

  const frame = advanceLiveAutomaticGaugeRuntime(state, 2, input, {
    ...defaultControl,
    genesisSkillActive: true,
    disableMentalDown: true,
  });

  expect(frame.state.mental).toEqual(state.mental);
  expect(frame.mental.gaugeDisplayValue).toBe(1);
  expect(frame.state.ap.currentAp).toBe(1);
  expect(frame.state.voltage.currentVoltage).toBe(1n);
});

test('Live Voltage levelは現在point以下の最大thresholdから投影する', () => {
  expect(projectLiveVoltageLevel(input.voltageThresholds, 45n)).toEqual({
    currentLevel: 2,
    currentLevelVoltage: 31n,
    nextLevelVoltage: 61n,
    maximumBaseLevel: 3,
  });
  expect(projectLiveVoltageLevel(input.voltageThresholds, 0n)).toEqual({
    currentLevel: 1,
    currentLevelVoltage: 1n,
    nextLevelVoltage: 31n,
    maximumBaseLevel: 3,
  });
});
