import { expect, it } from 'vite-plus/test';
import { createMentalBarrierAdditionalBuffEffect } from '../../src/game/actionTypeEffects/mentalBarrierAdditionalBuff.ts';

it('ActionType33はlong詳細値を保持し、int32項目を折り返す', () => {
  const effect = createMentalBarrierAdditionalBuffEffect({
    skillEffectId: 33n,
    details: [
      {
        id: 1n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_CALC_TYPE',
        targetMood: 0,
        value: (1n << 32n) + 1n,
      },
      {
        id: 2n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_NUM',
        targetMood: 0,
        value: (1n << 53n) + 20_000n,
      },
      {
        id: 3n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_BONUS_MOOD',
        targetMood: 2,
        value: (1n << 53n) + 10_000n,
      },
      {
        id: 4n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
        targetMood: 0,
        value: 2n,
      },
      {
        id: 5n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISPLAY_TIME',
        targetMood: 0,
        value: (1n << 53n) + 1n,
      },
      {
        id: 6n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISABLED_TYPE',
        targetMood: 0,
        value: 1n,
      },
      {
        id: 7n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISABLED',
        targetMood: 0,
        value: (1n << 53n) + 2n,
      },
      {
        id: 8n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_TARGET_TYPE',
        targetMood: 0,
        value: 4_294_967_298n,
      },
      {
        id: 9n,
        detailType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_TARGET_ID',
        targetMood: 0,
        value: 3n,
      },
    ],
  });

  expect(effect).toMatchObject({
    kind: 'mental-barrier-additional-buff',
    calculation: 1,
    num: (1n << 53n) + 20_000n,
    target: { kind: 'unit', unit: 3 },
    moodBonus: { target: 2, perPointLong: (1n << 53n) + 10_000n },
    duration: { kind: 'sections', value: (1n << 53n) + 1n },
    disabledType: 1,
    disabledCount: (1n << 53n) + 2n,
  });
});
