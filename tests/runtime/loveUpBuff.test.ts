import { expect, test } from 'vite-plus/test';
import {
  activateLiveLoveUpAdditionalBuff,
  activateLiveLoveUpBuff,
  createLiveLoveUpBuffState,
  liveLoveUpBonusScoreValue,
} from '../../src/runtime/skills/loveUpBuff.ts';

test('LOVE UPを公式順でProxy power、additional buff、SkillBoostへ適用する', () => {
  const additional = activateLiveLoveUpAdditionalBuff(
    createLiveLoveUpBuffState(),
    loveAdditionalBuffEffect,
    {
      currentTimeSeconds: 1,
      currentMoodValue: 20,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    },
  );
  const result = activateLiveLoveUpBuff(additional, loveUpEffect, {
    currentTimeSeconds: 1,
    currentMoodValue: 20,
    card,
    power: { addValue: 3, multiplyFactor: 0.5, effectPower: 1 },
    applySkillBoost: (value) => Math.fround(value * 1.5),
  });

  expect(result.effectAmount).toBe(28);
  expect(liveLoveUpBonusScoreValue(result.state)).toBe(28);
  expect(result.state.additionalBuffs).toEqual([]);
});

test('同じLOVE UP skillを再発動して発動ごとの効果時間を保持する', () => {
  const first = activateLiveLoveUpBuff(createLiveLoveUpBuffState(), loveUpEffect, {
    currentTimeSeconds: 1,
    currentMoodValue: 20,
    card,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });
  const second = activateLiveLoveUpBuff(first.state, loveUpEffect, {
    currentTimeSeconds: 2,
    currentMoodValue: 20,
    card,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });

  expect(second.state.effects).toHaveLength(2);
  expect(second.state.effects.map(({ duration }) => duration)).toEqual([
    { kind: 'sections', remainingChanges: 2n },
    { kind: 'sections', remainingChanges: 2n },
  ]);
  expect(liveLoveUpBonusScoreValue(second.state)).toBe(first.effectAmount + second.effectAmount);
});

test('同じLOVE additional buffの再発動を重ねて使用回数を個別に消費する', () => {
  const first = activateLiveLoveUpAdditionalBuff(
    createLiveLoveUpBuffState(),
    loveAdditionalBuffEffect,
    {
      currentTimeSeconds: 1,
      currentMoodValue: 20,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      applySkillBoost: (value) => value,
    },
  );
  const repeated = activateLiveLoveUpAdditionalBuff(first, loveAdditionalBuffEffect, {
    currentTimeSeconds: 2,
    currentMoodValue: 20,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });
  const singleResult = activateLiveLoveUpBuff(first, loveUpEffect, {
    currentTimeSeconds: 2,
    currentMoodValue: 20,
    card,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });
  const result = activateLiveLoveUpBuff(repeated, loveUpEffect, {
    currentTimeSeconds: 2,
    currentMoodValue: 20,
    card,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });

  expect(result.effectAmount).toBeGreaterThan(singleResult.effectAmount);
  expect(result.state.additionalBuffs).toEqual([]);
});

const card = {
  charactersId: 1031,
  unitIds: [101],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [],
} as const;

const loveUpEffect = effect(2, '1001', [
  ['LOVE_UP_CALC_TYPE', 1, 0],
  ['LOVE_UP_NUM_BASE', 100_000, 0],
  ['LOVE_UP_NUM_BONUS_MOOD', 10_000, 1],
  ['LOVE_DISPLAY_TIME_TYPE', 2, 0],
  ['LOVE_DISPLAY_TIME', 2, 0],
  ['LOVE_UP_DISABLED_TYPE', 0, 0],
]);

const loveAdditionalBuffEffect = effect(30, '1002', [
  ['LOVE_UP_ADDITIONAL_BUFF_CALC_TYPE', 1, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_NUM', 200_000, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_BONUS_MOOD', 0, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE', 3, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_DISPLAY_TIME', 0, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_DISABLED_TYPE', 1, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_DISABLED', 1, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_TARGET_TYPE', 1, 0],
  ['LOVE_UP_ADDITIONAL_BUFF_TARGET_ID', 1031, 0],
]);

function effect(
  actionType: number,
  id: string,
  values: readonly (readonly [string, number, number])[],
) {
  return {
    id,
    actionType,
    orderId: 1,
    details: values.map(([detailType, effectValue, targetMood], index) => ({
      id: `${id}${String(index)}`,
      detailType,
      effectValue,
      targetMood,
      params: [],
    })),
  };
}
