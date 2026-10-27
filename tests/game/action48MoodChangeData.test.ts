import { expect, it } from 'vite-plus/test';
import { createMoodChangeEffect } from '../../src/game/actionTypeEffects/moodChange.ts';

it('ActionType48はcalcType・longの数値・期限をEffectへ変換する', () => {
  expect(
    createMoodChangeEffect({
      skillEffectId: 48n,
      invocationType: 0x38b,
      deactivationKey: 'mood',
      details: [
        { id: 1n, detailType: 'CHANGE_MOOD_VALUE_CALC_TYPE', value: 4n },
        { id: 2n, detailType: 'CHANGE_MOOD_VALUE_NUM', value: (1n << 53n) + 1n },
        { id: 3n, detailType: 'CHANGE_MOOD_VALUE_DISPLAY_TIME_TYPE', value: 3n },
        { id: 4n, detailType: 'CHANGE_MOOD_VALUE_DISPLAY_TIME', value: 100n },
      ],
    }),
  ).toEqual({
    kind: 'mood-change-skill',
    calculationType: 4,
    num: (1n << 53n) + 1n,
    duration: { kind: 'stage', value: 0n },
    invocationType: 0x38b,
    deactivationKey: 'mood',
  });
});

it('ActionType48は詳細省略時の既定値を反映する', () => {
  expect(createMoodChangeEffect({ skillEffectId: 48n, details: [] })).toEqual({
    kind: 'mood-change-skill',
    calculationType: 1,
    num: 0n,
    duration: { kind: 'milliseconds', value: 0n },
  });
});
