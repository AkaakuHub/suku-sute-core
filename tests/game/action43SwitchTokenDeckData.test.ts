import { expect, it } from 'vite-plus/test';
import { createSwitchTokenDeckEffect } from '../../src/game/actionTypeEffects/switchTokenDeck.ts';

it('ActionType43はlongの系列IDと期限を保持し、seriesをint32化する', () => {
  expect(
    createSwitchTokenDeckEffect({
      skillEffectId: 43n,
      invocationType: 0x388,
      deactivationKey: 'split',
      details: [
        {
          id: 1n,
          detailType: 'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
          value: 7n,
          paramValues: [4_294_967_338n],
        },
        { id: 2n, detailType: 'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME_TYPE', value: 2n },
        { id: 3n, detailType: 'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME', value: (1n << 53n) + 3n },
      ],
    }),
  ).toEqual({
    kind: 'token-deck-split',
    seriesIds: [4_294_967_338n],
    duration: { kind: 'sections', value: (1n << 53n) + 3n },
    invocationType: 0x388,
    deactivationKey: 'split',
  });
});

it('ActionType43は系列指定なしを全系列として表し、期限の既定値を使う', () => {
  expect(createSwitchTokenDeckEffect({ skillEffectId: 43n, details: [] })).toMatchObject({
    seriesIds: null,
    duration: { kind: 'milliseconds', value: 0 },
  });
});

it('ActionType43は空のseries paramsを全系列指定に変換しない', () => {
  expect(
    createSwitchTokenDeckEffect({
      skillEffectId: 43n,
      details: [
        {
          id: 1n,
          detailType: 'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
          value: 7n,
          paramValues: [],
        },
      ],
    }),
  ).toMatchObject({ seriesIds: [] });
});

it('ActionType43のミリ秒longをfloat32へ直接変換する', () => {
  const longValue = (1n << 54n) + (1n << 30n) + 1n;
  expect(
    createSwitchTokenDeckEffect({
      skillEffectId: 43n,
      details: [{ id: 1n, detailType: 'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME', value: longValue }],
    }),
  ).toMatchObject({ duration: { kind: 'milliseconds', value: 2 ** 54 + 2 ** 31 } });
});
