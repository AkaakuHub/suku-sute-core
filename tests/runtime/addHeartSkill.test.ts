import { expect, test } from 'vite-plus/test';
import { resolveLiveAddHeartOption } from '../../src/runtime/skills/addHeartSkill.ts';

test('Add Heartはruntime順でMood、発動power、SkillBoostを比率へ適用する', () => {
  const boostedValues: number[] = [];
  expect(
    resolveLiveAddHeartOption(effect(1, 1, 2_500), {
      currentMoodValue: 2,
      power: { addValue: 0.1, multiplyFactor: 2, effectPower: 0.5 },
      applySkillBoost: (value) => {
        boostedValues.push(value);
        return value * 1.25;
      },
    }),
  ).toEqual({
    calculation: { kind: 'beat-ratio', value: 5 },
    lifeTimeSeconds: 2.5,
    effectPower: 0.5,
  });
  expect(boostedValues).toEqual([4]);
});

test('Add Heartの固定個数とSECTION寿命はruntimeのOptionExtraHeart値になる', () => {
  expect(
    resolveLiveAddHeartOption(effect(2, 3, 2), {
      currentMoodValue: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    }),
  ).toEqual({
    calculation: { kind: 'fixed', value: 2 },
    lifeTimeSeconds: 9999,
    effectPower: 1,
  });
});

function effect(calculationType: 1 | 2, displayTimeType: 1 | 2 | 3, displayTime: number) {
  return {
    id: '1',
    actionType: 1,
    orderId: 1,
    details: [
      value('1', 'HEART_CALC_TYPE', calculationType),
      value('2', 'HEART_NUM_BASE', 15_000),
      {
        ...value('3', 'HEART_NUM_BONUS_MOOD', 1_000),
        targetMood: 1,
      },
      value('4', 'HEART_DISPLAY_TIME_TYPE', displayTimeType),
      value('5', 'HEART_DISPLAY_TIME', displayTime),
    ],
  };
}

function value(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
