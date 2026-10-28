import { expect, test } from 'vite-plus/test';
import {
  activateLiveComboInduce,
  advanceLiveComboInduceState,
  createLiveComboInduceState,
  notifyLiveComboInduceSkillActivation,
} from '../../src/runtime/skills/comboInduceSkill.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

test('全員のAPが揃った1秒後に合計AP倍率で内包効果を発動し2秒後にリセットする', () => {
  let state = activateLiveComboInduce(
    createLiveComboInduceState(),
    comboEffect(1, [1031, 1032]),
    [comboEffect(1, [1031, 1032]), embeddedEffect],
    {
      currentTimeSeconds: 10,
      power: { addValue: 2, multiplyFactor: 3, effectPower: 9 },
    },
  );
  state = notifyLiveComboInduceSkillActivation(state, {
    currentTimeSeconds: 11,
    characterId: 1031,
    consumeAp: 4,
  });
  state = notifyLiveComboInduceSkillActivation(state, {
    currentTimeSeconds: 12,
    characterId: 1032,
    consumeAp: 6,
  });
  const activated = advanceLiveComboInduceState(state, {
    currentTimeSeconds: 13,
    deltaTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(activated.applications).toEqual([
    {
      effect: embeddedEffect,
      power: {
        addValue: 2,
        multiplyFactor: 3,
        effectPower: Math.fround(1 + Math.fround(0.1)),
      },
    },
  ]);
  const reset = advanceLiveComboInduceState(activated.state, {
    currentTimeSeconds: 14,
    deltaTimeSeconds: 1,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(reset.state.active?.members.map(({ ap }) => ap)).toEqual([null, null]);
  expect(reset.state.uiEvents.at(-1)?.event).toEqual({ kind: 'reset-ap' });
});

test('runtimeのRESET・OVERWRITE・IGNOREを既設定memberへ適用する', () => {
  for (const [repeatAction, expected] of [
    [0, [9, null]],
    [1, [9, 2]],
    [2, [1, 2]],
  ] as const) {
    let state = activateLiveComboInduce(
      createLiveComboInduceState(),
      comboEffect(repeatAction, [1031, 1032, 1033]),
      [comboEffect(repeatAction, [1031, 1032, 1033]), embeddedEffect],
      {
        currentTimeSeconds: 0,
        power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
      },
    );
    for (const [characterId, consumeAp] of [
      [1031, 1] as const,
      [1032, 2] as const,
      [1031, 9] as const,
    ]) {
      state = notifyLiveComboInduceSkillActivation(state, {
        currentTimeSeconds: 0,
        characterId,
        consumeAp,
      });
    }
    expect(state.active?.members.map(({ ap }) => ap)).toEqual([...expected, null]);
  }
});

test('再生中のAP通知を予約し、2秒後にeffect表示なしで順に処理する', () => {
  let state = activateLiveComboInduce(
    createLiveComboInduceState(),
    comboEffect(1, [1031, 1032]),
    [comboEffect(1, [1031, 1032]), embeddedEffect],
    {
      currentTimeSeconds: 0,
      power: { addValue: 0, multiplyFactor: 1, effectPower: 1 },
    },
  );
  for (const [characterId, consumeAp] of [
    [1031, 1] as const,
    [1032, 2] as const,
    [1031, 7] as const,
  ]) {
    state = notifyLiveComboInduceSkillActivation(state, {
      currentTimeSeconds: 0,
      characterId,
      consumeAp,
    });
  }
  const advanced = advanceLiveComboInduceState(state, {
    currentTimeSeconds: 2,
    deltaTimeSeconds: 2,
    sectionChangeCount: 0,
    musicEnded: false,
  });
  expect(advanced.state.active?.members.map(({ ap }) => ap)).toEqual([7, null]);
  expect(advanced.state.uiEvents.at(-1)?.event).toEqual({
    kind: 'set-ap',
    characterId: 1031,
    ap: 7,
    showEffect: false,
  });
});

function comboEffect(repeatAction: number, characterIds: readonly number[]): LiveSkillEffect {
  return {
    id: '24001',
    actionType: 24,
    orderId: 1,
    details: [
      paramDetail('1', 'COMBO_INDUCE_MEMBER_PARAMS', characterIds.join(',')),
      paramDetail('2', 'COMBO_INDUCE_EFFECT_PARAMS', '10001'),
      detail('3', 'COMBO_INDUCE_AP_POWER', 100),
      detail('4', 'COMBO_INDUCE_DISPLAY_TIME_TYPE', 3),
      detail('5', 'COMBO_INDUCE_DISPLAY_TIME', 0),
      detail('6', 'COMBO_INDUCE_REPEAT_ACTION', repeatAction),
    ],
  };
}

const embeddedEffect: LiveSkillEffect = {
  id: '10001',
  actionType: 5,
  orderId: 2,
  details: [detail('7', 'ADD_VOLTAGE_NUM', 10000)],
};

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}

function paramDetail(id: string, detailType: string, paramValue: string) {
  return {
    id,
    detailType,
    targetMood: 0,
    effectValue: Number(id),
    params: [{ paramType: detailType, paramValue }],
  };
}
