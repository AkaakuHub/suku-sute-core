import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type { LiveHandCardCountEffect } from '../cards/deckActionTypes.ts';
import type { LiveCardIdentifier } from '../cards/deckBoardState.ts';
import type { LiveTokenCardDeckState } from '../cards/tokenCardDeck.ts';
import type { LiveDeckActionQueueState } from '../cards/deckActionQueue.ts';
import { notifyLiveHandCardCountAdd } from '../cards/handCardCountAdd.ts';
import { ceilToInt32 } from '../numeric.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { activateLiveHandCardMax, deactivateLiveHandCardMax } from '../cards/handCardTarget.ts';
import {
  advanceLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';

export const liveMinimumHandCardCount = 3;
export const liveDefaultHandCardCount = 5;
export const liveMaximumHandCardCount = 8;

export function calculateLiveHandCardCountAmount(
  amount: number,
  power: LiveSkillEffectPower,
): number {
  return ceilToInt32(
    Math.fround(
      Math.fround(
        Math.fround(Math.fround(amount) + Math.fround(power.addValue)) *
          Math.fround(power.multiplyFactor),
      ) * Math.fround(power.effectPower),
    ),
  );
}

type HandCountEffect<Id extends LiveCardIdentifier> = Readonly<{
  effectId: string | null;
  cardInstanceId: Id | null;
  deactivationKey: string | null;
  duration: LiveSkillEffectDuration;
}> &
  Readonly<{ kind: 'count'; amount: number } | { kind: 'max' }>;

export type LiveHandCardCountState<Id extends LiveCardIdentifier = number> = Readonly<{
  effects: readonly HandCountEffect<Id>[];
}>;

export type LiveHandCardCountTransition<Id extends LiveCardIdentifier> = Readonly<{
  state: LiveHandCardCountState<Id>;
  tokenCardDeck: LiveTokenCardDeckState<Id>;
  resetNotifications: readonly number[];
}>;

export function createLiveHandCardCountState<
  Id extends LiveCardIdentifier = number,
>(): LiveHandCardCountState<Id> {
  return { effects: [] };
}

export function activateLiveHandCardCountEffect<Id extends LiveCardIdentifier>(
  state: LiveHandCardCountState<Id>,
  tokenCardDeck: LiveTokenCardDeckState<Id>,
  deckActions: LiveDeckActionQueueState,
  cardInstanceId: Id | null,
  effect: LiveHandCardCountEffect,
  amount: number,
  deactivationKey: string | null,
): LiveHandCardCountTransition<Id> & Readonly<{ deckActions: LiveDeckActionQueueState }> {
  const notified =
    effect.calculationType === 1
      ? notifyLiveHandCardCountAdd({ tokenCardDeck, deckActions }, amount)
      : { tokenCardDeck, deckActions };
  return {
    state:
      effect.calculationType === 1 && amount === 0
        ? state
        : {
            effects: [
              ...state.effects,
              {
                effectId: effect.effectId,
                duration: effect.duration,
                cardInstanceId,
                deactivationKey,
                kind: 'count',
                amount,
              },
            ],
          },
    tokenCardDeck: notified.tokenCardDeck,
    deckActions: notified.deckActions,
    resetNotifications: [],
  };
}

export function activateLiveHandCardMaxEffect<Id extends LiveCardIdentifier>(
  state: LiveHandCardCountState<Id>,
  tokenCardDeck: LiveTokenCardDeckState<Id>,
  cardInstanceId: Id | null,
  effectId: string | null,
  duration: LiveSkillEffectDuration,
  deactivationKey: string | null,
): LiveHandCardCountTransition<Id> {
  return {
    state: {
      effects: [
        ...state.effects,
        { effectId, cardInstanceId, deactivationKey, kind: 'max', duration },
      ],
    },
    tokenCardDeck: activateLiveHandCardMax(tokenCardDeck),
    resetNotifications: [],
  };
}

export function advanceLiveHandCardCountState<Id extends LiveCardIdentifier>(
  state: LiveHandCardCountState<Id>,
  tokenCardDeck: LiveTokenCardDeckState<Id>,
  input: LiveSkillEffectClock,
): LiveHandCardCountTransition<Id> {
  const removed: HandCountEffect<Id>[] = [];
  const effects = state.effects.flatMap((effect) => {
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    if (duration !== null) return [{ ...effect, duration }];
    removed.push(effect);
    return [];
  });
  return removeEffects(effects, removed, tokenCardDeck);
}

export function deactivateLiveHandCardCountEffect<Id extends LiveCardIdentifier>(
  state: LiveHandCardCountState<Id>,
  tokenCardDeck: LiveTokenCardDeckState<Id>,
  cardInstanceId: Id,
  effectId: string,
): LiveHandCardCountTransition<Id> {
  const matches = (effect: HandCountEffect<Id>) =>
    effect.cardInstanceId === cardInstanceId && effect.effectId === effectId;
  return removeEffects(
    state.effects.filter((effect) => !matches(effect)),
    state.effects.filter(matches),
    tokenCardDeck,
  );
}

export function liveHandCardCount(state: LiveTokenCardDeckState<LiveCardIdentifier>): number {
  return Math.min(
    Math.max(state.handTargetCounts.current, liveMinimumHandCardCount),
    liveMaximumHandCardCount,
  );
}

export function deactivateLiveHandCardCountEffectsByKey<Id extends LiveCardIdentifier>(
  state: LiveHandCardCountState<Id>,
  tokenCardDeck: LiveTokenCardDeckState<Id>,
  deactivationKey: string,
  kind: 'count' | 'max',
): LiveHandCardCountTransition<Id> {
  const matches = (effect: HandCountEffect<Id>) =>
    effect.deactivationKey === deactivationKey && effect.kind === kind;
  return removeEffects(
    state.effects.filter((effect) => !matches(effect)),
    state.effects.filter(matches),
    tokenCardDeck,
  );
}

function removeEffects<Id extends LiveCardIdentifier>(
  retained: readonly HandCountEffect<Id>[],
  removed: readonly HandCountEffect<Id>[],
  tokenCardDeck: LiveTokenCardDeckState<Id>,
): LiveHandCardCountTransition<Id> {
  let next = tokenCardDeck;
  const resetNotifications: number[] = [];
  for (const effect of removed) {
    if (effect.kind === 'max') next = deactivateLiveHandCardMax(next);
    else resetNotifications.push(-effect.amount | 0);
  }
  return {
    state: { effects: retained },
    tokenCardDeck: next,
    resetNotifications,
  };
}
