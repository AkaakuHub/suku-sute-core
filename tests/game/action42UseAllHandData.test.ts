import { expect, it } from 'vite-plus/test';
import { createUseAllHandEffect } from '../../src/game/actionTypeEffects/useAllHand.ts';

it('ActionType42は追加APのlongをint32へ変換する', () => {
  expect(
    createUseAllHandEffect({
      skillEffectId: 42n,
      details: [{ id: 1n, detailType: 'USE_ALL_HAND_SKILL_ADD_AP', value: 2_147_483_648n }],
    }),
  ).toEqual({ kind: 'use-hand', addAp: -2_147_483_648 });
});

it('ActionType42は省略された追加APを0にする', () => {
  expect(createUseAllHandEffect({ skillEffectId: 42n, details: [] })).toEqual({
    kind: 'use-hand',
    addAp: 0,
  });
});
