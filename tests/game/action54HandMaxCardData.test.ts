import { expect, it } from 'vite-plus/test';
import { createHandMaxCardEffect } from '../../src/game/actionTypeEffects/handMaxCard.ts';

it('ActionType54はlongの表示期限と呼出し解除情報を保持する', () => {
  expect(
    createHandMaxCardEffect({
      skillEffectId: 54n,
      invocationType: 0x388,
      deactivationKey: 'hand-max',
      details: [
        {
          id: 1n,
          detailType: 'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE',
          value: 2n,
        },
        {
          id: 2n,
          detailType: 'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME',
          value: (1n << 53n) + 4n,
        },
      ],
    }),
  ).toEqual({
    kind: 'hand-max-card',
    duration: { kind: 'sections', value: (1n << 53n) + 4n },
    invocationType: 0x388,
    deactivationKey: 'hand-max',
  });
});

it('ActionType54は省略期限を参照実装のFullEnd既定値にする', () => {
  expect(createHandMaxCardEffect({ skillEffectId: 54n, details: [] })).toEqual({
    kind: 'hand-max-card',
    duration: { kind: 'stage' },
  });
});
