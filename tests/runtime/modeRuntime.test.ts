import { expect, test } from 'vite-plus/test';
import {
  activateLiveModeChangeInduce,
  changeLiveMode,
  createLiveModeChangeInduceState,
  createLiveModeState,
  notifyLiveModeChanged,
  requireLiveModeSkillChange,
} from '../../src/runtime/skills/modeRuntime.ts';
import type { LiveSkillEffect } from '../../src/runtime/skills/skillTypes.ts';

test('Off、On、Alternateは実際に状態が変わった場合だけmode変更を通知する', () => {
  let modes = createLiveModeState([changeMode(2), modeSkillChange]);
  let changed = changeLiveMode(modes, changeMode(2));
  expect(changed.changedModeId).toBe(1);
  expect(changed.state.get(1)).toBe(true);
  modes = changed.state;
  changed = changeLiveMode(modes, changeMode(2));
  expect(changed.changedModeId).toBeNull();
  changed = changeLiveMode(modes, changeMode(3));
  expect(changed.state.get(1)).toBe(false);
  changed = changeLiveMode(changed.state, changeMode(1));
  expect(changed.changedModeId).toBeNull();
});

test('Mode Skill ChangeはOFF系列とON系列を保存detailどおり解決する', () => {
  expect(requireLiveModeSkillChange(modeSkillChange)).toEqual({
    modeId: 1,
    offSkillSeriesId: 21235190,
    onSkillSeriesId: 22235190,
  });
});

test('対象modeがONへ変わった回数の倍数で埋め込み効果を発火する', () => {
  const induce = modeChangeInduce();
  let state = activateLiveModeChangeInduce(
    createLiveModeChangeInduceState(),
    induce,
    [induce, heartEffect, buffEffect],
    1001,
  );
  const modes = new Map([[1, true]]);
  let notified = notifyLiveModeChanged(state, modes, 1);
  expect(notified.applications.map(({ effect, power }) => [effect.id, power.effectPower])).toEqual([
    ['10001', 1],
  ]);
  state = notified.state;
  notified = notifyLiveModeChanged(state, modes, 1);
  expect(notified.applications.map(({ effect, power }) => [effect.id, power.effectPower])).toEqual([
    ['10001', 2],
  ]);
  state = notified.state;
  notified = notifyLiveModeChanged(state, modes, 1);
  expect(notified.applications.map(({ effect, power }) => [effect.id, power.effectPower])).toEqual([
    ['10001', 3],
    ['18001', 1],
  ]);
  expect(notifyLiveModeChanged(notified.state, new Map([[1, false]]), 1).applications).toEqual([]);
});

const modeSkillChange: LiveSkillEffect = {
  id: '36001',
  actionType: 36,
  orderId: 1,
  details: [
    detail('1', 'MODE_SKILL_CHANGE_MODE_ID', 1),
    detail('2', 'MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_1', 21235190),
    detail('3', 'MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_2', 22235190),
  ],
};

const heartEffect: LiveSkillEffect = {
  id: '10001',
  actionType: 1,
  orderId: 2,
  details: [],
};

const buffEffect: LiveSkillEffect = {
  id: '18001',
  actionType: 18,
  orderId: 3,
  details: [],
};

function changeMode(changeType: number): LiveSkillEffect {
  return {
    id: `35${String(changeType)}`,
    actionType: 35,
    orderId: 1,
    details: [detail('1', 'CHANGE_MODE_TYPE', changeType), detail('2', 'CHANGE_MODE_ID', 1)],
  };
}

function modeChangeInduce(): LiveSkillEffect {
  return {
    id: '45001',
    actionType: 45,
    orderId: 1,
    details: [
      detail('1', 'MODE_CHANGE_INDUCE_TARGET_MODE_ID', 1),
      {
        ...detail('2', 'MODE_CHANGE_INDUCE_COUNT_PARAMS_ID', 101),
        params: [
          {
            paramType: 'MODE_CHANGE_INDUCE_COUNT_PARAMS_ID',
            paramValue: '1,3',
          },
        ],
      },
      {
        ...detail('3', 'MODE_CHANGE_INDUCE_EFFECT_PARAMS_ID', 102),
        params: [
          {
            paramType: 'MODE_CHANGE_INDUCE_EFFECT_PARAMS_ID',
            paramValue: '10001,18001',
          },
        ],
      },
      detail('4', 'MODE_CHANGE_INDUCE_BUFF_NUM', 10_000),
    ],
  };
}

function detail(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
