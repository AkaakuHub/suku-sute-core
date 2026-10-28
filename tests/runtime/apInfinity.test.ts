import { expect, test } from 'vite-plus/test';
import { activateLiveApInfinitySkillEffect } from '../../src/runtime/skills/apInfinity.ts';
import {
  advanceLiveAutomaticGaugeRuntime,
  createLiveAutomaticGaugeRuntimeState,
  type LiveAutomaticGaugeRuntimeInput,
} from '../../src/runtime/live/automaticGaugeRuntime.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

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
  ],
  maximumVoltageLevel: 2,
};

const apInfinityEffect: LiveSkillEffect = {
  id: '10215230010',
  actionType: 39,
  orderId: 1,
  details: [
    {
      id: '102152300100',
      detailType: 'INFINITY_GAUGE_TYPE',
      targetMood: 0,
      effectValue: 1,
      params: [],
    },
    {
      id: '102152300101',
      detailType: 'INFINITY_GAUGE_DISPLAY_TIME_TYPE',
      targetMood: 0,
      effectValue: 3,
      params: [],
    },
    {
      id: '102152300102',
      detailType: 'INFINITY_GAUGE_DISPLAY_TIME',
      targetMood: 0,
      effectValue: 0,
      params: [],
    },
  ],
};

test('保存ActionType39のAP Infinityは無期限状態をruntimeへ適用しAP frameを非表示にする', () => {
  const state = createLiveAutomaticGaugeRuntimeState(input);
  const infinityState = activateLiveApInfinitySkillEffect(state, apInfinityEffect);
  const frame = advanceLiveAutomaticGaugeRuntime(
    { ...infinityState, ap: { currentAp: 4, maxAp: 20, timerSeconds: 0.5 } },
    2,
    input,
    {
      setVoltage: (value: bigint) => value,
      setAp: (value) => value,
      addAp: (value, amount) => value + amount,
      genesisSkillActive: false,
      stopVoltageIncreaseRequestCount: 0,
      disableMentalDown: false,
      mentalDecreaseIntervalFactor: 1,
      subMentalOne: (currentMental) => Math.max(currentMental - 1, 0),
      addVoltage: (currentVoltage) => currentVoltage + 1n,
    },
  );

  expect(frame.state.apInfinity).toBe(true);
  expect(frame.state.ap).toEqual({
    currentAp: 4,
    maxAp: 20,
    timerSeconds: 0.5,
  });
  expect(frame.ap.gaugeDisplayValue).toBeNull();
});

test('AP以外のInfinity GaugeはAP runtimeへ適用しない', () => {
  const voltageEffect: LiveSkillEffect = {
    ...apInfinityEffect,
    details: apInfinityEffect.details.map((detail) =>
      detail.detailType === 'INFINITY_GAUGE_TYPE' ? { ...detail, effectValue: 2 } : detail,
    ),
  };

  expect(() =>
    activateLiveApInfinitySkillEffect(createLiveAutomaticGaugeRuntimeState(input), voltageEffect),
  ).toThrow('Live AP Infinity effect values differ');
});
