import { expect, test } from 'vite-plus/test';
import { calculateLiveApRecoveryValue } from '../../src/runtime/live/apRecovery.ts';
import { calculateLiveRecoverApSkillValue } from '../../src/runtime/skills/recoverAp.ts';

const power = { addValue: 0, multiplyFactor: 1, effectPower: 1 };

test.each([
  [1.9, 1],
  [-1.9, -1],
  [2147483648, 2147483647],
  [Number.POSITIVE_INFINITY, -2147483648],
  [Number.NEGATIVE_INFINITY, -2147483648],
  [Number.NaN, 0],
])('AP回復量%sをAPKのint32変換で%sにする', (value, expected) => {
  expect(calculateLiveApRecoveryValue(value, power, (amount) => amount)).toBe(expected);
});

test('追加値、倍率、EffectPower、SkillBoostの順で適用してから整数へ変換する', () => {
  expect(
    calculateLiveApRecoveryValue(
      2.5,
      {
        addValue: 0.5,
        multiplyFactor: 2,
        effectPower: 1.5,
      },
      (value) => value * 2,
    ),
  ).toBe(18);
});

test('APのNumToValueでは小数を切り上げず、強化後に整数へ変換する', () => {
  const value = calculateLiveRecoverApSkillValue(
    {
      id: '14001',
      actionType: 14,
      details: [
        {
          detailType: 'RECOVER_AP_NUM_BASE',
          effectValue: 25000,
          targetMood: 0,
          params: [],
        },
        {
          detailType: 'RECOVER_AP_NUM_BONUS_MOOD',
          effectValue: 0,
          targetMood: 0,
          params: [],
        },
      ],
    },
    {
      currentMoodValue: 0,
      power: { addValue: 0.5, multiplyFactor: 2, effectPower: 1.5 },
      applySkillBoost: (amount) => amount,
    },
  );
  expect(value).toBe(9);
});
