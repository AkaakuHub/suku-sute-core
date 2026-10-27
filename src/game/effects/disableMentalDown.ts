import type { DisableMentalDownEffect } from '../disableMentalDownTypes.ts';
import type { GameState } from '../model.ts';
import { int64ToFloat32 } from '../numeric.ts';

export function activateDisableMentalDown(
  state: GameState,
  effect: DisableMentalDownEffect,
): GameState {
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const disable: GameState['disableMentalDownEffects'][number] = {
    id: state.nextDisableMentalDownId,
    remainingSeconds:
      suppressDuration || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / Math.fround(1000)),
    remainingSections:
      suppressDuration || effect.duration.kind !== 'sections' ? null : effect.duration.value,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...state,
    disableMentalDownEffects: [...state.disableMentalDownEffects, disable],
    nextDisableMentalDownId: state.nextDisableMentalDownId + 1,
  };
}

export function advanceDisableMentalDownEffects(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    disableMentalDownEffects: state.disableMentalDownEffects.flatMap((effect) => {
      if (effect.remainingSeconds === null) return [effect];
      const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...effect, remainingSeconds }] : [];
    }),
  };
}

export function expireDisableMentalDownEffectSections(state: GameState): GameState {
  return {
    ...state,
    disableMentalDownEffects: state.disableMentalDownEffects.flatMap((effect) => {
      if (effect.remainingSections === null) return [effect];
      const remainingSections = effect.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...effect, remainingSections }] : [];
    }),
  };
}

export function deactivateDisableMentalDownEffects(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    disableMentalDownEffects: state.disableMentalDownEffects.filter(
      (effect) => effect.deactivationKey !== deactivationKey,
    ),
  };
}
