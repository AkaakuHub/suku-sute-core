import { activateLiveBranchSkill } from '../../src/runtime/skills/branchSkillActivation.ts';
import {
  activateLiveGenesisEffect,
  createLiveGenesisState,
} from '../../src/runtime/skills/genesisSkill.ts';
import type { LiveConditionContext } from '../../src/runtime/live/conditionContext.ts';
import { describe, expect, test } from 'vite-plus/test';
import {
  createLiveBranchSkill,
  resolveLiveBranchEffect,
  resolveLiveBranchLeafEffect,
} from '../../src/runtime/skills/branchSkill.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('Live Branch skill', () => {
  test.each([
    [1, 4, { voltage: { currentVoltage: 3n, timerSeconds: 0 } }],
    [2, 500_000, { mental: { currentMental: 50, timerSeconds: 0, mentalDown: false } }],
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

  test('メンタル現在値の小数部を切り捨ててから割合を判定する', () => {
    const effects = branchEffects(2, 500_000);
    const input = {
      ...conditionInput(),
      mental: { currentMental: 1.9, timerSeconds: 0, mentalDown: false },
      maximumMental: 3,
    };
    expect(resolveLiveBranchEffect(createLiveBranchSkill(effects[0], effects), input)?.id).toBe(
      '1003',
    );
  });

  test('条件値をFloat32で10000と100に順番に割って境界を判定する', () => {
    const effects = branchEffects(2, 5);
    const input = {
      ...conditionInput(),
      mental: { currentMental: 5, timerSeconds: 0, mentalDown: false },
      maximumMental: 1_000_000,
    };
    expect(resolveLiveBranchEffect(createLiveBranchSkill(effects[0], effects), input)?.id).toBe(
      '1003',
    );
  });

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

describe('通常分岐の発動', () => {
  const activeGenesis = () =>
    activateLiveGenesisEffect(
      createLiveGenesisState(),
      { effectId: '1', effectValue: 1, duration: { kind: 'full-end' } },
      { currentAp: 0, currentMental: 100, currentVoltage: 0n, currentVoltageLevel: 1 },
    );
  const state = (active: boolean) => ({
    context: conditionInput(),
    genesis: active ? activeGenesis() : createLiveGenesisState(),
    appliedEffectIds: [] as readonly string[],
  });
  type State = ReturnType<typeof state>;
  const ports = {
    conditionContext: (current: State) => current.context,
    genesis: (current: State) => current.genesis,
    applyEffect: (current: State, effect: LiveSkillEffect): State => ({
      ...current,
      appliedEffectIds: [...current.appliedEffectIds, effect.id],
    }),
  };
  test.each([
    [1, 5, ['1002', '1003']],
    [2, 500_000, ['1002', '1003']],
    [3, 1, ['1003']],
  ] as const)('Genesis中の条件種別%dはAPKの子effectを順に発動する', (type, value, expected) => {
    const effects = branchEffects(type, value);
    expect(
      activateLiveBranchSkill(state(true), effects[0], effects, ports).appliedEffectIds,
    ).toEqual(expected);
  });
  test('true側の状態変更後にfalse側の入れ子の条件を判定する', () => {
    const root = {
      ...branchEffects(1, 5)[0],
      details: branchEffects(1, 5)[0].details.map((detail) =>
        detail.detailType === 'BRANCH_EFFECT_ID2' ? { ...detail, effectValue: 2001 } : detail,
      ),
    };
    const nested = {
      ...branchEffects(3, 10)[0],
      id: '2001',
      details: branchEffects(3, 10)[0].details.map((detail) =>
        detail.detailType === 'BRANCH_EFFECT_ID1'
          ? { ...detail, effectValue: 1003 }
          : detail.detailType === 'BRANCH_EFFECT_ID2'
            ? { ...detail, effectValue: 1004 }
            : detail,
      ),
    };
    const effects = [root, nested, leafEffect('1002'), leafEffect('1003'), leafEffect('1004')];
    const result = activateLiveBranchSkill(state(true), root, effects, {
      ...ports,
      applyEffect: (current, effect) => ({
        ...ports.applyEffect(current, effect),
        context: {
          ...current.context,
          moodValue: effect.id === '1002' ? 20 : current.context.moodValue,
        },
      }),
    });
    expect(result.appliedEffectIds).toEqual(['1002', '1003']);
  });
  test('通常時に通らない循環もGenesisでfalse側へ進む場合は拒否する', () => {
    const root = {
      ...branchEffects(1, 4)[0],
      details: branchEffects(1, 4)[0].details.map((detail) =>
        detail.detailType === 'BRANCH_EFFECT_ID2' ? { ...detail, effectValue: 1001 } : detail,
      ),
    };
    const effects = [root, leafEffect('1002')];
    expect(activateLiveBranchSkill(state(false), root, effects, ports).appliedEffectIds).toEqual([
      '1002',
    ]);
    expect(() => activateLiveBranchSkill(state(true), root, effects, ports)).toThrow(
      'Live Branch effect cycle detected:1001',
    );
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

function conditionInput(): LiveConditionContext {
  return {
    voltage: { currentVoltage: 3n, timerSeconds: 0 },
    voltageThresholds: [0n, 1n, 2n, 3n].map((requiredVoltagePoint, index) => ({
      voltageLevel: index + 1,
      requiredVoltagePoint,
    })),
    maximumVoltageLevel: 4,
    mental: { currentMental: 49, timerSeconds: 0, mentalDown: false },
    maximumMental: 100,
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
