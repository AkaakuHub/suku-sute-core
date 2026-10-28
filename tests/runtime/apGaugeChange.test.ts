import { expect, test } from 'vite-plus/test';
import { advanceLiveApGauge } from '../../src/runtime/live/apGauge.ts';
import {
  consumeLiveApGaugeValue,
  setLiveApGaugeValue,
} from '../../src/runtime/live/apGaugeChange.ts';
import {
  activateLiveGenesisEffect,
  createLiveGenesisState,
} from '../../src/runtime/skills/genesisSkill.ts';

function initial(currentAp = 10) {
  return { ap: { currentAp, maxAp: 20, timerSeconds: 0 }, genesis: createLiveGenesisState() };
}

function active(currentAp = 10) {
  const state = initial(currentAp);
  return {
    ...state,
    genesis: activateLiveGenesisEffect(
      state.genesis,
      {
        effectId: 'genesis',
        effectValue: 1,
        duration: { kind: 'full-end' },
      },
      { currentAp, currentMental: 100, currentVoltage: 0n, currentVoltageLevel: 1 },
    ),
  };
}

test('AP消費は上限時だけタイマーをリセットし、0消費でも実行する', () => {
  const capped = { ...initial(20), ap: { currentAp: 20, maxAp: 20, timerSeconds: 0.75 } };
  expect(consumeLiveApGaugeValue(capped, 3, false).ap).toEqual({
    currentAp: 17,
    maxAp: 20,
    timerSeconds: 0,
  });
  expect(consumeLiveApGaugeValue(capped, 0, false).ap.timerSeconds).toBe(0);
  const partial = { ...initial(10), ap: { ...capped.ap, currentAp: 10 } };
  expect(consumeLiveApGaugeValue(partial, 3, false).ap.timerSeconds).toBe(0.75);
});

test('Infinity中も上限時の消費でタイマーを戻し、AP値は保持する', () => {
  const state = { ...initial(20), ap: { currentAp: 20, maxAp: 20, timerSeconds: 0.75 } };
  expect(consumeLiveApGaugeValue(state, 3, true).ap).toEqual({ ...state.ap, timerSeconds: 0 });
});

test('Genesis中の消費はInfinityより先に変換し、AP値を保持する', () => {
  const state = active(20);
  const next = consumeLiveApGaugeValue(
    { ...state, ap: { ...state.ap, timerSeconds: 0.75 } },
    3,
    true,
  );
  expect(next.ap).toEqual({ currentAp: 20, maxAp: 20, timerSeconds: 0 });
  expect(next.genesis.currentGauge).toBe(state.genesis.currentGauge - 13);
});

test('通常のAP設定はint32へ変換してから0と上限の間に制限する', () => {
  const state = initial();
  expect(setLiveApGaugeValue(state, 40n, false).ap.currentAp).toBe(20);
  expect(setLiveApGaugeValue(state, -10n, false).ap.currentAp).toBe(0);
  expect(setLiveApGaugeValue(state, (1n << 32n) + 7n, false).ap.currentAp).toBe(7);
  expect(setLiveApGaugeValue(state, 1n << 31n, false).ap.currentAp).toBe(0);
});

test('Genesis中は上限適用前のAP差分を変換し、AP値を保持する', () => {
  const state = active();
  const raised = setLiveApGaugeValue(state, 40n, false);
  expect(raised.ap).toBe(state.ap);
  expect(raised.genesis.currentGauge - state.genesis.currentGauge).toBe(39);
  const lowered = setLiveApGaugeValue(state, -40n, false);
  expect(lowered.ap).toBe(state.ap);
  expect(lowered.genesis.currentGauge - state.genesis.currentGauge).toBe(-50);
});

test('Infinityの判定より先にGenesisへ変換する', () => {
  const state = active();
  expect(setLiveApGaugeValue(state, 11n, true).genesis.currentGauge).toBe(
    state.genesis.currentGauge + 8,
  );
  const ordinary = initial();
  expect(setLiveApGaugeValue(ordinary, 11n, true)).toBe(ordinary);
});

test('長いframeでも自然AP回復を1回ずつ変換し、上限で回復分を失わない', () => {
  let state = active(19);
  const before = state.genesis.currentGauge;
  const frame = advanceLiveApGauge(
    state.ap,
    {
      deltaTimeSeconds: 4.5,
      mentalDown: false,
      increaseIntervalSeconds: 1,
    },
    {
      setAp: () => {
        throw new Error('通常の間隔では直接設定しません。');
      },
      addAp: (currentAp, amount) => {
        state = setLiveApGaugeValue(state, BigInt(currentAp + amount), false);
        return state.ap.currentAp;
      },
    },
  );
  expect(frame.state).toEqual({ currentAp: 19, maxAp: 20, timerSeconds: 0.5 });
  expect(state.genesis.currentGauge).toBe(before + 32);
});

test('間隔0は加算経路を使わず上限への直接設定を変換する', () => {
  let state = active();
  const before = state.genesis.currentGauge;
  const frame = advanceLiveApGauge(
    state.ap,
    {
      deltaTimeSeconds: 0.5,
      mentalDown: false,
      increaseIntervalSeconds: 0,
    },
    {
      setAp: (value) => {
        state = setLiveApGaugeValue(state, BigInt(value), false);
        return state.ap.currentAp;
      },
      addAp: () => {
        throw new Error('間隔0では加算しません。');
      },
    },
  );
  expect(frame.state.currentAp).toBe(10);
  expect(state.genesis.currentGauge).toBe(before + 23);
});
