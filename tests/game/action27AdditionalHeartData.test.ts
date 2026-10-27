import { expect, it } from 'vite-plus/test';
import { createAdditionalHeartInduceEffect } from '../../src/game/actionTypeEffects/additionalHeart.ts';

function heartAction(skillEffectId: bigint) {
  return {
    skillEffectId,
    details: [
      { id: skillEffectId + 1n, detailType: 'HEART_CALC_TYPE', value: 2n },
      { id: skillEffectId + 2n, detailType: 'HEART_NUM_BASE', value: 10_000n },
      { id: skillEffectId + 3n, detailType: 'HEART_DISPLAY_TIME_TYPE', value: 3n },
    ],
  } as const;
}

it('ActionType27はlong詳細値から条件・AP倍率・期限を生成する', () => {
  const effect = createAdditionalHeartInduceEffect({
    skillEffectId: 27n,
    details: [
      { id: 1n, detailType: 'GET_ADDITIONAL_HEART_INDUCE_TYPE', value: 3n },
      { id: 2n, detailType: 'GET_ADDITIONAL_HEART_INDUCE_VALUE', value: (1n << 32n) + 2n },
      { id: 3n, detailType: 'GET_ADDITIONAL_HEART_EFFECT_ID', value: 100n },
      { id: 4n, detailType: 'GET_ADDITIONAL_HEART_AP_POWER', value: (1n << 53n) + 1n },
      { id: 5n, detailType: 'GET_ADDITIONAL_HEART_DISPLAY_TIME_TYPE', value: 2n },
      {
        id: 6n,
        detailType: 'GET_ADDITIONAL_HEART_DISPLAY_TIME',
        value: (1n << 53n) + 3n,
      },
    ],
    heartAction: heartAction(100n),
  });

  expect(effect).toMatchObject({
    kind: 'additional-heart-induce',
    condition: { kind: 'unit', unit: 2 },
    apPower: (1n << 53n) + 1n,
    duration: { kind: 'sections', value: (1n << 53n) + 3n },
  });
});

it('ActionType27のメンバーとSkillMainEffect条件値はlongのまま保持する', () => {
  for (const [type, value, kind, key] of [
    [1n, (1n << 32n) + 1021n, 'member', 'member'],
    [2n, (1n << 32n) + 25n, 'main-effect', 'actionType'],
  ] as const) {
    const effect = createAdditionalHeartInduceEffect({
      skillEffectId: 27n,
      details: [
        { id: 1n, detailType: 'GET_ADDITIONAL_HEART_INDUCE_TYPE', value: type },
        { id: 2n, detailType: 'GET_ADDITIONAL_HEART_INDUCE_VALUE', value },
        { id: 3n, detailType: 'GET_ADDITIONAL_HEART_EFFECT_ID', value: 100n },
      ],
      heartAction: heartAction(100n),
    });

    expect(effect.condition).toEqual({ kind, [key]: value });
  }
});

it('ActionType27の参照先ActionType1 IDが違う場合は拒否する', () => {
  expect(() =>
    createAdditionalHeartInduceEffect({
      skillEffectId: 27n,
      details: [{ id: 1n, detailType: 'GET_ADDITIONAL_HEART_EFFECT_ID', value: 100n }],
      heartAction: heartAction(101n),
    }),
  ).toThrow('追加きらめきの子ActionType1 IDが一致しません。');
});
