import { describe, expect, test } from 'vite-plus/test';
import {
  activateLiveInduceSkillEffect,
  advanceLiveInduceSkillEffectState,
  createLiveInduceSkillEffectState,
  notifyLiveInduceSkillEffect,
} from '../../src/runtime/skills/induceSkillEffect.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('InduceSkillEffect', () => {
  test('不足card数に応じてVoltage誘発powerを減衰させる', () => {
    const state = activateLiveInduceSkillEffect(
      createLiveInduceSkillEffectState(),
      root(1, 120, -900, 0, 10, 10, 3, 0),
      [effect(1), effect(10), root(1, 120, -900, 0, 10, 10, 3, 0)],
      {
        currentTimeSeconds: 0,
        power: { addValue: 2, multiplyFactor: 3, effectPower: 4 },
        parentControlsLifetime: false,
        sourceCardInstanceId: 100,
      },
    );
    const applications = notifyLiveInduceSkillEffect(state, {
      condition: 'voltage-point',
      value: 50,
      allDeckCardCount: 8,
      deckCardMax: 10,
    });

    expect(applications).toHaveLength(2);
    expect(applications[0]?.power).toEqual({
      addValue: 2,
      multiplyFactor: 3,
      effectPower: Math.fround(
        Math.fround(Math.fround(120 * 50) / 10_000) *
          Math.fround(1 + Math.fround(Math.fround(-900 / 10_000) * 2)),
      ),
    });
    expect(applications[1]?.power.effectPower).toBe(1);
  });

  test('異なる条件と負値は発動せずsection寿命後に解除する', () => {
    const rootEffect = root(2, 100, 0, 0, 10, 10, 2, 1);
    const state = activateLiveInduceSkillEffect(
      [],
      rootEffect,
      [rootEffect, effect(1), effect(10)],
      {
        currentTimeSeconds: 0,
        power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
        parentControlsLifetime: false,
        sourceCardInstanceId: 100,
      },
    );
    expect(
      notifyLiveInduceSkillEffect(state, {
        condition: 'voltage-point',
        value: 10,
        allDeckCardCount: 10,
        deckCardMax: 10,
      }),
    ).toEqual([]);
    expect(
      notifyLiveInduceSkillEffect(state, {
        condition: 'mental-recover',
        value: -1,
        allDeckCardCount: 10,
        deckCardMax: 10,
      }),
    ).toEqual([]);
    expect(
      advanceLiveInduceSkillEffectState(state, {
        currentTimeSeconds: 0,
        sectionChangeCount: 1,
        musicEnded: false,
      }),
    ).toEqual([]);
  });
});

function root(
  conditionType: number,
  num: number,
  underAdd: number,
  overAdd: number,
  underLimit: number,
  overLimit: number,
  displayTimeType: number,
  displayTime: number,
): LiveSkillEffect {
  return {
    id: '41001',
    actionType: 41,
    orderId: 1,
    details: [
      detail('1', 'INDUCE_SKILL_EFFECT_CONDITION_TYPE', conditionType),
      {
        ...detail('2', 'INDUCE_SKILL_EFFECT_PARAMS_ID', 50001),
        params: [
          {
            paramType: 'INDUCE_SKILL_EFFECT_PARAMS_ID',
            paramValue: '10001,10010',
          },
        ],
      },
      detail('3', 'INDUCE_SKILL_EFFECT_NUM', num),
      detail('4', 'INDUCE_SKILL_EFFECT_DECK_UNDER_ADD', underAdd),
      detail('5', 'INDUCE_SKILL_EFFECT_DECK_OVER_ADD', overAdd),
      detail('6', 'INDUCE_SKILL_EFFECT_DECK_UNDER_LIMIT', underLimit),
      detail('7', 'INDUCE_SKILL_EFFECT_DECK_OVER_LIMIT', overLimit),
      detail('8', 'INDUCE_SKILL_EFFECT_DISPLAY_TIME_TYPE', displayTimeType),
      detail('9', 'INDUCE_SKILL_EFFECT_DISPLAY_TIME', displayTime),
    ],
  };
}

function effect(actionType: number): LiveSkillEffect {
  return {
    id: actionType === 1 ? '10001' : '10010',
    actionType,
    orderId: 2,
    details: [],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
