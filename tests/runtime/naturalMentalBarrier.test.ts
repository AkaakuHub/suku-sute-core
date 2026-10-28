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
