import { describe, expect, test } from 'vite-plus/test';
import {
  activateLiveChangeParamValueAbility,
  applyLiveParamValueBuffs,
  deactivateLiveChangeParamValueAbility,
} from '../../src/runtime/skills/changeParamValueAbility.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

describe('ChangeParamValueAbility', () => {
  test.each([
    { calcType: 1, base: 10_000, add: 2_500, params: [], expected: 1.75 },
    {
      calcType: 2,
      base: 0,
      add: 0,
      params: [param('CHANGE_PARAM_VALUE_ACTION_ID', '0,120000,240000')],
      expected: 1.0024,
    },
    {
      calcType: 3,
      base: 5_000,
      add: 1_000,
      params: [param('CHANGE_PARAM_VALUE_MULTIPLY_PARAMS_ID', '1021')],
      expected: 2.5,
    },
  ])('runtimeの計算種別$calcTypeでdetail値を補正する', (input) => {
    const state = activateLiveChangeParamValueAbility(
      [],
      10,
      changeParamEffect(input.calcType, input.base, input.add, input.params),
      {
        skillLevel: 3,
        memberFanLevels: [{ characterId: 1021, memberFanLevel: 20 }],
      },
    );
    expect(state[0]?.factor).toBeCloseTo(input.expected);
    expect(applyLiveParamValueBuffs([targetEffect()], state, 10)[0]?.details[0]?.effectValue).toBe(
      Math.ceil(101 * input.expected),
    );
  });

  test('解除時に同じsource effectの補正だけを削除する', () => {
    const active = activateLiveChangeParamValueAbility(
      [],
      10,
      changeParamEffect(1, 10_000, 0, []),
      { skillLevel: 1, memberFanLevels: [] },
    );
    expect(deactivateLiveChangeParamValueAbility(active, 10, 'ability-18')).toEqual([]);
  });
});

function changeParamEffect(
  calcType: number,
  base: number,
  add: number,
  params: LiveSkillEffect['details'][number]['params'],
): LiveSkillEffect {
  return {
    id: 'ability-18',
    actionType: 18,
    orderId: 1,
    details: [
      detail('calc', 'CHANGE_PARAM_VALUE_CALC_TYPE', calcType),
      detail('base', 'CHANGE_PARAM_VALUE_BASE_NUM', base),
      detail('add', 'CHANGE_PARAM_VALUE_ADD_NUM', add),
      {
        ...detail('params', 'CHANGE_PARAM_VALUE_MULTIPLY_PARAMS_ID', params.length === 0 ? 0 : 99),
        params,
      },
      detail('action', 'CHANGE_PARAM_VALUE_ACTION_ID', 202_141_300_101),
    ],
  };
}

function targetEffect(): LiveSkillEffect {
  return {
    id: 'target',
    actionType: 10,
    orderId: 1,
    details: [detail('202141300101', 'ADD_VOLTAGE_NUM', 101)],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}

function param(paramType: string, paramValue: string) {
  return { paramType, paramValue };
}
