import { expect, it } from 'vite-plus/test';
import { createTokenBoostEffect } from '../../src/game/actionTypeEffects/tokenBoost.ts';

it('ActionType38は詳細long値、対象、期限、回数をEffectへ変換する', () => {
  const effect = createTokenBoostEffect({
    skillEffectId: 38n,
    invocationType: 0x388,
    deactivationKey: 'token-boost',
    details: [
      { id: 1n, detailType: 'BOOST_TOKEN_CARD_CALC_TYPE', value: 1n },
      { id: 2n, detailType: 'BOOST_TOKEN_CARD_NUM', value: 16_777_217n },
      { id: 3n, detailType: 'BOOST_TOKEN_CARD_DISPLAY_TIME_TYPE', value: 2n },
      { id: 4n, detailType: 'BOOST_TOKEN_CARD_DISPLAY_TIME', value: 3n },
      { id: 5n, detailType: 'BOOST_TOKEN_CARD_DISABLED_TYPE', value: 1n },
      { id: 6n, detailType: 'BOOST_TOKEN_CARD_DISABLED', value: 2_147_483_648n },
      { id: 7n, detailType: 'BOOST_TOKEN_CARD_TARGET_TYPE', value: 1n },
      { id: 8n, detailType: 'BOOST_TOKEN_CARD_TARGET_ID', value: 1021n },
      {
        id: 9n,
        detailType: 'BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID',
        value: 0n,
        paramValues: [9_007_199_254_740_993n],
      },
    ],
  });

  expect(effect).toEqual({
    kind: 'token-boost',
    calculation: 'multiply-percent',
    num: 16_777_217n,
    target: { kind: 'member', member: 1021 },
    seriesIds: [9_007_199_254_740_993n],
    uses: 2_147_483_648n,
    duration: { kind: 'sections', value: 3n },
    invocationType: 0x388,
    deactivationKey: 'token-boost',
  });
});

it('ActionType38は設定がない任意詳細に既定値を使う', () => {
  expect(createTokenBoostEffect({ skillEffectId: 38n, details: [] })).toEqual({
    kind: 'token-boost',
    calculation: 'add',
    num: 0n,
    target: { kind: 'all' },
    duration: { kind: 'milliseconds', value: 0n },
  });
});
