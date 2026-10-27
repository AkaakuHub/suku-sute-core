import type { GameState } from '../model.ts';
import type { Effect } from '../modelTypes.ts';

type StopVoltageIncreaseEffect = Extract<Effect, { kind: 'stop-voltage-increase' }>;

export function activateVoltageIncreaseStop(
  state: GameState,
  effect: StopVoltageIncreaseEffect,
): GameState {
  if (effect.duration.value === 0 || effect.duration.value === 0n) return state;
  const indefinite = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  return {
    ...state,
    voltageStops: [
      ...state.voltageStops,
      {
        id: state.nextVoltageStopId,
        remainingSeconds:
          indefinite || effect.duration.kind !== 'milliseconds'
            ? null
            : Math.fround(effect.duration.value / Math.fround(1000)),
        remainingSections:
          indefinite || effect.duration.kind !== 'sections' ? null : effect.duration.value,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
    nextVoltageStopId: state.nextVoltageStopId + 1,
  };
}

export function advanceVoltageIncreaseStops(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    voltageStops: state.voltageStops.flatMap((stop) => {
      if (stop.remainingSeconds === null) return [stop];
      const remainingSeconds = Math.fround(stop.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...stop, remainingSeconds }] : [];
    }),
  };
}

export function expireVoltageIncreaseStopSections(state: GameState): GameState {
  return {
    ...state,
    voltageStops: state.voltageStops.flatMap((stop) => {
      if (stop.remainingSections === null) return [stop];
      const remainingSections = stop.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...stop, remainingSections }] : [];
    }),
  };
}

export function deactivateVoltageIncreaseStops(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    voltageStops: state.voltageStops.filter((stop) => stop.deactivationKey !== deactivationKey),
  };
}
