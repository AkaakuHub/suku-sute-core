import { expect, test } from 'vite-plus/test';
import {
  activateLiveChangeSkillCostAbility,
  createLiveChangeSkillCostAbilityState,
  type LiveChangeSkillCostContext,
  resolveLiveChangeSkillCost,
} from '../../src/runtime/skills/changeSkillCostAbility.ts';
import type { LiveChangeApEffect } from '../../src/runtime/cards/deckActionTypes.ts';

const context: LiveChangeSkillCostContext = {
  useCount: 2,
  voltage: { currentVoltage: 3n, timerSeconds: 0 },
  voltageThresholds: [
    { voltageLevel: 1, requiredVoltagePoint: 1n },
    { voltageLevel: 2, requiredVoltagePoint: 2n },
    { voltageLevel: 3, requiredVoltagePoint: 3n },
  ],
  maximumVoltageLevel: 3,
  mental: { currentMental: 50, timerSeconds: 0, mentalDown: false },
  maximumMental: 100,
  currentSection: 4,
  feverSection: null,
  cardTotal: 3,
  deckCount: 1,
  graveyardCount: 0,
  tokenCardSeriesCount: () => 0,
  memberFanLevelTotal: () => 0,
  beatHeartValue: 0,
  sectionCount: 4,
  deckCards: [
    {
      cardInstanceId: 1,
      charactersId: 101,
      skillIcon: 11,
      skillMainEffect: 110,
      styleType: 21,
      unitIds: [31],
    },
    {
      cardInstanceId: 2,
      charactersId: 101,
      skillIcon: 12,
      skillMainEffect: 120,
      styleType: 22,
      unitIds: [31],
    },
    {
      cardInstanceId: 3,
      charactersId: 102,
      skillIcon: 11,
      skillMainEffect: 110,
      styleType: 21,
      unitIds: [32],
    },
  ],
  handCardInstanceIds: [1, 3],
  loveUpEffect: 1.5,
  moodValue: -2,
  exclusionCount: 6,
};

test('runtimeの15条件を同じcost計算式へ投影する', () => {
  const cases: readonly [LiveChangeApEffect['conditionType'], number, number][] = [
    [1, 0, 1],
    [2, 0, 2],
    [3, 0, 3],
    [4, 0, 0.5],
    [5, 0, 4],
    [6, 101, 2],
    [7, 11, 2],
    [8, 110, 2],
    [9, 0, 1.5],
    [10, 21, 2],
    [11, 101, 1],
    [12, 2, 2],
    [13, 31, 2],
    [14, 31, 1],
    [15, 0, 6],
  ];
  for (const [conditionType, conditionId, value] of cases) {
    const state = activateLiveChangeSkillCostAbility(
      createLiveChangeSkillCostAbilityState(),
      1,
      effect(conditionType, conditionId),
    );
    expect(resolveLiveChangeSkillCost(state, 1, context)).toBe(Math.ceil(value));
  }
});

test('条件積をminimumとmaximumで制限して切り上げる', () => {
  const base = effect(2, 0);
  const state = activateLiveChangeSkillCostAbility(createLiveChangeSkillCostAbilityState(), 1, {
    ...base,
    amount: 0.75,
    minimum: 0,
    maximum: 1.25,
  });
  expect(resolveLiveChangeSkillCost(state, 1, context)).toBe(2);
});

test('条件なしの値は上下限制限や切り上げを行わない', () => {
  const state = activateLiveChangeSkillCostAbility(createLiveChangeSkillCostAbilityState(), 1, {
    ...effect(1, 0),
    amount: 0.25,
    minimum: 1,
    maximum: 2,
  });
  expect(resolveLiveChangeSkillCost(state, 1, context)).toBe(0.25);
});

test('Float32の積を丸めてから切り上げる', () => {
  const state = activateLiveChangeSkillCostAbility(createLiveChangeSkillCostAbilityState(), 1, {
    ...effect(2, 0),
    amount: Math.fround(0.1),
  });
  expect(resolveLiveChangeSkillCost(state, 1, { ...context, useCount: 30 })).toBe(3);
});

test('小数Mentalを整数化してFloat32の割合を使う', () => {
  const state = activateLiveChangeSkillCostAbility(createLiveChangeSkillCostAbilityState(), 1, {
    ...effect(4, 0),
    amount: 3,
  });
  expect(
    resolveLiveChangeSkillCost(state, 1, {
      ...context,
      mental: { ...context.mental, currentMental: 1.9 },
      maximumMental: 3,
    }),
  ).toBe(1);
});

test.each([
  [0, -3, 3],
  [1, -3, 0],
  [2, -3, 3],
  [2, 3, 0],
] as const)('気分条件%dの符号と絶対値をAPKに合わせる', (id, moodValue, expected) => {
  const state = activateLiveChangeSkillCostAbility(
    createLiveChangeSkillCostAbilityState(),
    1,
    effect(12, id),
  );
  expect(resolveLiveChangeSkillCost(state, 1, { ...context, moodValue })).toBe(expected);
});

function effect(
  conditionType: LiveChangeApEffect['conditionType'],
  conditionId: number,
): LiveChangeApEffect {
  return {
    effectId: String(conditionType),
    amount: 1,
    minimum: -100,
    maximum: 100,
    conditionType,
    conditionId,
    duration: { kind: 'full-end' },
  };
}
