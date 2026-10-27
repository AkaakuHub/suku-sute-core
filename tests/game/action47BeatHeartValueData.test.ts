import { expect, it } from 'vite-plus/test';
import { createBeatHeartValueEffect } from '../../src/game/actionTypeEffects/beatHeartValue.ts';

it('ActionType47はcalcType・Mood補正・期限詳細をEffectへ変換する', () => {
  expect(
    createBeatHeartValueEffect({
      skillEffectId: 47n,
      invocationType: 0x388,
      deactivationKey: 'beat-heart',
      details: [
        { id: 1n, detailType: 'CHANGE_BEAT_HEART_VALUE_CALC_TYPE', targetMood: 0, value: 3n },
        {
          id: 2n,
          detailType: 'CHANGE_BEAT_HEART_VALUE_NUM',
          targetMood: 0,
          value: (1n << 53n) + 1n,
        },
        { id: 3n, detailType: 'CHANGE_BEAT_HEART_VALUE_BONUS_MOOD', targetMood: 2, value: 12n },
        {
          id: 4n,
          detailType: 'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME_TYPE',
          targetMood: 0,
          value: 2n,
        },
        {
          id: 5n,
          detailType: 'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME',
          targetMood: 0,
          value: 9_007_199_254_740_993n,
        },
      ],
    }),
  ).toEqual({
    kind: 'beat-heart-value-buff',
    calculation: 'fixed',
    amount: (1n << 53n) + 1n,
    moodBonus: { target: 2, perPoint: 0, perPointLong: 12n },
    duration: { kind: 'sections', value: 9_007_199_254_740_993n },
    invocationType: 0x388,
    deactivationKey: 'beat-heart',
  });
});

it('ActionType47は省略された詳細を参照実装の既定値へ変換する', () => {
  expect(createBeatHeartValueEffect({ skillEffectId: 47n, details: [] })).toEqual({
    kind: 'beat-heart-value-buff',
    calculation: 'add',
    amount: 0n,
    duration: { kind: 'milliseconds', value: 0n },
  });
});
