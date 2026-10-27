import { expect, it } from 'vite-plus/test';
import { createResetSpecialEffect } from '../../src/game/actionTypeEffects/resetSpecial.ts';

it('ActionType55は効果・対象のlong詳細値をint32化する', () => {
  expect(
    createResetSpecialEffect({
      skillEffectId: 55n,
      details: [
        { id: 1n, detailType: 'RESET_SPECIAL_APPEAL_COUNT_EFFECT_TYPE', value: 4_294_967_298n },
        { id: 2n, detailType: 'RESET_SPECIAL_APPEAL_COUNT_TARGET_TYPE', value: 2n },
        { id: 3n, detailType: 'RESET_SPECIAL_APPEAL_COUNT_TARGET_ID', value: 1030n },
      ],
    }),
  ).toEqual({
    kind: 'reset-special',
    scope: 'extra',
    target: { kind: 'member', member: 1030 },
  });
});

it('ActionType55は既定で通常必殺技を全対象でリセットする', () => {
  expect(createResetSpecialEffect({ skillEffectId: 55n, details: [] })).toEqual({
    kind: 'reset-special',
    scope: 'normal',
    target: { kind: 'all' },
  });
});
