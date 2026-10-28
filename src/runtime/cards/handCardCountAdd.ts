import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';
import type { LiveDeckActionQueueState } from './deckActionQueue.ts';
import { addLiveSavedHandCardTargetCount } from './handCardTarget.ts';
import type { LiveDeckHandsState } from './liveHand.ts';
import { createLiveDeckDrawContextState, type LiveDeckDrawContextState } from './cardDraw.ts';
import { liveCurrentDeckCardCount, type LiveTokenCardDeckState } from './tokenCardDeck.ts';

type HandCountNotificationState = Readonly<{
  tokenCardDeck: LiveTokenCardDeckState<LiveCardIdentifier>;
  deckActions: LiveDeckActionQueueState;
}>;

export function notifyLiveHandCardCountAdd<State extends HandCountNotificationState>(
  state: State,
  amount: number,
): State {
  if (!Number.isInteger(amount) || (amount | 0) !== amount)
    throw new Error('Live hand count addition is invalid');
  return {
    ...state,
    tokenCardDeck: addLiveSavedHandCardTargetCount(state.tokenCardDeck, amount),
    deckActions: {
      ...state.deckActions,
      queue: [...state.deckActions.queue, { type: 0, param1: amount }],
    },
  };
}

export function addLiveHandCardCount<
  State extends Readonly<{
    tokenCardDeck: LiveTokenCardDeckState<LiveCardIdentifier>;
    deckBoard: LiveDeckBoardState<LiveCardIdentifier>;
    liveHands: LiveDeckHandsState<LiveCardIdentifier> | null;
    deckDrawContext: LiveDeckDrawContextState;
  }>,
>(state: State, amount: number, setHandCount: (state: State, count: number) => State): State {
  if (state.liveHands === null)
    throw new Error('Live hand state is unresolved during count addition');
  const previousTarget = state.tokenCardDeck.handTargetCounts.current;
  const handCount = state.liveHands[state.tokenCardDeck.currentDeck].handCount;
  const maximumActive = state.tokenCardDeck.maxHandSkillActiveCount > 0;
  const target = maximumActive ? 8 : (previousTarget + amount) | 0;
  const excess = Math.max(0, (handCount - Math.max(previousTarget, 3)) | 0);
  const requested = maximumActive ? 8 : (target + excess) | 0;
  const next = {
    ...state,
    tokenCardDeck: {
      ...state.tokenCardDeck,
      handTargetCounts: { ...state.tokenCardDeck.handTargetCounts, current: target },
    },
    deckDrawContext: createLiveDeckDrawContextState(3),
  };
  return setHandCount(
    next,
    Math.min(
      liveCurrentDeckCardCount(next.tokenCardDeck, next.deckBoard),
      Math.max(3, Math.min(8, requested)),
    ),
  );
}
