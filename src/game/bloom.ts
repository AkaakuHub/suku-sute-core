import type { GameState } from './model.ts';
import { voltageLevel } from './live/voltageLevel.ts';
import { voltageThreshold } from './live/voltageLevel.ts';
import { induceMentalHearts } from './effects/mentalHeartInduce.ts';
import {
  calculateLiveInitialGenesisGauge,
  calculateLiveGenesisGaugeDelta,
} from '../runtime/skills/genesisSkill.ts';

const gaugeTypes = { energy: 3, stamina: 2, excitement: 1 } as const;

export function activateBloom(state: GameState, strength: number): GameState {
  if (state.bloom)
    return {
      ...state,
      bloom: { ...state.bloom, strength: Math.max(state.bloom.strength, strength) },
    };
  return {
    ...state,
    bloom: {
      progress: BigInt(
        calculateLiveInitialGenesisGauge({
          currentAp: Math.floor(state.energy),
          currentMental: Math.floor(state.stamina),
          currentVoltageLevel: voltageLevel(state.excitement, state.maximumVoltageLevel),
        }),
      ),
      strength,
      rollback: { energy: state.energy, stamina: state.stamina, excitement: state.excitement },
    },
  };
}

export function changeBloomResource(
  state: GameState,
  resource: 'energy' | 'stamina' | 'excitement',
  amount: bigint,
): GameState {
  if (!state.bloom) throw new Error('開花が発動していません。');
  const delta = calculateLiveGenesisGaugeDelta({
    actionType: 14,
    gaugeType: gaugeTypes[resource],
    effectValue: Number(amount),
    currentGenesisEffectValue: state.bloom.strength,
  });
  if (delta === null) return state;
  const progress = BigInt.asIntN(32, state.bloom.progress + BigInt(delta));
  return {
    ...state,
    bloom: {
      ...state.bloom,
      progress: progress < 0n ? 0n : progress,
    },
  };
}

export function changeBloomGauge(state: GameState, effectValue: number): GameState {
  if (!state.bloom) throw new Error('開花が発動していません。');
  const delta = calculateLiveGenesisGaugeDelta({
    actionType: 0,
    gaugeType: 1,
    effectValue,
    currentGenesisEffectValue: state.bloom.strength,
  });
  if (delta === null) return state;
  const progress = BigInt.asIntN(32, state.bloom.progress + BigInt(delta));
  return {
    ...state,
    bloom: { ...state.bloom, progress: progress < 0n ? 0n : progress },
  };
}

export function finishBloom(state: GameState): GameState {
  if (!state.bloom) return state;
  let next: GameState = {
    ...state,
    ...state.bloom.rollback,
    gaugeInfinities: state.gaugeInfinities.map((infinity) => ({ ...infinity, suspended: false })),
    bloom: null,
  };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'ap'))
    next = { ...next, energy: next.maxEnergy };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'voltage'))
    next = { ...next, excitement: voltageThreshold(next.maximumVoltageLevel) };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'mental')) {
    next = { ...next, stamina: next.maximumMental, mentalTimerSeconds: 0 };
    next = induceMentalHearts(next, next.maximumMental);
  } else if (next.disableMentalDownEffects.length > 0) {
    next = induceMentalHearts(next, 0);
  } else if (!next.resting || next.stamina > 0) {
    next = induceMentalHearts(next, Math.trunc(next.stamina));
  }
  return next;
}
