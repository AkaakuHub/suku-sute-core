import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';
import type { LiveTokenCardDeckState } from './tokenCardDeck.ts';
import {
  flushLiveHandCardCountActions,
  type LiveHandCardCountResetHandler,
} from './handCardCountReset.ts';

export type LiveDeckAction = Readonly<{ type: 1; param1: number } | { type: 2 | 6 | 8 }>;

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

export function checkLiveDeckOut<State extends DeckActionState>(
  state: State,
  afterDeckReload: (state: State) => State,
  resetHand: LiveHandCardCountResetHandler<State>,
): State {
  let next: State = {
    ...state,
    deckActions: { ...state.deckActions, queue: [...state.deckActions.queue, { type: 6 }] },
  };
  if (next.deckActions.currentAction !== null || next.tokenCardDeck.isSwitchDeck) return next;
  while (next.deckActions.queue.length > 0) {
    if (next.tokenCardDeck.isSwitchDeck) return next;
    if (next.deckActions.queue[0]?.type !== 6) {
      next = flushLiveHandCardCountActions(next, resetHand);
      if (next.deckActions.queue.length === 0) break;
      if (next.deckActions.queue[0]?.type !== 6) return next;
    }
    const action = next.deckActions.queue[0];
    if (action === undefined) throw new Error('Live deck action is absent');
    next = {
      ...next,
      deckActions: {
        ...next.deckActions,
        queue: next.deckActions.queue.slice(1),
        currentAction: action,
      },
    };
    for (let index = 0; index < next.deckBoard.deckOutCount; index++) {
      next = afterDeckReload(next);
    }
    next = {
      ...next,
      deckBoard: { ...next.deckBoard, deckOutCount: 0 },
      deckActions: { ...next.deckActions, currentAction: null },
    };
  }
  return flushLiveHandCardCountActions(next, resetHand);
}
