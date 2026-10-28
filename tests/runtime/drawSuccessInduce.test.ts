import type { LiveConditionContext } from '../../src/runtime/live/conditionContext.ts';
import {
  activateLiveGenesisEffect,
  createLiveGenesisState,
} from '../../src/runtime/skills/genesisSkill.ts';
import { describe, expect, test } from 'vite-plus/test';
import {
  createLiveDrawSuccessInduce,
  resolveLiveDrawSuccessInduceEffect,
} from '../../src/runtime/skills/drawSuccessInduce.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('DrawSuccessInduce', () => {
  test('Mental割合以下でtrue effectを選び、Genesis中は常にtrueを選ぶ', () => {
    const effects = [root(2, 500_000), embedded('11'), embedded('12')];
    const induce = createLiveDrawSuccessInduce(effects[0]!, effects);
    expect(
      resolveLiveDrawSuccessInduceEffect(
        induce,
        input({ mental: { currentMental: 50, timerSeconds: 0, mentalDown: false } }),
        createLiveGenesisState(),
      )?.id,
    ).toBe('11');
    expect(
      resolveLiveDrawSuccessInduceEffect(
        induce,
        input({ mental: { currentMental: 60, timerSeconds: 0, mentalDown: false } }),
        createLiveGenesisState(),
      )?.id,
    ).toBe('12');
    expect(
      resolveLiveDrawSuccessInduceEffect(
        induce,
        input({ mental: { currentMental: 90, timerSeconds: 0, mentalDown: false } }),
        activeGenesis(),
      )?.id,
    ).toBe('11');
  });

  test('Voltage、section範囲、Feverを除くsection番号をruntime条件で判定する', () => {
    const voltage = createLiveDrawSuccessInduce(root(5, 70_000), [
      root(5, 70_000),
      embedded('11'),
      embedded('12'),
    ]);
    expect(
      resolveLiveDrawSuccessInduceEffect(
        voltage,
        input({ voltage: { currentVoltage: 7n, timerSeconds: 0 } }),
        createLiveGenesisState(),
      )?.id,
    ).toBe('11');
    const rangeEffects = [root(6, 3), embedded('11'), embedded('12')];
    expect(
      resolveLiveDrawSuccessInduceEffect(
        createLiveDrawSuccessInduce(rangeEffects[0]!, rangeEffects),
        input({ currentSection: 3 }),
        createLiveGenesisState(),
      )?.id,
    ).toBe('12');
    const sectionEffects = [root(7, 2), embedded('11'), embedded('12')];
    expect(
      resolveLiveDrawSuccessInduceEffect(
        createLiveDrawSuccessInduce(sectionEffects[0]!, sectionEffects),
        input({ currentSection: 2, feverSection: 1 }),
        createLiveGenesisState(),
      )?.id,
    ).toBe('11');
  });

  test.each([
    [
      2,
      500_000,
      { mental: { currentMental: 1.9, timerSeconds: 0, mentalDown: false }, maximumMental: 3 },
      '11',
    ],
    [
      2,
      5,
      {
        mental: { currentMental: 5, timerSeconds: 0, mentalDown: false },
        maximumMental: 1_000_000,
      },
      '11',
    ],
    [4, 10_000, { moodValue: 2 }, '12'],
    [4, 10_000, { moodValue: 1 }, '11'],
    [7, 3, { currentSection: 2, feverSection: null }, '11'],
  ] as const)('条件種別%dはAPKの数値変換と実状態を使う', (type, value, override, expected) => {
    const effects = [root(type, value), embedded('11'), embedded('12')];
    expect(
      resolveLiveDrawSuccessInduceEffect(
        createLiveDrawSuccessInduce(effects[0]!, effects),
        input(override),
        createLiveGenesisState(),
      )?.id,
    ).toBe(expected);
  });

  test('解除種別未指定はcontinuous branchだけ継続になる', () => {
    const alwaysEffects = [root(1, 0), embedded('11'), embedded('12')];
    const continuousEffects = [root(3, 0), embedded('11'), embedded('12')];
    expect(createLiveDrawSuccessInduce(alwaysEffects[0]!, alwaysEffects).disabledType).toBe(0);
    expect(createLiveDrawSuccessInduce(continuousEffects[0]!, continuousEffects).disabledType).toBe(
      1,
    );
  });
});

function input(overrides: Partial<LiveConditionContext>): LiveConditionContext {
  return {
    mental: { currentMental: 100, timerSeconds: 0, mentalDown: false },
    maximumMental: 100,
    moodValue: 0,
    voltage: { currentVoltage: 1n, timerSeconds: 0 },
    voltageThresholds: Array.from({ length: 11 }, (_, level) => ({
      voltageLevel: level + 1,
      requiredVoltagePoint: BigInt(level + 1),
    })),
    maximumVoltageLevel: 10,
    currentSection: 0,
    feverSection: 4,
    cardTotal: 1,
    deckCount: 1,
    graveyardCount: 0,
    exclusionCount: 0,
    tokenCardSeriesCount: () => 0,
    memberFanLevelTotal: () => 0,
    beatHeartValue: 0,
    ...overrides,
  };
}

function activeGenesis() {
  return activateLiveGenesisEffect(
    createLiveGenesisState(),
    {
      effectId: 'genesis',
      effectValue: 1,
      duration: { kind: 'full-end' },
    },
    { currentAp: 0, currentMental: 100, currentVoltage: 1n, currentVoltageLevel: 1 },
  );
}

function root(branchType: number, branchValue: number): LiveSkillEffect {
  return {
    id: '901',
    actionType: 901,
    orderId: 1,
    details: [
      detail('9010', 'DRAW_SUCCESS_INDUCE_BRANCH_TYPE', branchType),
      detail('9011', 'DRAW_SUCCESS_INDUCE_BRANCH_VALUE', branchValue),
      detail('9012', 'DRAW_SUCCESS_INDUCE_EFFECT_ID1', 11),
      detail('9013', 'DRAW_SUCCESS_INDUCE_EFFECT_ID2', 12),
    ],
  };
}

function embedded(id: string): LiveSkillEffect {
  return {
    id,
    actionType: 14,
    orderId: 2,
    details: [detail(`${id}0`, 'RECOVER_AP_NUM', 10_000)],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
