import { expect, it } from 'vite-plus/test';
import { createHeartLimitBoostEffect } from '../../src/game/actionTypeEffects/heartLimitBoost.ts';

it('ActionType49はtarget・long詳細・使用回数・series IDをEffectへ変換する', () => {
  expect(
    createHeartLimitBoostEffect({
      skillEffectId: 49n,
      deactivationKey: 'heart-limit',
      details: [
        { id: 1n, detailType: 'CHANGE_HEART_LIMIT_BOOST_CALC_TYPE', targetMood: 0, value: 1n },
        {
          id: 2n,
          detailType: 'CHANGE_HEART_LIMIT_BOOST_PARAM',
          targetMood: 0,
          value: (1n << 53n) + 1n,
        },
        {
          id: 3n,
          detailType: 'CHANGE_HEART_LIMIT_BOOST_NUM_BONUS_MOOD',
          targetMood: 3,
          value: 12n,
        },
        {
          id: 4n,
          detailType: 'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_TYPE',
          targetMood: 0,
          value: 0n,
        },
        { id: 5n, detailType: 'CHANGE_HEART_LIMIT_BOOST_DISABLED_TYPE', targetMood: 0, value: 1n },
        {
          id: 6n,
          detailType: 'CHANGE_HEART_LIMIT_BOOST_DISABLED_PARAM',
          targetMood: 0,
          value: (1n << 53n) + 4n,
        },
        { id: 7n, detailType: 'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE', targetMood: 0, value: 2n },
        { id: 8n, detailType: 'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE_ID', targetMood: 0, value: 3n },
        {
          id: 9n,
          detailType: 'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID',
          targetMood: 0,
          value: 0n,
          paramValues: [(1n << 53n) + 9n],
        },
      ],
    }),
  ).toEqual({
    kind: 'heart-limit-boost',
    calculationType: 1,
    num: (1n << 53n) + 1n,
    bonusMoodTarget: 3,
    bonusMoodValue: 12n,
    duration: { kind: 'none', value: 0n },
    disabledType: 1,
    disabledCount: (1n << 53n) + 4n,
    target: { kind: 'unit', unit: 3 },
    tokenCardSeriesIds: [(1n << 53n) + 9n],
    deactivationKey: 'heart-limit',
  });
});

it('ActionType49は未指定時に参照実装既定値と全体対象を使う', () => {
  expect(createHeartLimitBoostEffect({ skillEffectId: 49n, details: [] })).toEqual({
    kind: 'heart-limit-boost',
    calculationType: 2,
    num: 0n,
    bonusMoodTarget: 0,
    bonusMoodValue: 0n,
    duration: { kind: 'milliseconds', value: 0n },
    disabledType: 0,
    disabledCount: 0n,
    target: { kind: 'all' },
  });
});
