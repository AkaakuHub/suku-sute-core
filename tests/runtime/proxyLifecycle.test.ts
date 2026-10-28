import { expect, test } from 'vite-plus/test';
import { createLiveProxyAbsorbInfo } from '../../src/runtime/skills/proxyAbsorption.ts';
import {
  advanceLiveProxySkillPeriod,
  checkLiveProxySkillEnd,
  createLiveProxySkillPeriod,
} from '../../src/runtime/skills/proxyLifecycle.ts';

test('1秒期限はFloat32で60回減算した後も残る', () => {
  let state = { cardInstanceId: 1, periodType: 1 as const, remainingPeriod: 1 };
  for (let frame = 0; frame < 60; frame += 1) {
    const advanced = advanceLiveProxySkillPeriod(state, {
      kind: 'clock',
      deltaTimeSeconds: 1 / 60,
    });
    expect(advanced.periodEnded).toBe(false);
    state = advanced.state;
  }
  expect(state.remainingPeriod).toBe(2.7939677238464355e-7);
  expect(
    advanceLiveProxySkillPeriod(state, { kind: 'clock', deltaTimeSeconds: 1 / 60 }).periodEnded,
  ).toBe(true);
});

test('期限の初期値はint64からFloat32へ直接変換する', () => {
  expect(createLiveProxySkillPeriod(1, 16_777_217n, 2)).toEqual({
    periodType: 1,
    remainingPeriod: Math.fround(16_777_216 / 1000),
  });
  expect(createLiveProxySkillPeriod(2, (1n << 53n) + 1n, 1)).toEqual({
    periodType: 2,
    remainingPeriod: (1n << 53n) + 1n,
  });
});

test('登録しない期限条件では共通factoryがnullを返す', () => {
  expect(createLiveProxySkillPeriod(1, 0n, 1)).toBeNull();
  expect(createLiveProxySkillPeriod(2, -1n, 1)).toBeNull();
  expect(createLiveProxySkillPeriod(3, 0n, 2)).toBeNull();
  expect(createLiveProxySkillPeriod(3, 0n, 1)).toEqual({ periodType: 3 });
});

test('使用回数とAP消費は自分以外のカードでのみ減る', () => {
  const state = { cardInstanceId: 'source', periodType: 4 as const, remainingPeriod: 2n };
  expect(
    advanceLiveProxySkillPeriod(state, {
      kind: 'skill-activation',
      cardInstanceId: 'source',
      consumeAp: 5,
    }).state,
  ).toBe(state);
  expect(
    advanceLiveProxySkillPeriod(state, {
      kind: 'skill-activation',
      cardInstanceId: 'other',
      consumeAp: 5,
    }).state.remainingPeriod,
  ).toBe(1n);
});

test('AP消費量は符号付きint32で読み、期限はint64で計算する', () => {
  const state = { cardInstanceId: 1, periodType: 5 as const, remainingPeriod: (1n << 53n) + 1n };
  expect(
    advanceLiveProxySkillPeriod(state, {
      kind: 'skill-activation',
      cardInstanceId: 2,
      consumeAp: 4_294_967_297,
    }).state.remainingPeriod,
  ).toBe(1n << 53n);
  expect(
    advanceLiveProxySkillPeriod(state, {
      kind: 'skill-activation',
      cardInstanceId: 2,
      consumeAp: -2,
    }).state.remainingPeriod,
  ).toBe((1n << 53n) + 3n);
  expect(
    advanceLiveProxySkillPeriod(
      { ...state, remainingPeriod: -(1n << 63n) },
      { kind: 'skill-activation', cardInstanceId: 2, consumeAp: 1 },
    ).state.remainingPeriod,
  ).toBe((1n << 63n) - 1n);
});

test('終了flag後も購読中の期限は減算し、終了判定のcallbackだけを止める', () => {
  const state = {
    ...createLiveProxyAbsorbInfo(1, 1n, []),
    periodType: 2 as const,
    remainingPeriod: 1n,
    isAbsorbEnd: true,
    induceTiming: 1 as const,
    induceCondition: 1 as const,
  };
  const advanced = advanceLiveProxySkillPeriod(state, { kind: 'section-change' });
  expect(advanced.state.remainingPeriod).toBe(0n);
  expect(checkLiveProxySkillEnd(advanced.state, advanced.periodEnded).result).toBe('none');
});

test('未達の途中通知は終了せず、未達の期限通知は効果を誘発せず解放する', () => {
  const state = {
    ...createLiveProxyAbsorbInfo(1, 1n, [{ actionType: 20n, targetAmount: 1n }]),
    periodType: 1 as const,
    remainingPeriod: 1,
    induceTiming: 1 as const,
    induceCondition: 1 as const,
  };
  expect(checkLiveProxySkillEnd(state, false)).toEqual({ state, result: 'none' });
  const ended = checkLiveProxySkillEnd(state, true);
  expect(ended.result).toBe('release');
  expect(ended.state.isAbsorbEnd).toBe(true);
});

test('セクション期間のTARGET_AMOUNTは終了flagを立てて次の通知でも誘発しない', () => {
  const state = {
    ...createLiveProxyAbsorbInfo(1, 1n, []),
    periodType: 2 as const,
    remainingPeriod: 0n,
    induceTiming: 1 as const,
    induceCondition: 1 as const,
  };
  const ended = checkLiveProxySkillEnd(state, true);
  expect(ended.result).toBe('defer');
  expect(checkLiveProxySkillEnd(ended.state, true).result).toBe('none');
  expect(checkLiveProxySkillEnd({ ...state, induceTiming: 2 }, true).result).toBe('induce');
});
