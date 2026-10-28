import { expect, test } from 'vite-plus/test';
import {
  activateLiveAdditionalHeartInduce,
  advanceLiveAdditionalHeartInduceState,
  createLiveAdditionalHeartInduceState,
  notifyLiveAdditionalHeartSkillActivation,
} from '../../src/runtime/skills/additionalHeartInduce.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

test('4種類の対象条件に一致するSkillだけがAP倍率付きHeart効果を発動する', () => {
  for (const [induceType, induceValue, card, matched] of [
    [0, 0, usedCard(), true],
    [1, 1031, usedCard(), true],
    [1, 1032, usedCard(), false],
    [2, 7, usedCard(), true],
    [3, 102, usedCard(), true],
  ] as const) {
    const induce = induceEffect(induceType, induceValue);
    const state = activateLiveAdditionalHeartInduce(
      createLiveAdditionalHeartInduceState(),
      induce,
      [induce, heartEffect],
      {
        currentTimeSeconds: 0,
        power: { addValue: 2, multiplyFactor: 3, effectPower: 9 },
        parentControlsLifetime: false,
        sourceCardInstanceId: 1001,
      },
    );
    const applications = notifyLiveAdditionalHeartSkillActivation(state, {
      ...card,
      consumeAp: 4,
    });
    expect(applications).toHaveLength(matched ? 1 : 0);
    if (matched) {
      expect(applications[0]?.power).toEqual({
        addValue: 2,
        multiplyFactor: 3,
        effectPower: Math.fround(1 + Math.fround(0.04)),
      });
    }
  }
});

test('MSEC寿命を経過するとSkill発動通知から除外する', () => {
  const induce = induceEffect(0, 0, 1, 1000);
  const state = activateLiveAdditionalHeartInduce(
    createLiveAdditionalHeartInduceState(),
    induce,
    [induce, heartEffect],
    {
      currentTimeSeconds: 2,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      parentControlsLifetime: false,
      sourceCardInstanceId: 1001,
    },
  );
  expect(
    advanceLiveAdditionalHeartInduceState(state, {
      deltaTimeSeconds: 3,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  ).toEqual([]);
});

function usedCard() {
  return { charactersId: 1031, skillMainEffect: 7, unitIds: [101, 102] };
}

function induceEffect(
  induceType: number,
  induceValue: number,
  displayTimeType = 3,
  displayTime = 0,
): LiveSkillEffect {
  return {
    id: '27001',
    actionType: 27,
    orderId: 1,
    details: [
      detail('1', 'GET_ADDITIONAL_HEART_INDUCE_TYPE', induceType),
      detail('2', 'GET_ADDITIONAL_HEART_INDUCE_VALUE', induceValue),
      detail('3', 'GET_ADDITIONAL_HEART_EFFECT_ID', 10001),
      detail('4', 'GET_ADDITIONAL_HEART_AP_POWER', 100),
      detail('5', 'GET_ADDITIONAL_HEART_DISPLAY_TIME_TYPE', displayTimeType),
      detail('6', 'GET_ADDITIONAL_HEART_DISPLAY_TIME', displayTime),
    ],
  };
}

const heartEffect: LiveSkillEffect = {
  id: '10001',
  actionType: 1,
  orderId: 2,
  details: [],
};

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
