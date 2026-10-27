import { expect, it } from 'vite-plus/test';
import { createMentalRecoverAdditionalBuffEffect } from '../../src/game/actionTypeEffects/mentalRecoverAdditionalBuff.ts';

it('ActionType32はlong詳細値から元気回復追加バフを生成する', () => {
  const effect = createMentalRecoverAdditionalBuffEffect({
    skillEffectId: 32n,
    details: [
      { id: 1n, detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_CALC_TYPE', targetMood: 0, value: 1n },
      {
        id: 2n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_NUM',
        targetMood: 0,
        value: (1n << 53n) + 200_000n,
      },
      {
        id: 3n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_BONUS_MOOD',
        targetMood: 3,
        value: (1n << 53n) + 10_000n,
      },
      {
        id: 4n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
        targetMood: 0,
        value: 2n,
      },
      {
        id: 5n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISPLAY_TIME',
        targetMood: 0,
        value: (1n << 53n) + 1n,
      },
      {
        id: 6n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISABLED_TYPE',
        targetMood: 0,
        value: 1n,
      },
      {
        id: 7n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_DISABLED',
        targetMood: 0,
        value: (1n << 53n) + 2n,
      },
      {
        id: 8n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_TARGET_TYPE',
        targetMood: 0,
        value: 1n,
      },
      {
        id: 9n,
        detailType: 'RECOVER_MENTAL_ADDITIONAL_BUFF_TARGET_ID',
        targetMood: 0,
        value: (1n << 32n) + 1022n,
      },
    ],
  });

  expect(effect).toMatchObject({
    kind: 'recover-mental-additional-buff',
    calculation: 1n,
    num: (1n << 53n) + 200_000n,
    target: { kind: 'member', member: 1022 },
    moodBonus: { target: 3, perPoint: 900_719_902_720 },
    duration: { kind: 'sections', value: (1n << 53n) + 1n },
    disabledType: 1,
    disabledCount: (1n << 53n) + 2n,
  });
});
