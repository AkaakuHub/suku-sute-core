import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';

export type LiveDeckAction = Readonly<{ type: 6 }>;

export type LiveDeckActionQueueState = Readonly<{
  queue: readonly LiveDeckAction[];
  currentAction: LiveDeckAction | null;
}>;

type DeckActionState = Readonly<{
  deckBoard: LiveDeckBoardState<LiveCardIdentifier>;
  deckActions: LiveDeckActionQueueState;
}>;

export function createLiveDeckActionQueueState(): LiveDeckActionQueueState {
  return { queue: [], currentAction: null };
}

export function checkLiveDeckOut<State extends DeckActionState>(
  state: State,
  afterDeckReload: (state: State) => State,
): State {
  let next: State = {
    ...state,
    deckActions: { ...state.deckActions, queue: [...state.deckActions.queue, { type: 6 }] },
  };
  if (next.deckActions.currentAction !== null) return next;
  while (next.deckActions.queue.length > 0) {
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
  return next;
}
