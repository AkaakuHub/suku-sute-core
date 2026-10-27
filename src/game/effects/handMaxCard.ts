import type { GameState } from '../model.ts';
import type { HandMaxCardEffect } from '../handMaxCardTypes.ts';
import { fillHand } from '../cards/drawing.ts';
import { int64ToFloat32 } from '../numeric.ts';

export function activateHandMaxCard(state: GameState, effect: HandMaxCardEffect): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const suspended = effect.invocationType !== undefined;
  const handMaxCardEffect = {
    remainingSeconds:
      !suspended && effect.duration.kind === 'milliseconds'
        ? Math.fround(int64ToFloat32(effect.duration.value) / 1000)
        : null,
    remainingSections:
      !suspended && effect.duration.kind === 'sections' ? effect.duration.value : null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return fillHand({
    ...state,
    handMaxCardEffects: [...state.handMaxCardEffects, handMaxCardEffect],
  });
}

export function advanceHandMaxCardEffects(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    handMaxCardEffects: state.handMaxCardEffects.flatMap((effect) => {
      if (effect.remainingSeconds === null) return [effect];
      const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...effect, remainingSeconds }] : [];
    }),
  };
}

export function expireHandMaxCardSections(state: GameState): GameState {
  return {
    ...state,
    handMaxCardEffects: state.handMaxCardEffects.flatMap((effect) => {
      if (effect.remainingSections === null) return [effect];
      const remainingSections = effect.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...effect, remainingSections }] : [];
    }),
  };
}

export function deactivateHandMaxCardEffects(state: GameState, deactivationKey: string): GameState {
  const handMaxCardEffects = state.handMaxCardEffects.filter(
    (effect) => effect.deactivationKey !== deactivationKey,
  );
  return handMaxCardEffects.length === state.handMaxCardEffects.length
    ? state
    : { ...state, handMaxCardEffects };
}
