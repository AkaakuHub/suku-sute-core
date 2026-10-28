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

test('上限到達後も最初の一致で吸収を止め、後続Proxyへ流さない', () => {
  const first = { ...proxy(1), effects: [{ actionType: 20, targetAmount: 1n, totalAmount: 1n }] };
  const states = [first, proxy(2)];
  const result = absorbLiveProxySkillEffect(states, 20, 2n);
  expect(result.absorbed).toBe(true);
  expect(result.states).toBe(states);
  expect(result.changedIndex).toBeNull();
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
  const states = [createLiveProxyAbsorbInfo(1, 2n, [{ actionType: 48n, targetAmount: 1n }])];
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

test('吸収フラグをビットで読み、対象種別と目標はint32で保持する', () => {
  const state = createLiveProxyAbsorbInfo('source', 4n, [
    { actionType: 4_294_967_316n, targetAmount: 4_294_967_295n },
  ]);
  expect(state.hasAbsorbLimit).toBe(false);
  expect(state.isAbsoluteAdd).toBe(false);
  expect(state.effects).toEqual([{ actionType: 20, targetAmount: -1n, totalAmount: 0n }]);
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
