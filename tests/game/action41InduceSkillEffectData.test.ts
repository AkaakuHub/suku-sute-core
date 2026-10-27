import { expect, it } from 'vite-plus/test';
import { createInduceSkillEffect } from '../../src/game/actionTypeEffects/induceSkillEffect.ts';

it('ActionType41はlong詳細値、条件、子効果、期限を変換する', () => {
  const childEffects = [{ actionType: 1, effect: { kind: 'voltage-set', amount: 25 } }] as const;
  expect(
    createInduceSkillEffect({
      skillEffectId: 41n,
      deckCardMax: 30,
      effects: childEffects,
      details: [
        { id: 1n, detailType: 'INDUCE_SKILL_EFFECT_CONDITION_TYPE', value: 3n },
        { id: 2n, detailType: 'INDUCE_SKILL_EFFECT_NUM', value: (1n << 53n) + 1n },
        { id: 3n, detailType: 'INDUCE_SKILL_EFFECT_DECK_UNDER_LIMIT', value: 2_147_483_648n },
        { id: 4n, detailType: 'INDUCE_SKILL_EFFECT_DISPLAY_TIME_TYPE', value: 2n },
        { id: 5n, detailType: 'INDUCE_SKILL_EFFECT_DISPLAY_TIME', value: (1n << 53n) + 5n },
      ],
    }),
  ).toEqual({
    kind: 'induce-skill-effect',
    condition: 'mental-barrier',
    num: (1n << 53n) + 1n,
    deckUnderAdd: 0n,
    deckOverAdd: 0n,
    deckUnderLimit: 2_147_483_648n,
    deckOverLimit: 0n,
    deckCardMax: 30,
    effects: childEffects,
    duration: { kind: 'sections', value: (1n << 53n) + 5n },
  });
});

it('ActionType41は詳細省略時の既定値を適用する', () => {
  expect(
    createInduceSkillEffect({ skillEffectId: 41n, deckCardMax: 30, effects: [], details: [] }),
  ).toMatchObject({ condition: 'voltage', duration: { kind: 'milliseconds', value: 0n } });
});
