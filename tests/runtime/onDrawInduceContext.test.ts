import { expect, test } from 'vite-plus/test';
import {
  applyLiveOnDrawInduceAbility,
  type LiveOnDrawInduceContext,
} from '../../src/runtime/cards/cardDraw.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

const context: LiveOnDrawInduceContext = {
  currentDrawType: 1,
  currentSection: 0,
  feverSection: 3,
  usedCard: { charactersId: 1001, unitIds: [101] },
  usedSkillMainEffect: null,
};

function forbidden(conditionType: number, conditionValue: number): LiveSkillEffect {
  return {
    id: 'rule',
    actionType: 902,
    orderId: 1,
    details: (
      [
        ['ON_DRAW_INDUCE_PROBABILITY_TYPE', 2],
        ['ON_DRAW_INDUCE_PROBABILITY_NUM', 0],
        ['ON_DRAW_INDUCE_CONDITION_TYPE', conditionType],
        ['ON_DRAW_INDUCE_CONDITION_VALUE', conditionValue],
        ['ON_DRAW_INDUCE_CONDITION_NOT_FLAG', 1],
      ] as const
    ).map(([detailType, effectValue], index) => ({
      id: String(index),
      detailType,
      effectValue,
      targetMood: 0,
      params: [],
    })),
  };
}

for (const [kind, value] of [
  [1, 1001],
  [5, 101],
] as const) {
  test(`全手札補充は使用スキルが空でも使用カードの条件${kind}を適用する`, () => {
    expect(applyLiveOnDrawInduceAbility(10000, [forbidden(kind, value)], context)).toBe(0);
  });
}

test('全手札補充では使用スキルを参照する条件を適用しない', () => {
  const effect = forbidden(2, 42);
  expect(applyLiveOnDrawInduceAbility(10000, [effect], context)).toBe(10000);
  expect(
    applyLiveOnDrawInduceAbility(10000, [effect], { ...context, usedSkillMainEffect: 42 }),
  ).toBe(0);
});

for (const currentDrawType of [0, 2, 3] as const) {
  test(`DrawType${currentDrawType}には使用カードを残さない`, () => {
    expect(() => applyLiveOnDrawInduceAbility(10000, [], { ...context, currentDrawType })).toThrow(
      'Live draw context differs from draw type',
    );
  });
}

test('DrawType1には使用元カードが必要である', () => {
  expect(() => applyLiveOnDrawInduceAbility(10000, [], { ...context, usedCard: null })).toThrow(
    'Live draw context differs from draw type',
  );
});
