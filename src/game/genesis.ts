import type { GameState } from './model.ts';
import { rules } from './rules.ts';
import { voltageLevel, voltageThreshold } from './live/voltageLevel.ts';
import { induceMentalHearts } from './effects/mentalHeartInduce.ts';
import {
  activateLiveGenesisEffect,
  addLiveGenesisGauge,
  advanceLiveGenesisState,
  type LiveGenesisEffect,
} from '../runtime/skills/genesisSkill.ts';

const gaugeTypes = { ap: 3, mental: 2, voltage: 1 } as const;

export function activateGenesis(state: GameState, effectValue: number): GameState {
  return applyGenesisEffect(state, {
    effectId: String(state.genesis.effects.length + 1),
    effectValue,
    duration: { kind: 'full-end' },
  });
}

export function applyGenesisEffect(state: GameState, effect: LiveGenesisEffect): GameState {
  return {
    ...state,
    genesis: activateLiveGenesisEffect(state.genesis, effect, {
      currentAp: Math.floor(state.currentAp),
      currentMental: Math.floor(state.mental.currentMental),
      currentVoltage: BigInt(state.currentVoltage),
      currentVoltageLevel: voltageLevel(state.currentVoltage, state.maximumVoltageLevel),
    }),
  };
}

export function changeGenesisResource(
  state: GameState,
  resource: 'ap' | 'mental' | 'voltage',
  amount: bigint,
): GameState {
  return {
    ...state,
    genesis: addLiveGenesisGauge(state.genesis, {
      actionType: 14,
      gaugeType: gaugeTypes[resource],
      effectValue: Number(amount),
    }),
  };
}

export function changeGenesisGauge(state: GameState, effectValue: number): GameState {
  return {
    ...state,
    genesis: addLiveGenesisGauge(state.genesis, { actionType: 0, gaugeType: 1, effectValue }),
  };
}

export function finishGenesis(state: GameState): GameState {
  const frame = advanceLiveGenesisState(state.genesis, {
    currentTimeSeconds: state.tick / rules.ticksPerSecond,
    sectionChangeCount: 0,
    musicEnded: true,
  });
  const rollback = frame.finishedRollback;
  if (!rollback) return state;
  let next: GameState = {
    ...state,
    currentAp: rollback.currentAp,
    currentVoltage: Number(rollback.currentVoltage),
    gaugeInfinities: state.gaugeInfinities.map((infinity) => ({ ...infinity, suspended: false })),
    genesis: frame.state,
    mental: { ...state.mental, currentMental: rollback.currentMental },
  };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'ap'))
    next = { ...next, currentAp: next.maxAp };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'voltage'))
    next = { ...next, currentVoltage: voltageThreshold(next.maximumVoltageLevel) };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'mental')) {
    next = {
      ...next,
      mental: { ...next.mental, currentMental: next.maximumMental, timerSeconds: 0 },
    };
    next = induceMentalHearts(next, next.maximumMental);
  } else if (next.disableMentalDownEffects.length > 0) {
    next = induceMentalHearts(next, 0);
  } else if (!next.mental.mentalDown || next.mental.currentMental > 0) {
    next = induceMentalHearts(next, Math.trunc(next.mental.currentMental));
  }
  return next;
}
