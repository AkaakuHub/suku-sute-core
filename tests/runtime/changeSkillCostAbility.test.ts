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
  voltageLevel: 3,
  mentalRatio: 0.5,
  sectionCount: 4,
  deckCards: [
    {
      cardInstanceId: 1,
      charactersId: 101,
      skillIcon: 11,
      styleType: 21,
      unitIds: [31],
    },
    {
      cardInstanceId: 2,
      charactersId: 101,
      skillIcon: 12,
      styleType: 22,
      unitIds: [31],
    },
    {
      cardInstanceId: 3,
      charactersId: 102,
      skillIcon: 11,
      styleType: 21,
      unitIds: [32],
    },
  ],
  handCardInstanceIds: [1, 3],
  loveUpEffect: 1.5,
  moodValue: -2,
  excludeCount: 6,
};

test('runtimeの15条件を同じcost計算式へ投影する', () => {
  const cases: readonly [LiveChangeApEffect['conditionType'], number, number][] = [
    ['none', 0, 1],
    ['use-count', 0, 2],
    ['voltage-level', 0, 3],
    ['mental-ratio', 0, 0.5],
    ['section-count', 0, 4],
    ['member-id-count', 101, 2],
    ['skill-icon-count', 11, 2],
    ['hand-skill-icon-count', 11, 2],
    ['love-up-effect', 0, 1.5],
    ['hand-style-type-count', 21, 2],
    ['hand-member-id-count', 101, 1],
    ['mood-value', 2, 2],
    ['unit-id-count', 31, 2],
    ['hand-unit-id-count', 31, 1],
    ['exclude-count', 0, 6],
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
  const base = effect('use-count', 0);
  const state = activateLiveChangeSkillCostAbility(createLiveChangeSkillCostAbilityState(), 1, {
    ...base,
    amount: 0.75,
    minimum: 0,
    maximum: 1.25,
  });
  expect(resolveLiveChangeSkillCost(state, 1, context)).toBe(2);
});

function effect(
  conditionType: LiveChangeApEffect['conditionType'],
  conditionId: number,
): LiveChangeApEffect {
  return {
    effectId: conditionType,
    amount: 1,
    minimum: -100,
    maximum: 100,
    conditionType,
    conditionId,
    duration: { kind: 'full-end' },
  };
}
