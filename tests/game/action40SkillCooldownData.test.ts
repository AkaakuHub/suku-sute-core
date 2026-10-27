import { expect, it } from 'vite-plus/test';
import { createSkillCooldownEffect } from '../../src/game/actionTypeEffects/skillCooldown.ts';

it('ActionType40はlongをfloat32化し、枚数上限をint32化する', () => {
  expect(
    createSkillCooldownEffect({
      skillEffectId: 40n,
      deckCardMax: 30,
      details: [
        { id: 1n, detailType: 'SKILL_COOL_TIME_NUM', value: 16_777_217n },
        { id: 2n, detailType: 'SKILL_COOL_TIME_DECK_UNDER_ADD', value: 2_147_483_648n },
        { id: 3n, detailType: 'SKILL_COOL_TIME_DECK_OVER_ADD', value: -1n },
        { id: 4n, detailType: 'SKILL_COOL_TIME_DECK_UNDER_LIMIT', value: 2_147_483_648n },
        { id: 5n, detailType: 'SKILL_COOL_TIME_DECK_OVER_LIMIT', value: 3n },
        { id: 6n, detailType: 'SKILL_COOL_TIME_DISPLAY_TIME_TYPE', value: 2n },
        { id: 7n, detailType: 'SKILL_COOL_TIME_DISPLAY_TIME', value: (1n << 53n) + 1n },
      ],
    }),
  ).toEqual({
    kind: 'skill-cooldown',
    num: Math.fround(16_777_217),
    deckUnderAdd: Math.fround(2_147_483_648),
    deckOverAdd: -1,
    deckUnderLimit: -2_147_483_648,
    deckOverLimit: 3,
    deckCardMax: 30,
    duration: { kind: 'sections', value: (1n << 53n) + 1n },
  });
});

it('ActionType40の既定期限はミリ秒0で、FullEndをステージ期限へ変換する', () => {
  expect(
    createSkillCooldownEffect({ skillEffectId: 40n, deckCardMax: null, details: [] }),
  ).toMatchObject({
    duration: { kind: 'milliseconds', value: 0 },
  });
  expect(
    createSkillCooldownEffect({
      skillEffectId: 40n,
      deckCardMax: null,
      details: [{ id: 1n, detailType: 'SKILL_COOL_TIME_DISPLAY_TIME_TYPE', value: 3n }],
    }),
  ).toMatchObject({ duration: { kind: 'stage', value: 0 } });
});

it('ActionType40のlongをfloat32へ直接変換する', () => {
  const longValue = (1n << 54n) + (1n << 30n) + 1n;
  expect(
    createSkillCooldownEffect({
      skillEffectId: 40n,
      deckCardMax: 30,
      details: [
        { id: 1n, detailType: 'SKILL_COOL_TIME_NUM', value: longValue },
        { id: 2n, detailType: 'SKILL_COOL_TIME_DISPLAY_TIME', value: longValue },
      ],
    }),
  ).toMatchObject({
    num: 2 ** 54 + 2 ** 31,
    duration: { kind: 'milliseconds', value: 2 ** 54 + 2 ** 31 },
  });
});
