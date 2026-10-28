import { expect, test } from 'vite-plus/test';
import { createLiveHandCardCountEffect } from '../../src/runtime/cards/deckSkillActions.ts';

test.each([
  {
    calculationType: 4_294_967_297,
    amount: 4_294_967_295,
    displayTimeType: 3,
    displayTime: 0,
    expected: { calculationType: 1, amount: -1, duration: { kind: 'full-end' } },
  },
  {
    calculationType: 4_294_967_298,
    amount: -4_294_967_295,
    displayTimeType: 4_294_967_298,
    displayTime: 4_294_967_297,
    expected: {
      calculationType: 2,
      amount: 1,
      duration: { kind: 'sections', remainingChanges: 4_294_967_297n },
    },
  },
  {
    calculationType: 1,
    amount: 4_294_967_296,
    displayTimeType: 4_294_967_297,
    displayTime: 16_777_217,
    expected: {
      calculationType: 1,
      amount: 0,
      duration: { kind: 'milliseconds', remainingSeconds: Math.fround(16_777_216 / 1000) },
    },
  },
])(
  'Action20の32bit詳細値と64bit期限を別々の幅で読む:$calculationType/$amount/$displayTimeType',
  (input) => {
    const effect = createLiveHandCardCountEffect({
      id: '20',
      actionType: 20,
      orderId: 1,
      details: (
        [
          ['CHANGE_HAND_CARD_COUNT_CALC_TYPE', input.calculationType],
          ['CHANGE_HAND_CARD_COUNT_NUM', input.amount],
          ['CHANGE_HAND_CARD_COUNT_DISPLAY_TIME_TYPE', input.displayTimeType],
          ['CHANGE_HAND_CARD_COUNT_DISPLAY_TIME', input.displayTime],
        ] as const
      ).map(([detailType, effectValue], index) => ({
        id: String(index),
        detailType,
        effectValue,
        targetMood: 0,
        params: [],
      })),
    });
    expect(effect).toEqual({ effectId: '20', ...input.expected });
  },
);
