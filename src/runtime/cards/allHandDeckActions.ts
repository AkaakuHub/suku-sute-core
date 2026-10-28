import type { LiveCardIdentifier } from './deckBoardState.ts';
import type { LiveDeckAction, LiveDeckActionQueueState } from './deckActionQueue.ts';
import type { LiveTokenCardDeckState } from './tokenCardDeck.ts';

type AllHandRuntime = Readonly<{
  tokenCardDeck: LiveTokenCardDeckState<LiveCardIdentifier>;
  deckActions: LiveDeckActionQueueState;
}>;

type DrawAllHandAction = Extract<LiveDeckAction, { type: 7 }>;

export function beginLiveAllHandSkill<State extends AllHandRuntime>(state: State): State {
  return {
    ...state,
    tokenCardDeck: { ...state.tokenCardDeck, isAllHandSkill: true, allHandSkillDeckReload: false },
  };
}

export function enqueueLiveAllHandDraw<State extends AllHandRuntime>(
  state: State,
  card: DrawAllHandAction['card'],
): State {
  return {
    ...state,
    deckActions: {
      ...state.deckActions,
      queue: [...state.deckActions.queue, { type: 7, card }, { type: 8 }],
    },
  };
}

export function executeLiveAllHandDraw<State extends AllHandRuntime>(
  state: State,
  draw: (state: State, card: DrawAllHandAction['card']) => State,
): State {
  const action = state.deckActions.queue[0];
  if (
    action?.type !== 7 ||
    state.deckActions.currentAction !== null ||
    state.tokenCardDeck.isSwitchDeck
  ) {
    throw new Error('Live DrawAllHand action is not ready');
  }
  const drawn = draw(
    {
      ...state,
      deckActions: {
        ...state.deckActions,
        currentAction: action,
        queue: state.deckActions.queue.slice(1),
      },
    },
    action.card,
  );
  return { ...drawn, deckActions: { ...drawn.deckActions, currentAction: null } };
}
