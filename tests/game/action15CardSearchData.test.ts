import { expect, test } from 'vite-plus/test';
import { createCardSearchEffect } from '../../src/game/actionTypeEffects/cardSearch.ts';

test('Action15の検索種別1はアイコンではなくMainEffectを指定する', () => {
  expect(
    createCardSearchEffect({
      skillEffectId: 15n,
      details: [
        { id: 1n, detailType: 'CARD_SEARCH_TYPE', value: 1n },
        { id: 2n, detailType: 'CARD_SEARCH_ID', value: 12n },
      ],
    }),
  ).toMatchObject({ target: { kind: 'main-effect', actionType: 12 } });
});
