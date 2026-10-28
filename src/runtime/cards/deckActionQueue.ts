import { applyLiveAllHandSkillReshuffle, type LiveReshuffleDeckAction } from './reshuffle.ts';
import { resetLiveCardSearchParams } from './cardSearchState.ts';
import type { LiveCardIdentity } from './cardIdentity.ts';
import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';
import type { LiveTokenCardDeckState } from './tokenCardDeck.ts';
import {
  resetLivePendingHandCardCount,
  type LiveHandCardCountResetHandler,
} from './handCardCountReset.ts';

export type LiveDeckAction = Readonly<
  | { type: 1; param1: number }
  | ({ type: 3 } & LiveReshuffleDeckAction<LiveCardIdentifier | null>)
  | { type: 2 | 5 | 6 | 8 }
  | { type: 7; card: LiveCardIdentity & Readonly<{ cardInstanceId: LiveCardIdentifier }> }
>;

export type LiveDeckActionQueueState = Readonly<{
  queue: readonly LiveDeckAction[];
  currentAction: LiveDeckAction | null;
}>;

type DeckActionState = Readonly<{
  deckBoard: LiveDeckBoardState<LiveCardIdentifier>;
  deckActions: LiveDeckActionQueueState;
  tokenCardDeck: LiveTokenCardDeckState<LiveCardIdentifier>;
}>;

export function createLiveDeckActionQueueState(): LiveDeckActionQueueState {
  return { queue: [], currentAction: null };
}

export function enqueueLiveCardSearchReset<
  State extends Readonly<{ deckActions: LiveDeckActionQueueState }>,
>(state: State): State {
  return {
    ...state,
    deckActions: { ...state.deckActions, queue: [...state.deckActions.queue, { type: 5 }] },
  };
}

export type LiveDeckActionHandlers<State> = Readonly<{
  reshuffle?: Readonly<{
    activeHandCardInstanceIds: (state: State) => readonly LiveCardIdentifier[];
    draw: (state: State, action: LiveReshuffleDeckAction<LiveCardIdentifier | null>) => State;
  }>;
  afterDeckReload?: (state: State) => State;
}>;

export function enqueueLiveReshuffle<
  State extends Readonly<{ deckActions: LiveDeckActionQueueState }>,
>(state: State, action: LiveReshuffleDeckAction<LiveCardIdentifier | null>): State {
  return {
    ...state,
    deckActions: {
      ...state.deckActions,
      queue: [...state.deckActions.queue, { type: 3, ...action }],
    },
  };
}

export function checkLiveDeckOut<State extends DeckActionState>(
  state: State,
  afterDeckReload: (state: State) => State,
  resetHand: LiveHandCardCountResetHandler<State>,
): State {
  return flushLiveDeckActions(
    {
      ...state,
      deckActions: { ...state.deckActions, queue: [...state.deckActions.queue, { type: 6 }] },
    },
    resetHand,
    { afterDeckReload },
  );
}

export function flushLiveDeckActions<State extends DeckActionState>(
  state: State,
  resetHand: LiveHandCardCountResetHandler<State>,
  handlers: LiveDeckActionHandlers<State> = {},
): State {
  if (state.deckActions.currentAction !== null || state.tokenCardDeck.isSwitchDeck) return state;
  let next = state;
  while (next.deckActions.queue.length > 0) {
    if (next.tokenCardDeck.isSwitchDeck) return next;
    const action = next.deckActions.queue[0];
    if (
      !action ||
      action.type === 7 ||
      (action.type === 3 && !handlers.reshuffle) ||
      (action.type === 6 && !handlers.afterDeckReload)
    )
      return next;
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
    } else if (action.type === 3) {
      const reshuffle = handlers.reshuffle;
      if (!reshuffle) throw new Error('Live reshuffle handler is absent');
      if (next.tokenCardDeck.isAllHandSkill) {
        const changed = applyLiveAllHandSkillReshuffle(
          next.deckBoard,
          next.tokenCardDeck,
          reshuffle.activeHandCardInstanceIds(next),
          action,
        );
        next = { ...next, deckBoard: changed.deckBoard, tokenCardDeck: changed.state };
      } else next = reshuffle.draw(next, action);
    } else if (action.type === 6) {
      const afterDeckReload = handlers.afterDeckReload;
      if (!afterDeckReload) throw new Error('Live deck reload handler is absent');
      for (let index = 0; index < next.deckBoard.deckOutCount; index++)
        next = afterDeckReload(next);
      next = { ...next, deckBoard: { ...next.deckBoard, deckOutCount: 0 } };
    } else if (action.type === 5) {
      next = { ...next, deckBoard: resetLiveCardSearchParams(next.deckBoard) };
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
