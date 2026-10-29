import { expect, test } from 'vite-plus/test';
import { consumeLiveMentalBarrierNaturally } from '../../src/runtime/skills/mentalBarrierDamage.ts';
import type {
  LiveMentalBarrierEffect,
  LiveMentalBarrierState,
} from '../../src/runtime/skills/mentalBarrier.ts';

const attenuation: LiveMentalBarrierEffect = {
  effectId: 'attenuation',
  barrierType: 'attenuation',
  attenuationFactor: 10,
  endurance: { kind: 'infinite' },
  duration: { kind: 'full-end' },
  limitTimeSeconds: Infinity,
  parentControlsLifetime: false,
  deactivationKey: null,
};

test('減衰バリアは自然減少の間隔に作用し、発生済みの1回を吸収しない', () => {
  const state: LiveMentalBarrierState = { effects: [attenuation], additionalBuffs: [] };
  expect(consumeLiveMentalBarrierNaturally(state)).toEqual({ state, absorbed: false });
});

test('自然減少1回で耐久値を1消費し、減衰率で減らしたり残り耐久値で丸めたりしない', () => {
  let state: LiveMentalBarrierState = {
    effects: [
      attenuation,
      {
        ...attenuation,
        effectId: 'endurance',
        barrierType: 'endurance',
        endurance: { kind: 'finite', maximum: 1.5, consumed: 0 },
      },
    ],
    additionalBuffs: [],
  };
  for (const consumed of [1, 2]) {
    const result = consumeLiveMentalBarrierNaturally(state);
    expect(result.absorbed).toBe(true);
    expect(result.state.effects[1]?.endurance).toEqual({ kind: 'finite', maximum: 1.5, consumed });
    state = result.state;
  }
  expect(consumeLiveMentalBarrierNaturally(state)).toEqual({ state, absorbed: false });
});

test('無限耐久のバリアは消費値を持たず自然減少を吸収する', () => {
  const state: LiveMentalBarrierState = {
    effects: [{ ...attenuation, barrierType: 'endurance' }],
    additionalBuffs: [],
  };
  expect(consumeLiveMentalBarrierNaturally(state)).toEqual({ state, absorbed: true });
});

test('耐久値の大小や無限耐久より終了時刻の早いバリアを優先する', () => {
  const state: LiveMentalBarrierState = {
    effects: [
      { ...attenuation, effectId: 'stage', barrierType: 'endurance' },
      {
        ...attenuation,
        effectId: 'later',
        barrierType: 'endurance',
        duration: { kind: 'milliseconds', remainingSeconds: 2 },
        limitTimeSeconds: 2,
        endurance: { kind: 'finite', maximum: 100, consumed: 0 },
      },
      {
        ...attenuation,
        effectId: 'earlier',
        barrierType: 'endurance',
        duration: { kind: 'sections', remainingChanges: 1n },
        limitTimeSeconds: 1,
        endurance: { kind: 'finite', maximum: 2, consumed: 0 },
      },
    ],
    additionalBuffs: [],
  };
  const consumed = consumeLiveMentalBarrierNaturally(state);
  expect(consumed.state.effects.map((effect) => effect.endurance)).toEqual([
    { kind: 'infinite' },
    { kind: 'finite', maximum: 100, consumed: 0 },
    { kind: 'finite', maximum: 2, consumed: 1 },
  ]);
});
