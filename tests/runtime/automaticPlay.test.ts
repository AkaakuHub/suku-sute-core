import { expect, test } from 'vite-plus/test';
import {
  advanceLiveAutomaticHeart,
  advanceLiveWaitMode,
  changeLiveAutomaticPlaySetting,
  hasLiveTopPrioritySkillCandidate,
  isLiveAutomaticHeartCount,
  isLiveAutoSkillIntervalReached,
  projectLiveAutomaticPlayClock,
  type LiveAutomaticPlaySettings,
  liveAutomaticPlayDefaultSettings,
  selectLiveTopPrioritySkill,
  shouldLiveWaitForSkill,
} from '../../src/runtime/live/automaticPlay.ts';

const settings: LiveAutomaticPlaySettings = {
  ...liveAutomaticPlayDefaultSettings,
  isSkillAuto: false,
  isHeartAuto: false,
};

test('skill自動とwait modeは相互排他でHeart自動には影響しない', () => {
  const heartEnabled = changeLiveAutomaticPlaySetting(settings, 'isHeartAuto', true);
  const waitEnabled = changeLiveAutomaticPlaySetting(
    { ...heartEnabled, isSkillAuto: true },
    'isWaitMode',
    true,
  );
  const skillEnabled = changeLiveAutomaticPlaySetting(waitEnabled, 'isSkillAuto', true);

  expect(waitEnabled).toEqual({
    isSkillAuto: false,
    isHeartAuto: true,
    heartAutoCount: 100,
    isWaitMode: true,
  });
  expect(skillEnabled).toEqual({
    isSkillAuto: true,
    isHeartAuto: true,
    heartAutoCount: 100,
    isWaitMode: false,
  });
});

test('自動操作の初期値はSaveDataStorage constructorと一致する', () => {
  expect(liveAutomaticPlayDefaultSettings).toEqual({
    isSkillAuto: true,
    isHeartAuto: true,
    heartAutoCount: 100,
    isWaitMode: false,
  });
});

test('Heart自動回収個数は公式設定popupの50から100までの10刻みだけを受理する', () => {
  expect([50, 60, 70, 80, 90, 100].every(isLiveAutomaticHeartCount)).toBe(true);
  expect([0, 49, 55, 101].some(isLiveAutomaticHeartCount)).toBe(false);
});

test('Heart自動は設定個数へ到達した状態が0.3秒続いたときだけ回収する', () => {
  const belowThreshold = advanceLiveAutomaticHeart(
    { timerSeconds: 0.2 },
    {
      enabled: true,
      heartCount: 49,
      heartAutoCount: 50,
      deltaTimeSeconds: 0.1,
    },
  );
  const beforeDelay = advanceLiveAutomaticHeart(belowThreshold.state, {
    enabled: true,
    heartCount: 50,
    heartAutoCount: 50,
    deltaTimeSeconds: 0.29,
  });
  const collected = advanceLiveAutomaticHeart(beforeDelay.state, {
    enabled: true,
    heartCount: 50,
    heartAutoCount: 50,
    deltaTimeSeconds: 0.01,
  });

  expect(belowThreshold).toEqual({
    state: { timerSeconds: 0 },
    shouldCollect: false,
  });
  expect(beforeDelay.shouldCollect).toBe(false);
  expect(collected).toEqual({
    state: { timerSeconds: 0 },
    shouldCollect: true,
  });
});

