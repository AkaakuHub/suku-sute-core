import type { GameState } from './model.ts';
import { voltageLevel } from './live/voltageLevel.ts';
import { voltageThreshold } from './live/voltageLevel.ts';
import { induceMentalHearts } from './effects/mentalHeartInduce.ts';
import {
  calculateLiveInitialGenesisGauge,
  calculateLiveGenesisGaugeDelta,
} from '../runtime/skills/genesisSkill.ts';

const gaugeTypes = { ap: 3, mental: 2, voltage: 1 } as const;

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
          currentAp: Math.floor(state.currentAp),
          currentMental: Math.floor(state.currentMental),
          currentVoltageLevel: voltageLevel(state.currentVoltage, state.maximumVoltageLevel),
        }),
      ),
      strength,
      rollback: {
        currentAp: state.currentAp,
        currentMental: state.currentMental,
        currentVoltage: state.currentVoltage,
      },
    },
  };
}

export function changeBloomResource(
  state: GameState,
  resource: 'ap' | 'mental' | 'voltage',
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
    next = { ...next, currentAp: next.maxAp };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'voltage'))
    next = { ...next, currentVoltage: voltageThreshold(next.maximumVoltageLevel) };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'mental')) {
    next = { ...next, currentMental: next.maximumMental, mentalTimerSeconds: 0 };
    next = induceMentalHearts(next, next.maximumMental);
  } else if (next.disableMentalDownEffects.length > 0) {
    next = induceMentalHearts(next, 0);
  } else if (!next.mentalDown || next.currentMental > 0) {
    next = induceMentalHearts(next, Math.trunc(next.currentMental));
  }
  return next;
}
