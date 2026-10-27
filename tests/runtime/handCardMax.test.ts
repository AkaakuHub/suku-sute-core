import { expect, test } from 'vite-plus/test';
import {
  createLiveHandCardMaxEffect,
  resolveLiveHandCardMaxActivation,
} from '../../src/runtime/skills/handCardMax.ts';

test('保存Special AppealのActionType54はFULL_ENDで手札上限8へ差分適用する', () => {
  const effect = createLiveHandCardMaxEffect({
    id: '10335280011',
    actionType: 54,
    orderId: 2,
    details: [
      detail('CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE', 3),
      detail('CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME', 0),
    ],
  });

  expect(effect).toEqual({
    effectId: '10335280011',
    displayTimeType: 'full-end',
    displayTime: 0,
  });
  expect(resolveLiveHandCardMaxActivation(5)).toEqual({
    addCount: 3,
    targetHandCount: 8,
  });
});

test('保存masterにないActionType54の表示時間は受け入れない', () => {
  expect(() =>
    createLiveHandCardMaxEffect({
      id: 'hand-max',
      actionType: 54,
      orderId: 2,
      details: [
        detail('CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE', 2),
        detail('CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME', 0),
      ],
    }),
  ).toThrow('display time type is invalid');
});

function detail(detailType: string, effectValue: number) {
  return {
    id: `detail-${detailType}`,
    detailType,
    targetMood: 0,
    effectValue,
    params: [],
  };
}
