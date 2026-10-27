import { expect, test } from 'vite-plus/test';
import {
  activateLiveMentalBarrier,
  activateLiveMentalBarrierAdditionalBuff,
  advanceLiveMentalBarrierState,
  applyLiveMentalBarrierDamage,
  createLiveMentalBarrierState,
} from '../../src/runtime/skills/mentalBarrier.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

const card = {
  charactersId: 1031,
  unitIds: [101],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [],
} as const;

test('Mental Barrierの割合耐久値は最大Mentalから算出し、超過damageだけをMentalへ渡す', () => {
  const activated = activateLiveMentalBarrier(createLiveMentalBarrierState(), mentalBarrierEffect, {
    currentTimeSeconds: 0,
    currentMoodValue: 0,
    maximumMental: 500,
    card,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });
  expect(activated.effectAmount).toBe(10);

  const first = applyLiveMentalBarrierDamage(activated.state, 6);
  expect(first.remainingDamage).toBe(0);
  const second = applyLiveMentalBarrierDamage(first.state, 6);
  expect(second.remainingDamage).toBe(2);
  expect(
    advanceLiveMentalBarrierState(second.state, {
      currentTimeSeconds: 1,
      sectionChangeCount: 0,
      musicEnded: false,
    }).effects,
  ).toEqual([]);
});

test('Mental Barrier additional buffは対象cardの次回耐久値へ共通buff経路で適用する', () => {
  const buffed = activateLiveMentalBarrierAdditionalBuff(
    createLiveMentalBarrierState(),
    mentalBarrierAdditionalBuffEffect,
    {
      currentTimeSeconds: 0,
      currentMoodValue: 0,
      power: { addValue: 10, multiplyFactor: 2, effectPower: 1 },
      applySkillBoost: (value) => value * 2,
    },
  );
  const activated = activateLiveMentalBarrier(buffed, mentalBarrierEffect, {
    currentTimeSeconds: 0,
    currentMoodValue: 0,
    maximumMental: 500,
    card,
    power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    applySkillBoost: (value) => value,
  });

  expect(activated.effectAmount).toBe(34);
  expect(activated.state.additionalBuffs).toEqual([]);
});

const mentalBarrierEffect = effect(7, '7001', [
  ['MENTAL_BARRIER_TYPE', 1],
  ['MENTAL_BARRIER_ENDURANCE_TYPE', 1],
  ['MENTAL_BARRIER_ENDURANCE_NUM', 20_000],
  ['MENTAL_BARRIER_ENDURANCE_BONUS_MOOD', 0],
  ['MENTAL_BARRIER_ATTENUATION_NUM', 0],
  ['MENTAL_BARRIER_ATTENUATION_BONUS_MOOD', 0],
  ['MENTAL_BARRIER_DISPLAY_TIME_TYPE', 3],
  ['MENTAL_BARRIER_DISPLAY_TIME', 0],
]);

const mentalBarrierAdditionalBuffEffect = effect(33, '33001', [
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_CALC_TYPE', 1],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_NUM', 500_000],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_BONUS_MOOD', 0],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE', 3],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_DISPLAY_TIME', 0],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_DISABLED_TYPE', 1],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_DISABLED', 1],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_TARGET_TYPE', 1],
  ['MENTAL_BARRIER_ADDITIONAL_BUFF_TARGET_ID', 1031],
]);

function effect(
  actionType: number,
  id: string,
  values: readonly (readonly [string, number])[],
): LiveSkillEffect {
  return {
    id,
    actionType,
    orderId: 1,
    details: values.map(([detailType, effectValue], index) => ({
      id: `${id}${String(index)}`,
      detailType,
      effectValue,
      targetMood: 0,
      params: [],
    })),
  };
}
