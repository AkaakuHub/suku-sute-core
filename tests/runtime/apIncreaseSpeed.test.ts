import { observeLiveApIncreaseSpeedEffect } from '../../src/runtime/skills/apIncreaseSpeedObservation.ts';
import { expect, test } from 'vite-plus/test';
import {
  activateLiveApIncreaseSpeed,
  advanceLiveApIncreaseSpeedState,
  createLiveApIncreaseSpeedState,
  resolveLiveApIncreaseIntervalSeconds,
} from '../../src/runtime/skills/apIncreaseSpeed.ts';

test('倍率型は短縮率へSkillBoostを適用してAP intervalを変更する', () => {
  const boostedValues: number[] = [];
  const activated = activateLiveApIncreaseSpeed(
    createLiveApIncreaseSpeedState(),
    effect('21001', 2, 8_600, 3, 0),
    {
      currentTimeSeconds: 0,
      currentMoodValue: 0,
      currentIncreaseIntervalSeconds: 1,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => {
        boostedValues.push(value);
        return Math.fround(value * 1.5);
      },
    },
  );

  expect(boostedValues).toEqual([1_400]);
  expect(activated.effectAmount).toBe(21);
  const calculation = activated.state[0]?.calculation;
  expect(calculation?.kind).toBe('multiply');
  if (calculation?.kind !== 'multiply') {
    throw new Error('AP increase speed calculation is not multiply');
  }
  expect(calculation.factor).toBeCloseTo(0.79);
  expect(resolveLiveApIncreaseIntervalSeconds(1, activated.state)).toBeCloseTo(0.79);
});

test('加算型はruntimeどおりSkillBoostを消費するが登録値には適用しない', () => {
  let boostUseCount = 0;
  const activated = activateLiveApIncreaseSpeed(
    createLiveApIncreaseSpeedState(),
    effect('21002', 1, -200, 1, 1_000),
    {
      currentTimeSeconds: 0,
      currentMoodValue: 0,
      currentIncreaseIntervalSeconds: 1,
      power: { addValue: 20, multiplyFactor: 2, effectPower: 1 },
      applySkillBoost: (value) => {
        boostUseCount += 1;
        return value * 2;
      },
    },
  );

  expect(boostUseCount).toBe(1);
  expect(activated.state[0]?.calculation).toEqual({
    kind: 'add',
    milliseconds: -360,
  });
  expect(activated.effectAmount).toBe(36);
  expect(resolveLiveApIncreaseIntervalSeconds(1, activated.state)).toBeCloseTo(0.64);
  expect(
    advanceLiveApIncreaseSpeedState(activated.state, {
      deltaTimeSeconds: 1,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toEqual([]);
});

test('同じSkill groupの倍率は差分加算し、加算値の後に適用する', () => {
  const state = [
    {
      effectId: 'add',
      calculation: { kind: 'add', milliseconds: 200 },
      duration: { kind: 'full-end' },
    },
    {
      effectId: 'multiply-1',
      calculation: { kind: 'multiply', factor: 0.8 },
      duration: { kind: 'full-end' },
    },
    {
      effectId: 'multiply-2',
      calculation: { kind: 'multiply', factor: 0.7 },
      duration: { kind: 'full-end' },
    },
  ] as const;

  expect(resolveLiveApIncreaseIntervalSeconds(1, state)).toBeCloseTo(0.6);
});

function effect(
  id: string,
  calculationType: number,
  value: number,
  displayTimeType: number,
  displayTime: number,
) {
  return {
    id,
    actionType: 21,
    orderId: 1,
    details: [
      detail(`${id}0`, 'CHANGE_AP_INCREASE_SPEED_CALC_TYPE', calculationType),
      detail(`${id}1`, 'CHANGE_AP_INCREASE_SPEED_NUM', value),
      detail(`${id}2`, 'CHANGE_AP_INCREASE_SPEED_NUM_BONUS_MOOD', 0),
      detail(`${id}3`, 'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME_TYPE', displayTimeType),
      detail(`${id}4`, 'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME', displayTime),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}

test('Float32で0.7倍を100換算して切り上げると吸収量は31になる', () => {
  expect(
    observeLiveApIncreaseSpeedEffect({ kind: 'multiply', factor: Math.fround(0.7) }, 1),
  ).toEqual({ effectAmount: 31, absorptionAmount: 31 });
  expect(
    observeLiveApIncreaseSpeedEffect({ kind: 'add', milliseconds: -25 }, 1.2).absorptionAmount,
  ).toBe(3);
});

test('AP速度低下は負のFloat32通知値を保ちProxyへ送らない', () => {
  const observation = observeLiveApIncreaseSpeedEffect(
    { kind: 'multiply', factor: Math.fround(1.001) },
    1,
  );
  expect(observation.absorptionAmount).toBeNull();
  expect(observation.effectAmount).toBe(Math.fround(Math.fround(1 - Math.fround(1.001)) * 100));
});
