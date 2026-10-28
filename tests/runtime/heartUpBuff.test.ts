import { expect, test } from 'vite-plus/test';
import {
  activateLiveHeartUpBuff,
  applyLiveHeartUpBuffs,
  createLiveHeartUpBuffState,
} from '../../src/runtime/skills/heartUpBuff.ts';

const card = {
  charactersId: 1021,
  unitIds: [103],
  tokenCardSeriesIds: [],
  skillTokenCardSeriesIds: [],
};

test('Heart Upはruntime順で補正してAdd Heartの共通additional buffへ登録する', () => {
  const state = activateLiveHeartUpBuff(createLiveHeartUpBuffState(), effect(), {
    currentTimeSeconds: 10,
    currentMoodValue: 2,
    power: { addValue: 0.8, multiplyFactor: 2, effectPower: 9 },
    applySkillBoost: (value) => value * 1.5,
  });
  expect(state.effects).toEqual([
    {
      effectId: '16',
      calculation: { kind: 'percent', value: 33 },
      target: { kind: 'all' },
      skillTokenCardSeriesIds: [],
      remainingUses: 2,
      duration: { kind: 'milliseconds', remainingSeconds: 2.5 },
    },
  ]);

  const first = applyLiveHeartUpBuffs(state, card, 4);
  expect(first.value).toBeCloseTo(5.32);
  expect(first.state.effects[0]?.remainingUses).toBe(1);
  const second = applyLiveHeartUpBuffs(first.state, card, 4);
  expect(second.state.effects).toEqual([]);
});

function effect() {
  return {
    id: '16',
    actionType: 16,
    orderId: 1,
    details: [
      value('1', 'HEART_UP_CALC_TYPE', 1),
      value('2', 'HEART_UP_NUM_BASE', 100_000),
      {
        ...value('3', 'HEART_UP_NUM_BONUS_MOOD', 1_000),
        targetMood: 1,
      },
      value('4', 'HEART_UP_DISPLAY_TIME_TYPE', 1),
      value('5', 'HEART_UP_DISPLAY_TIME', 2_500),
      value('6', 'HEART_UP_DISABLED_TYPE', 1),
      value('7', 'HEART_UP_DISABLED', 2),
      value('8', 'HEART_UP_TARGET_TYPE', 0),
      value('9', 'HEART_UP_TARGET_ID', 0),
    ],
  };
}

function value(id: string, detailType: string, effectValue: number) {
  return { id, detailType, targetMood: 0, effectValue, params: [] };
}
