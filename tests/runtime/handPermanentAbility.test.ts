import { describe, expect, test } from 'vite-plus/test';
import {
  advanceLiveHandPermanentState,
  liveEmbeddedSkillEffectIds,
} from '../../src/runtime/skills/handPermanentAbility.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('HandPermanentAbility', () => {
  test('手札進入で内包effectをactivateし、離脱でdeactivateする', () => {
    const effects = [permanentEffect(), embeddedEffect()];
    const entered = advanceLiveHandPermanentState([], [{ cardInstanceId: 10, effects }], [10]);
    expect(entered.activated.map((entry) => entry.effect.id)).toEqual(['18']);
    expect(entered.deactivated).toEqual([]);
    expect(entered.state[0]?.activeEffectId).toBeNull();

    const left = advanceLiveHandPermanentState(
      entered.state,
      [{ cardInstanceId: 10, effects }],
      [],
    );
    expect(left.activated).toEqual([]);
    expect(left.deactivated.map((entry) => entry.effect.id)).toEqual(['18']);
    expect(left.state).toEqual([]);
  });

  test('DrawSuccessInduceを手札進入対象とし、内包effectをroot dispatchから除外する', () => {
    const induce = drawSuccessInduceEffect();
    const effects = [induce, embeddedEffect(), falseEffect()];
    const entered = advanceLiveHandPermanentState([], [{ cardInstanceId: 10, effects }], [10]);

    expect(entered.activated.map((entry) => entry.effect.id)).toEqual(['901']);
    expect(liveEmbeddedSkillEffectIds(effects)).toEqual(new Set(['18', '19']));
  });
});

function permanentEffect(): LiveSkillEffect {
  return {
    id: '904',
    actionType: 904,
    orderId: 1,
    details: [
      {
        id: '9040',
        detailType: 'HAND_PERMANENT_EFFECT_ID1',
        targetMood: 0,
        effectValue: 18,
        params: [],
      },
    ],
  };
}

function embeddedEffect(): LiveSkillEffect {
  return {
    id: '18',
    actionType: 18,
    orderId: 2,
    details: [
      {
        id: '180',
        detailType: 'CHANGE_PARAM_VALUE_CALC_TYPE',
        targetMood: 0,
        effectValue: 1,
        params: [],
      },
    ],
  };
}

function falseEffect(): LiveSkillEffect {
  return { ...embeddedEffect(), id: '19' };
}

function drawSuccessInduceEffect(): LiveSkillEffect {
  return {
    id: '901',
    actionType: 901,
    orderId: 1,
    details: [
      induceDetail('9010', 'DRAW_SUCCESS_INDUCE_BRANCH_TYPE', 1),
      induceDetail('9011', 'DRAW_SUCCESS_INDUCE_BRANCH_VALUE', 0),
      induceDetail('9012', 'DRAW_SUCCESS_INDUCE_EFFECT_ID1', 18),
      induceDetail('9013', 'DRAW_SUCCESS_INDUCE_EFFECT_ID2', 19),
    ],
  };
}

function induceDetail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
