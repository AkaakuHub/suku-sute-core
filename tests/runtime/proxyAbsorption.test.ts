import { expect, test } from 'vite-plus/test';
import {
  absorbLiveProxySkillEffect,
  createLiveProxyAbsorbInfo,
  liveProxyTargetReached,
  liveProxyInducePower,
} from '../../src/runtime/skills/proxyAbsorption.ts';

test('終了済みProxyを飛ばし、最初に一致した有効なProxyだけが吸収する', () => {
  const first = { ...proxy(1), isAbsorbEnd: true };
  const second = proxy(2);
  const third = proxy(3);
  const result = absorbLiveProxySkillEffect([first, second, third], 20, 1n);
  expect(result.changedIndex).toBe(1);
  expect(result.states.map((state) => state.effects[0]?.totalAmount)).toEqual([0n, 1n, 0n]);
});

test('上限到達した対象を飛ばして後続Proxyへ渡し、全対象が満杯なら吸収しない', () => {
  const first = { ...proxy(1), effects: [{ actionType: 20, targetAmount: 1n, totalAmount: 1n }] };
  const states = [first, proxy(2)];
  const result = absorbLiveProxySkillEffect(states, 20, 2n);
  expect(result.absorbed).toBe(true);
  expect(result.states[1]?.effects[0]?.totalAmount).toBe(2n);
  expect(result.changedIndex).toBe(1);
  const saturated = [first, { ...first, cardInstanceId: 2 }];
  const missed = absorbLiveProxySkillEffect(saturated, 20, 2n);
  expect(missed.absorbed).toBe(false);
  expect(missed.states).toBe(saturated);
  expect(missed.changedIndex).toBeNull();
});

test('同じProxyに対象種別が複数ある場合も満杯の対象を飛ばして探索する', () => {
  const state = {
    ...proxy(1),
    effects: [
      { actionType: 20, targetAmount: 1n, totalAmount: 1n },
      { actionType: 20, targetAmount: 2n, totalAmount: 0n },
    ],
  };
  const result = absorbLiveProxySkillEffect([state], 20, 1n);
  expect(result.states[0]?.effects.map((effect) => effect.totalAmount)).toEqual([1n, 1n]);
});

test('Action20の負数は吸収せず、累計はint64で折り返す', () => {
  const states = [
    {
      ...proxy(1, 0n),
      effects: [{ actionType: 20, targetAmount: 1n, totalAmount: (1n << 63n) - 1n }],
    },
  ];
  expect(absorbLiveProxySkillEffect(states, 20, -1n).absorbed).toBe(false);
  expect(absorbLiveProxySkillEffect(states, 20, 1n).states[0]?.effects[0]?.totalAmount).toBe(
    -(1n << 63n),
  );
});

test('Moodの絶対加算はint64をFloat32へ変換してから絶対値を取る', () => {
  const states = [createLiveProxyAbsorbInfo(1, 4n, [{ actionType: 48n, targetAmount: 1n }])];
  expect(
    absorbLiveProxySkillEffect(states, 48, -16_777_217n).states[0]?.effects[0]?.totalAmount,
  ).toBe(16_777_216n);
  expect(
    absorbLiveProxySkillEffect(states, 48, -(1n << 63n)).states[0]?.effects[0]?.totalAmount,
  ).toBe((1n << 63n) - 1n);
});

test('Moodの負の目標は相対加算の場合だけ下方向で比較する', () => {
  const effect = { actionType: 48, targetAmount: -3n, totalAmount: -2n };
  expect(liveProxyTargetReached(effect, false)).toBe(false);
  expect(liveProxyTargetReached({ ...effect, totalAmount: -3n }, false)).toBe(true);
  expect(liveProxyTargetReached(effect, true)).toBe(true);
});

test('吸収種別と対象種別・目標をint32で読む', () => {
  const state = createLiveProxyAbsorbInfo('source', 4n, [
    { actionType: 4_294_967_316n, targetAmount: 4_294_967_295n },
  ]);
  expect(state.hasAbsorbLimit).toBe(false);
  expect(state.isAbsoluteAdd).toBe(true);
  expect(state.effects).toEqual([{ actionType: 20, targetAmount: -1n, totalAmount: 0n }]);
});

test.each([
  { type: 1n, limited: true, absolute: false },
  { type: 2n, limited: false, absolute: false },
  { type: 3n, limited: true, absolute: true },
  { type: 4n, limited: false, absolute: true },
  { type: 5n, limited: false, absolute: false },
  { type: 4_294_967_299n, limited: true, absolute: true },
])('吸収種別$typeをAPKの比較式で判定する', ({ type, limited, absolute }) => {
  const state = createLiveProxyAbsorbInfo(1, type, []);
  expect(state.hasAbsorbLimit).toBe(limited);
  expect(state.isAbsoluteAdd).toBe(absolute);
});

test('誘発倍率は0の項を掛け、空の吸収対象だけは初期倍率1を保つ', () => {
  const state = {
    ...proxy(1),
    effects: [
      { actionType: 20, totalAmount: 2n, targetAmount: 1n },
      { actionType: 21, totalAmount: 0n, targetAmount: 1n },
    ],
  };
  expect(liveProxyInducePower(state, 3, 0n, 20).multiplyFactor).toBe(0);
  expect(liveProxyInducePower({ ...state, effects: [] }, 3, 0n, 20).multiplyFactor).toBe(1);
});

test('誘発の加算値と倍率のパラメーターはint64からFloat32へ変換する', () => {
  const state = {
    ...proxy(1),
    effects: [{ actionType: 20, targetAmount: 1n, totalAmount: 16_777_217n }],
  };
  expect(liveProxyInducePower(state, 2, 16_777_217n, 20)).toEqual({
    addValue: 16_777_216,
    multiplyFactor: Math.fround(16_777_216 / 10_000),
    effectPower: 1,
  });
  expect(liveProxyInducePower(state, 2, 16_777_217n, 21)).toEqual({
    addValue: 0,
    multiplyFactor: 1,
    effectPower: 1,
  });
});

function proxy(id: number, absorbLimit = 1n) {
  return createLiveProxyAbsorbInfo(id, absorbLimit, [{ actionType: 20n, targetAmount: 1n }]);
}
