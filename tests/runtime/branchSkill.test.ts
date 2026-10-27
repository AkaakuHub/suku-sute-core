import { describe, expect, test } from 'vite-plus/test';
import {
  createLiveBranchSkill,
  type LiveBranchConditionInput,
  resolveLiveBranchEffect,
  resolveLiveBranchLeafEffect,
} from '../../src/runtime/skills/branchSkill.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('Live Branch skill', () => {
  test.each([
    [1, 4, { voltageLevel: 4 }],
    [2, 500_000, { mentalRatio: 0.5 }],
    [3, 25, { moodValue: 25 }],
    [4, 3, { currentSection: 2 }],
    [5, 99, { currentSection: 2, feverSection: 2 }],
    [6, 6, { cardTotal: 6 }],
    [7, 3, { deckCount: 3 }],
    [8, 2, { graveyardCount: 2 }],
    [9, 2, { tokenCardSeriesCount: () => 2 }],
    [10, 200, { memberFanLevelTotal: () => 200 }],
    [11, 20_000, { beatHeartValue: 2 }],
    [12, 3, { moodValue: -1 }],
    [13, 1, { exclusionCount: 1 }],
  ] as const)(
    '条件種別%dはruntimeの境界値で成立側effectを選ぶ',
    (branchType, branchValue, override) => {
      const effects = branchEffects(branchType, branchValue);
      const branch = createLiveBranchSkill(effects[0], effects);
      expect(
        resolveLiveBranchEffect(branch, {
          ...conditionInput(),
          ...override,
        })?.id,
      ).toBe('1002');
    },
  );

  test('通常section番号はFever sectionを除外して1始まりで照合する', () => {
    const effects = branchEffects(5, 3);
    const branch = createLiveBranchSkill(effects[0], effects);
    expect(
      resolveLiveBranchEffect(branch, {
        ...conditionInput(),
        currentSection: 3,
        feverSection: 1,
      })?.id,
    ).toBe('1002');
  });

  test('条件不成立時はfalse側effectを選ぶ', () => {
    const effects = branchEffects(1, 5);
    const branch = createLiveBranchSkill(effects[0], effects);
    expect(resolveLiveBranchEffect(branch, conditionInput())?.id).toBe('1003');
  });

  test('Mood未解決でもMoodを参照しない条件は評価する', () => {
    const effects = branchEffects(1, 4);
    const branch = createLiveBranchSkill(effects[0], effects);
    expect(
      resolveLiveBranchEffect(branch, {
        ...conditionInput(),
        moodValue: null,
      })?.id,
    ).toBe('1002');
  });

  test('入れ子の分岐を末端effectまで解決する', () => {
    const effects = branchEffects(1, 4);
    const nested = { ...branchEffects(3, 1)[0], id: '2001' };
    const root = {
      ...effects[0],
      details: effects[0].details.map((detail) =>
        detail.detailType === 'BRANCH_EFFECT_ID1'
          ? { ...detail, effectValue: Number(nested.id) }
          : detail,
      ),
    };
    expect(
      resolveLiveBranchLeafEffect(root, [root, nested, ...effects.slice(1)], {
        ...conditionInput(),
        moodValue: 0,
      })?.id,
    ).toBe('1003');
  });

  test('循環する分岐は拒否する', () => {
    const effects = branchEffects(1, 4);
    const root = {
      ...effects[0],
      details: effects[0].details.map((detail) =>
        detail.detailType === 'BRANCH_EFFECT_ID1'
          ? { ...detail, effectValue: Number(effects[0].id) }
          : detail,
      ),
    };
    expect(() =>
      resolveLiveBranchLeafEffect(root, [root, ...effects.slice(1)], conditionInput()),
    ).toThrow('Live Branch effect cycle detected:1001');
  });
});

function branchEffects(
  branchType: number,
  branchValue: number,
): readonly [LiveSkillEffect, LiveSkillEffect, LiveSkillEffect] {
  const targetParams =
    branchType === 9 || branchType === 10
      ? [
          {
            id: '10004',
            detailType: 'BRANCH_TARGET_PARAMS',
            targetMood: 0,
            effectValue: 10004,
            params: [{ paramType: 'BRANCH_TARGET_PARAMS', paramValue: '101,102' }],
          },
        ]
      : [];
  return [
    {
      id: '1001',
      actionType: 12,
      orderId: 1,
      details: [
        detail('10010', 'BRANCH_TYPE', branchType),
        detail('10011', 'BRANCH_VALUE', branchValue),
        detail('10012', 'BRANCH_EFFECT_ID1', 1002),
        detail('10013', 'BRANCH_EFFECT_ID2', 1003),
        ...targetParams,
      ],
    },
    leafEffect('1002'),
    leafEffect('1003'),
  ];
}

function leafEffect(id: string): LiveSkillEffect {
  return {
    id,
    actionType: 5,
    orderId: 2,
    details: [detail(`${id}0`, 'ADD_VOLTAGE_NUM_TYPE', 1)],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}

function conditionInput(): LiveBranchConditionInput {
  return {
    voltageLevel: 4,
    mentalRatio: 0.49,
    moodValue: 0,
    currentSection: 0,
    feverSection: 2,
    cardTotal: 5,
    deckCount: 2,
    graveyardCount: 1,
    tokenCardSeriesCount: () => 1,
    memberFanLevelTotal: () => 100,
    beatHeartValue: 1,
    exclusionCount: 0,
  };
}
