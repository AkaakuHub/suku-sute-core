import { expect, it } from 'vite-plus/test';
import { createMoodValueBoostEffect } from '../../src/game/actionTypeEffects/moodValueBoost.ts';

it('ActionType50はint32 cast、Mood補正、対象、期限、使用回数を変換する', () => {
  expect(
    createMoodValueBoostEffect({
      skillEffectId: 50n,
      deactivationKey: 'mood-buff',
      details: [
        { id: 1n, detailType: 'CHANGE_MOOD_VALUE_BOOST_CALC_TYPE', targetMood: 0, value: 1n },
        {
          id: 2n,
          detailType: 'CHANGE_MOOD_VALUE_BOOST_PARAM',
          targetMood: 0,
          value: 2_147_483_648n,
        },
        { id: 3n, detailType: 'CHANGE_MOOD_VALUE_BOOST_NUM_BONUS_MOOD', targetMood: 1, value: 8n },
        {
          id: 4n,
          detailType: 'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_TYPE',
          targetMood: 0,
          value: 2n,
        },
        {
          id: 5n,
          detailType: 'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_PARAM',
          targetMood: 0,
          value: (1n << 53n) + 1n,
        },
        { id: 6n, detailType: 'CHANGE_MOOD_VALUE_BOOST_DISABLED_TYPE', targetMood: 0, value: 1n },
        {
          id: 7n,
          detailType: 'CHANGE_MOOD_VALUE_BOOST_DISABLED_PARAM',
          targetMood: 0,
          value: 2_147_483_648n,
        },
        { id: 8n, detailType: 'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE', targetMood: 0, value: 3n },
        { id: 9n, detailType: 'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE_ID', targetMood: 0, value: 42n },
        {
          id: 10n,
          detailType: 'CHANGE_MOOD_VALUE_BOOST_TOKEN_CARD_SERIES_ID',
          targetMood: 0,
          value: 0n,
          paramValues: [(1n << 53n) + 2n],
        },
      ],
    }),
  ).toEqual({
    kind: 'mood-value-boost',
    calculationType: 1,
    num: -2_147_483_648,
    bonusMoodTarget: 1,
    bonusMoodValue: 8n,
    duration: { kind: 'sections', value: (1n << 53n) + 1n },
    disabledType: 1,
    disabledCount: -2_147_483_648,
    target: { kind: 'card-series', seriesId: 42 },
    tokenCardSeriesIds: [(1n << 53n) + 2n],
    deactivationKey: 'mood-buff',
  });
});

it('ActionType50は省略時に参照実装の既定値を使う', () => {
  expect(createMoodValueBoostEffect({ skillEffectId: 50n, details: [] })).toEqual({
    kind: 'mood-value-boost',
    calculationType: 2,
    num: 0,
    bonusMoodTarget: 0,
    bonusMoodValue: 0n,
    duration: { kind: 'milliseconds', value: 0n },
    disabledType: 0,
    disabledCount: 0,
    target: { kind: 'all' },
  });
});
