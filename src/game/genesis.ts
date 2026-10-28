import type { GameState } from './model.ts';
import { voltageLevel, voltageThreshold } from './live/voltageLevel.ts';
import { induceMentalHearts } from './effects/mentalHeartInduce.ts';
import {
  activateLiveGenesisEffect,
  addLiveGenesisGauge,
  advanceLiveGenesisState,
  type LiveGenesisEffect,
} from '../runtime/skills/genesisSkill.ts';

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
      currentAp: Math.floor(state.ap.currentAp),
      currentMental: Math.floor(state.mental.currentMental),
      currentVoltage: state.voltage.currentVoltage,
      currentVoltageLevel: voltageLevel(state.voltage.currentVoltage, state.maximumVoltageLevel),
    }),
  };
}

export function changeGenesisMental(state: GameState, amount: bigint): GameState {
  return {
    ...state,
    genesis: addLiveGenesisGauge(state.genesis, {
      actionType: 14,
      gaugeType: 2,
      effectValue: Number(amount),
    }),
  };
}

export function finishGenesis(state: GameState): GameState {
  const frame = advanceLiveGenesisState(state.genesis, {
    deltaTimeSeconds: 0,
    sectionChangeCount: 0,
    musicEnded: true,
  });
  const rollback = frame.finishedRollback;
  if (!rollback) return state;
  let next: GameState = {
    ...state,
    gaugeInfinities: state.gaugeInfinities.map((infinity) => ({ ...infinity, suspended: false })),
    genesis: frame.state,
    mental: { ...state.mental, currentMental: rollback.currentMental },
    ap: { ...state.ap, currentAp: rollback.currentAp },
    voltage: { ...state.voltage, currentVoltage: rollback.currentVoltage },
  };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'ap'))
    next = { ...next, ap: { ...next.ap, currentAp: next.ap.maxAp } };
  if (state.gaugeInfinities.some((infinity) => infinity.gauge === 'voltage'))
    next = {
      ...next,
      voltage: {
        ...next.voltage,
        currentVoltage: voltageThreshold(next.maximumVoltageLevel),
      },
    };
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