test('skill自動は非reshuffle手札の最低APをlist順で選ぶ', () => {
  const skills = [
    {
      cardDatasId: 1001,
      skillCostValue: 5,
      isReshuffleSkill: false,
      isSkillCostOver: false,
    },
    {
      cardDatasId: 1002,
      skillCostValue: 1,
      isReshuffleSkill: true,
      isSkillCostOver: false,
    },
    {
      cardDatasId: 1003,
      skillCostValue: 2,
      isReshuffleSkill: false,
      isSkillCostOver: false,
    },
    {
      cardDatasId: 1004,
      skillCostValue: 2,
      isReshuffleSkill: false,
      isSkillCostOver: false,
    },
  ] as const;

  expect(isLiveAutoSkillIntervalReached(1.49, 1)).toBe(false);
  expect(isLiveAutoSkillIntervalReached(1.5, 1)).toBe(true);
  expect(hasLiveTopPrioritySkillCandidate(skills)).toBe(true);
  expect(
    selectLiveTopPrioritySkill(skills, {
      currentSkillPoint: 10,
      skillMaxValue: 10,
    }),
  ).toBe(skills[2]);
  expect(hasLiveTopPrioritySkillCandidate([{ ...skills[1] }])).toBe(false);
  expect(() =>
    selectLiveTopPrioritySkill([{ ...skills[1] }], {
      currentSkillPoint: 10,
      skillMaxValue: 10,
    }),
  ).toThrow('Live automatic skill candidate is empty');
});

test('skill自動はコスト超過中でもゲージ満タン以外なら候補を維持する', () => {
  const skills = [
    {
      cardDatasId: 1001,
      skillCostValue: 5,
      isReshuffleSkill: false,
      isSkillCostOver: true,
    },
    {
      cardDatasId: 1002,
      skillCostValue: 2,
      isReshuffleSkill: true,
      isSkillCostOver: false,
    },
  ] as const;

  expect(
    selectLiveTopPrioritySkill(skills, {
      currentSkillPoint: 1,
      skillMaxValue: 2,
    }),
  ).toBe(skills[0]);
});

test('skill自動はコスト超過中にゲージ満タンなら全手札の最低APへ切り替える', () => {
  const skills = [
    {
      cardDatasId: 1001,
      skillCostValue: 5,
      isReshuffleSkill: false,
      isSkillCostOver: true,
    },
    {
      cardDatasId: 1002,
      skillCostValue: 2,
      isReshuffleSkill: true,
      isSkillCostOver: true,
    },
    {
      cardDatasId: 1003,
      skillCostValue: 5,
      isReshuffleSkill: false,
      isSkillCostOver: true,
    },
  ] as const;

  expect(
    selectLiveTopPrioritySkill(skills, {
      currentSkillPoint: 2,
      skillMaxValue: 2,
    }),
  ).toBe(skills[1]);
});

test('wait modeは使用可能なskillがある場合だけ待機する', () => {
  expect(shouldLiveWaitForSkill({ ...settings, isWaitMode: true }, true)).toBe(true);
  expect(shouldLiveWaitForSkill({ ...settings, isWaitMode: true }, false)).toBe(false);
  expect(shouldLiveWaitForSkill(settings, true)).toBe(false);
});

test('WAITING中はStage clockを固定し解除後にAudio clockへ復帰する', () => {
  expect(projectLiveAutomaticPlayClock(12.5, 12.6, true)).toBe(12.5);
  expect(projectLiveAutomaticPlayClock(12.5, 12.6, false)).toBe(12.6);
});

test('WaitModeの有効化はForceReservedから使用可能skillを評価する', () => {
  const forceReserved = advanceLiveWaitMode(
    { kind: 'disabled', remainingCoolTimeSeconds: 0 },
    { enabled: true, hasAvailableSkill: true, deltaTimeSeconds: 0 },
  );
  const waiting = advanceLiveWaitMode(forceReserved, {
    enabled: true,
    hasAvailableSkill: true,
    deltaTimeSeconds: 0,
  });
  const initial = advanceLiveWaitMode(
    { kind: 'disabled', remainingCoolTimeSeconds: 0 },
    { enabled: true, hasAvailableSkill: false, deltaTimeSeconds: 0 },
  );
  const initialAfterEvaluation = advanceLiveWaitMode(initial, {
    enabled: true,
    hasAvailableSkill: false,
    deltaTimeSeconds: 0,
  });
  expect(forceReserved.kind).toBe('force-reserved');
  expect(waiting.kind).toBe('waiting');
  expect(initialAfterEvaluation.kind).toBe('initial');
});
