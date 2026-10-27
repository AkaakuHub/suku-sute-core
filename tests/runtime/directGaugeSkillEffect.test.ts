import { expect, test } from 'vite-plus/test';
import { resolveLiveDirectGaugeSkillEffect } from '../../src/runtime/skills/directGaugeSkillEffect.ts';

test('RecoverMentalとAddVoltageは共通経路でMoodと発動powerを適用する', () => {
  expect(
    resolveLiveDirectGaugeSkillEffect(effect(5, 'RECOVER_MENTAL', 100_000, 1_000, 1), {
      currentMoodValue: 5,
      power: { addValue: 1, multiplyFactor: 2, effectPower: 0.5 },
    }),
  ).toEqual({ gauge: 'mental', amount: 11 });
  expect(
    resolveLiveDirectGaugeSkillEffect(effect(10, 'ADD_VOLTAGE', 200_000, 1_000, 3), {
      currentMoodValue: -5,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    }),
  ).toEqual({ gauge: 'voltage', amount: 20 });
});

test('共通direct gauge経路は未記録の計算種別を受け入れない', () => {
  const invalid = effect(5, 'RECOVER_MENTAL', 100_000, 0, 0);
  invalid.details[0] = {
    id: '1',
    detailType: 'RECOVER_MENTAL_NUM_TYPE',
    targetMood: 0,
    effectValue: 2,
    params: [],
  };
  expect(() =>
    resolveLiveDirectGaugeSkillEffect(invalid, {
      currentMoodValue: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    }),
  ).toThrow('Mental recovery calculation type differs');
});

function effect(
  actionType: 5 | 10,
  prefix: 'RECOVER_MENTAL' | 'ADD_VOLTAGE',
  baseValue: number,
  bonusMood: number,
  targetMood: number,
) {
  return {
    id: String(actionType),
    actionType,
    orderId: 1,
    details: [
      {
        id: '1',
        detailType: `${prefix}_NUM_TYPE`,
        targetMood: 0,
        effectValue: 1,
        params: [],
      },
      {
        id: '2',
        detailType: `${prefix}_NUM`,
        targetMood: 0,
        effectValue: baseValue,
        params: [],
      },
      {
        id: '3',
        detailType: `${prefix}_BONUS_MOOD`,
        targetMood,
        effectValue: bonusMood,
        params: [],
      },
    ],
  };
}
