import type { LiveHandCardCountEffect } from '../cards/deckActionTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';

export const liveMinimumHandCardCount = 3;
export const liveDefaultHandCardCount = 5;
export const liveMaximumHandCardCount = 8;

export type LiveHandCardCountState = Readonly<{
  effects: readonly Readonly<{
    effectId: string;
    amount: number;
    duration: LiveSkillEffectDuration;
  }>[];
}>;

export function createLiveHandCardCountState(): LiveHandCardCountState {
  return { effects: [] };
}

export function activateLiveHandCardCountEffect(
  state: LiveHandCardCountState,
  effect: LiveHandCardCountEffect,
  amount: number,
): LiveHandCardCountState {
  validateState(state);
  if (!Number.isSafeInteger(amount)) {
    throw new Error('Live HandCardCount amount is invalid');
  }
  return {
    effects: [...state.effects, { effectId: effect.effectId, amount, duration: effect.duration }],
  };
}

export function advanceLiveHandCardCountState(
  state: LiveHandCardCountState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveHandCardCountState {
  validateState(state);
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
  };
}

export function liveHandCardCount(state: LiveHandCardCountState): number {
  validateState(state);
  const count = state.effects.reduce(
    (sum, effect) => sum + effect.amount,
    liveDefaultHandCardCount,
  );
  return Math.min(Math.max(count, liveMinimumHandCardCount), liveMaximumHandCardCount);
}

function validateState(state: LiveHandCardCountState): void {
  if (
    state.effects.some(
      (effect) => effect.effectId.length === 0 || !Number.isSafeInteger(effect.amount),
    )
  ) {
    throw new Error('Live HandCardCount state is invalid');
  }
}
