import { expect, test } from 'vite-plus/test';
import { createLiveProxyAbsorbInfo } from '../../src/runtime/skills/proxyAbsorption.ts';
import {
  forceLiveProxySkillActivation,
  selectLiveProxySkillsForForcedActivation,
} from '../../src/runtime/skills/proxyForcedActivation.ts';

function entries() {
  return [
    createLiveProxyAbsorbInfo(1, 1n, [{ actionType: 20n, targetAmount: 1n }]),
    {
      ...createLiveProxyAbsorbInfo(2, 2n, [{ actionType: 20n, targetAmount: 1n }]),
      effects: [{ actionType: 20, targetAmount: 1n, totalAmount: 1n }],
    },
    { ...createLiveProxyAbsorbInfo(3, 1n, []), isAbsorbEnd: true },
  ];
}

test.each([
  [1n, [1, 2, 3]],
  [2n, [1, 3]],
  [3n, [2]],
  [4n, [2, 3]],
  [5n, [1]],
  [4_294_967_298n, [1, 3]],
  [0n, []],
  [6n, []],
])('強制発動種別%sはnativeと同じ対象を選ぶ', (targetType, expected) => {
  expect(
    selectLiveProxySkillsForForcedActivation(entries(), targetType).map((s) => s.cardInstanceId),
  ).toEqual(expected);
});

test('全対象の選択は元の登録配列と独立したsnapshotを作る', () => {
  const states = entries();
  const selected = selectLiveProxySkillsForForcedActivation(states, 1n);
  expect(selected).toEqual(states);
  expect(selected).not.toBe(states);
});

test('負の相対Mood目標も到達方向で選び、終了済みでも除外しない', () => {
  const state = {
    ...createLiveProxyAbsorbInfo('mood', 2n, []),
    effects: [{ actionType: 48, targetAmount: -10n, totalAmount: -11n }],
    isAbsorbEnd: true,
  };
  expect(selectLiveProxySkillsForForcedActivation([state], 4n)).toEqual([state]);
  expect(selectLiveProxySkillsForForcedActivation([state], 5n)).toEqual([]);
});

test('強制発動は目標未達でも終了flagを立て、吸収量を保持する', () => {
  const state = entries()[0];
  if (!state) throw new Error('Missing Proxy');
  const ended = forceLiveProxySkillActivation(state);
  expect(ended.isAbsorbEnd).toBe(true);
  expect(ended.effects).toBe(state.effects);
  expect(state.isAbsorbEnd).toBe(false);
});
