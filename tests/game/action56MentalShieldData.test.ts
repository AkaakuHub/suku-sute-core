import { expect, it } from 'vite-plus/test';
import { createMentalShieldEffect } from '../../src/game/actionTypeEffects/mentalShield.ts';

it('ActionType56は耐久値、Mood補正、適用回数、期限のlongを保持する', () => {
  expect(
    createMentalShieldEffect({
      skillEffectId: 56n,
      details: [
        { id: 1n, detailType: 'MENTAL_SHIELD_DURABILITY_TYPE', targetMood: 0, value: 2n },
        { id: 2n, detailType: 'MENTAL_SHIELD_DURABILITY', targetMood: 0, value: (1n << 53n) + 1n },
        { id: 3n, detailType: 'MENTAL_SHIELD_DURABILITY_MOOD_MODIFYER', targetMood: 2, value: 20n },
        { id: 4n, detailType: 'MENTAL_SHIELD_DISPLAY_TIME_TYPE', targetMood: 0, value: 3n },
        { id: 5n, detailType: 'MENTAL_SHIELD_DISPLAY_TIME', targetMood: 0, value: 50n },
        { id: 6n, detailType: 'MENTAL_SHIELD_APPLY_COUNT', targetMood: 0, value: (1n << 53n) + 3n },
      ],
    }),
  ).toEqual({
    kind: 'mental-shield',
    durabilityType: 2n,
    durability: (1n << 53n) + 1n,
    moodBonus: { target: 2, perPoint: 0, perPointLong: 20n },
    duration: { kind: 'stage' },
    applyCount: (1n << 53n) + 3n,
  });
});

it('ActionType56は既定値を適用する', () => {
  expect(createMentalShieldEffect({ skillEffectId: 56n, details: [] })).toEqual({
    kind: 'mental-shield',
    durabilityType: 1n,
    durability: 0n,
    duration: { kind: 'milliseconds', value: 0n },
    applyCount: 0n,
  });
});
