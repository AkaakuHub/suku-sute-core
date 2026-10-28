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
  usedCard: { charactersId: 1001, unitIds: [101], skillMainEffect: 14 },
  usedSkill: null,
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

test('全手札補充と通常スキルは使用カードのMainEffectを参照する', () => {
  const effect = forbidden(2, 14);
  expect(applyLiveOnDrawInduceAbility(10000, [effect], context)).toBe(0);
  expect(
    applyLiveOnDrawInduceAbility(10000, [effect], {
      ...context,
      usedSkill: { skillType: 2, skillMainEffect: 42 },
    }),
  ).toBe(0);
  expect(
    applyLiveOnDrawInduceAbility(10000, [forbidden(2, 42)], {
      ...context,
      usedSkill: { skillType: 2, skillMainEffect: 42 },
    }),
  ).toBe(10000);
});

test.each([1, 2])(
  'Special Appealは指定スキルのMainEffectを参照し、反転flag%sの影響を受けない',
  (flag) => {
    const effect = (value: number) => ({
      ...forbidden(2, value),
      details: forbidden(2, value).details.map((detail) =>
        detail.detailType === 'ON_DRAW_INDUCE_CONDITION_NOT_FLAG'
          ? { ...detail, effectValue: flag }
          : detail,
      ),
    });
    const special = { ...context, usedSkill: { skillType: 1 as const, skillMainEffect: 42 } };
    expect(applyLiveOnDrawInduceAbility(10000, [effect(42)], special)).toBe(0);
    expect(applyLiveOnDrawInduceAbility(10000, [effect(14)], special)).toBe(10000);
  },
);

test.each([
  { section: 0, condition: 1, expected: 0 },
  { section: 1, condition: 1, expected: 10000 },
  { section: 3, condition: 1, expected: 10000 },
  { section: 3, condition: 99, expected: 0 },
  { section: 4, condition: 4, expected: 0 },
  { section: 4, condition: 99, expected: 10000 },
])('パート条件は山場を除いた番号と99を判定する:%j', ({ section, condition, expected }) => {
  expect(
    applyLiveOnDrawInduceAbility(10000, [forbidden(3, condition)], {
      ...context,
      currentSection: section,
    }),
  ).toBe(expected);
});

test('禁止後の優先指定では確率0を復活させない', () => {
  const first = forbidden(1, 1001);
  const priority = {
    ...first,
    details: first.details.map((detail) =>
      detail.detailType === 'ON_DRAW_INDUCE_PROBABILITY_TYPE'
        ? { ...detail, effectValue: 1 }
        : detail,
    ),
  };
  expect(applyLiveOnDrawInduceAbility(10000, [first, priority], context)).toBe(0);
});

test('独自カードのメンバー未指定・所属なしと山場なしの楽曲を扱う', () => {
  expect(
    applyLiveOnDrawInduceAbility(10000, [forbidden(1, 1031)], {
      ...context,
      usedCard: { charactersId: 0, unitIds: [], skillMainEffect: null },
      feverSection: -1,
    }),
  ).toBe(10000);
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
