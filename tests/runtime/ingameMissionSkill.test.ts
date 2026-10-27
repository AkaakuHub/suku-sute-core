import { describe, expect, test } from 'vite-plus/test';
import {
  activateLiveIngameMission,
  advanceLiveIngameMission,
  createLiveIngameMissionState,
  notifyLiveIngameMission,
  type LiveIngameMissionRecord,
} from '../../src/runtime/skills/ingameMissionSkill.ts';

const records: readonly LiveIngameMissionRecord[] = [
  {
    id: '1',
    groupId: '104251200100',
    rare: false,
    missionType: 1,
    param1: '100',
    param2: '0',
    addParam: '1400000',
    baseScore: '40000000',
    addScore: '480000000000',
    probability: 9600,
    missionText: 'ハートを$TargetValue$個回収する',
  },
  {
    id: '2',
    groupId: '104251200100',
    rare: true,
    missionType: 2,
    param1: '5',
    param2: '25',
    addParam: '15000',
    baseScore: '50000000',
    addScore: '600000000000',
    probability: 400,
    missionText: 'ハート上限を$TargetValue$回増加させる',
  },
  {
    id: '3',
    groupId: '104290100100',
    rare: false,
    missionType: 4,
    param1: '1',
    param2: '0',
    addParam: '0',
    baseScore: '10000000',
    addScore: '0',
    probability: 10_000,
    missionText: 'メンタルダウンする',
  },
];

const effect = {
  id: '44',
  actionType: 44,
  orderId: 1,
  details: [
    {
      id: '4401',
      detailType: 'INGAME_MISSION_SKILL_GROUP_ID',
      targetMood: 0,
      effectValue: 104251200100,
      params: [],
    },
  ],
} as const;

describe('IngameMissionSkill', () => {
  test('直前以外を重み付き選択し、ClearCountに応じた目標を設定する', () => {
    let state = activateLiveIngameMission(
      createLiveIngameMissionState(records, 100),
      effect,
      () => 9_999,
    );
    expect(state.currentMission?.id).toBe('2');
    expect(state.currentTarget).toBe(7n);

    state = notifyLiveIngameMission(state, {
      kind: 'skill-effect',
      actionType: 25,
      effectAmount: 100,
    }).state;
    expect(state.currentCount).toBe(1n);
    state = notifyLiveIngameMission(state, {
      kind: 'skill-effect',
      actionType: 25,
      effectAmount: 100,
    }).state;
    expect(state.currentCount).toBe(2n);
  });

  test('達成時はClearCount加算後の二乗式でscoreを加え、1秒後に次を選ぶ', () => {
    let state = activateLiveIngameMission(
      createLiveIngameMissionState(records, 100),
      effect,
      () => 0,
    );
    const cleared = notifyLiveIngameMission(state, {
      kind: 'heart-count',
      count: 240,
    });
    expect(cleared.state.clearCount).toBe(1);
    expect(cleared.state.cooldownSeconds).toBe(1);
    expect(cleared.addedScore).toBe(880_000n);

    state = advanceLiveIngameMission(cleared.state, 1, () => 0);
    expect(state.currentMission?.id).toBe('2');
    expect(state.currentTarget).toBe(8n);
    expect(state.currentCount).toBe(0n);
  });

  test('再発動時も全masterから別groupを選び、進行中cooldownを維持する', () => {
    const first = activateLiveIngameMission(
      createLiveIngameMissionState(records, 100),
      effect,
      () => 0,
    );
    const cooling = notifyLiveIngameMission(first, {
      kind: 'heart-count',
      count: 240,
    }).state;
    const switched = activateLiveIngameMission(
      cooling,
      {
        ...effect,
        details: [{ ...effect.details[0], effectValue: 104290100100 }],
      },
      () => 0,
    );

    expect(switched.currentMission?.id).toBe('3');
    expect(switched.cooldownSeconds).toBe(1);
    expect(switched.records).toHaveLength(3);
    expect(switched.activeRecords).toHaveLength(1);
  });
});
