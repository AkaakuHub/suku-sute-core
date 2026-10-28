import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';
import type { LiveDeckActionQueueState } from './deckActionQueue.ts';
import { liveCurrentDeckCardCount, type LiveTokenCardDeckState } from './tokenCardDeck.ts';
import { resetLiveHandCardTargetCount } from './handCardTarget.ts';

type HandCountRuntime = Readonly<{
  tokenCardDeck: LiveTokenCardDeckState<LiveCardIdentifier>;
  deckActions: LiveDeckActionQueueState;
  deckBoard: LiveDeckBoardState<LiveCardIdentifier>;
}>;

export type LiveHandCardCountResetHandler<State> = (state: State, adjustment: number) => State;

export function notifyLiveHandCardCountReset<State extends HandCountRuntime>(
  state: State,
  amount: number,
): State {
  if (!Number.isInteger(amount) || (amount | 0) !== amount)
    throw new Error('Live hand reset amount is invalid');
  return state.tokenCardDeck.isSwitchDeck
    ? {
        ...state,
        tokenCardDeck: {
          ...state.tokenCardDeck,
          resetCount: (state.tokenCardDeck.resetCount + amount) | 0,
        },
      }
    : {
        ...state,
        deckActions: {
          ...state.deckActions,
          queue: [...state.deckActions.queue, { type: 1, param1: amount }],
        },
      };
}

export function resetLivePendingHandCardCount<State extends HandCountRuntime>(
  state: State,
  resetHand: LiveHandCardCountResetHandler<State>,
): State {
  const amount = state.tokenCardDeck.resetCount;
  if (amount === 0) return state;
  const oldTarget = state.tokenCardDeck.handTargetCounts.current;
  const correction = oldTarget < 3 ? (oldTarget - 3) | 0 : 0;
  const adjustment = (correction + amount) | 0;
  const tokenCardDeck = resetLiveHandCardTargetCount(
    { ...state.tokenCardDeck, resetCount: 0 },
    amount,
  );
  return resetHand({ ...state, tokenCardDeck }, Math.max(0, adjustment));
}

export function liveResetHandCardCount<State extends HandCountRuntime>(
  state: State,
  currentHandCount: number,
  adjustment: number,
): number {
  return Math.min(
    liveCurrentDeckCardCount(state.tokenCardDeck, state.deckBoard),
    Math.max(3, Math.min(8, (currentHandCount + adjustment) | 0)),
  );
}

export function flushLiveHandCardCountActions<State extends HandCountRuntime>(
  state: State,
  resetHand: LiveHandCardCountResetHandler<State>,
): State {
  if (state.deckActions.currentAction !== null || state.tokenCardDeck.isSwitchDeck) return state;
  let next = state;
  while (next.deckActions.queue.length > 0) {
    if (next.tokenCardDeck.isSwitchDeck) return next;
    const action = next.deckActions.queue[0];
    if (!action || action.type === 6 || action.type === 7) return next;
    next = {
      ...next,
      deckActions: {
        ...next.deckActions,
        queue: next.deckActions.queue.slice(1),
        currentAction: action,
      },
    };
    if (action.type === 1) {
      next = {
        ...next,
        tokenCardDeck: {
          ...next.tokenCardDeck,
          resetCount: (next.tokenCardDeck.resetCount + action.param1) | 0,
        },
      };
    } else if (action.type === 8) {
      next = { ...next, tokenCardDeck: { ...next.tokenCardDeck, isAllHandSkill: false } };
    } else if (next.tokenCardDeck.isAllHandSkill) {
      next = {
        ...next,
        tokenCardDeck: {
          ...next.tokenCardDeck,
          resetCount: 0,
          handTargetCounts: {
            ...next.tokenCardDeck.handTargetCounts,
            current:
              (next.tokenCardDeck.handTargetCounts.current + next.tokenCardDeck.resetCount) | 0,
          },
        },
      };
    } else next = resetLivePendingHandCardCount(next, resetHand);
    next = { ...next, deckActions: { ...next.deckActions, currentAction: null } };
  }
  if (
    next.tokenCardDeck.isSwitchDeck ||
    next.tokenCardDeck.isAllHandSkill ||
    next.tokenCardDeck.resetCount === 0
  )
    return next;
  const reset = resetLivePendingHandCardCount(
    { ...next, deckActions: { ...next.deckActions, currentAction: { type: 2 } } },
    resetHand,
  );
  return { ...reset, deckActions: { ...reset.deckActions, currentAction: null } };
}
