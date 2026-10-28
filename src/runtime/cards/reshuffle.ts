import type { LiveSkillIdentity } from './cardIdentity.ts';
import type { LiveTokenCardDeckState } from './tokenCardDeck.ts';
import type { LiveReshuffleEffect } from './deckActionTypes.ts';
import {
  type LiveDeckBoardState,
  type LiveCardIdentifier,
  liveBoardState,
  setLiveCardSkillUseAtBoardState,
} from './deckBoardState.ts';

export type LiveReshuffleDeckAction<Id extends LiveCardIdentifier | null = number> = Readonly<{
  effect: Pick<LiveReshuffleEffect, 'recoveryType' | 'stashType'>;
  cardInstanceId: Id;
  usedSkill: LiveSkillIdentity | null;
  countDeckOut: boolean;
}>;

export function applyLiveAllHandSkillReshuffle<Id extends LiveCardIdentifier>(
  deckBoard: LiveDeckBoardState<Id>,
  tokenCardDeck: LiveTokenCardDeckState<Id>,
  handCardInstanceIds: readonly Id[],
  action: LiveReshuffleDeckAction<Id | null>,
): Readonly<{ deckBoard: LiveDeckBoardState<Id>; state: LiveTokenCardDeckState<Id> }> {
  const state = {
    ...tokenCardDeck,
    allHandSkillDeckReload:
      tokenCardDeck.allHandSkillDeckReload || action.effect.recoveryType === 'recovery',
  };
  return {
    state,
    deckBoard:
      action.effect.stashType !== 'deck'
        ? deckBoard
        : handCardInstanceIds.reduce(
            (current, id) =>
              id === action.cardInstanceId
                ? current
                : setLiveCardSkillUseAtBoardState(current, id, liveBoardState.deck),
            deckBoard,
          ),
  };
}
