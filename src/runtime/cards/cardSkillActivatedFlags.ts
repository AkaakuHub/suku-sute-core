import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';
import type { LiveDeckHandsState } from './liveHand.ts';
import type { LiveTokenCardDeckState } from './tokenCardDeck.ts';

export type LiveCardSkillActivatedFlags = Readonly<{
  skillReshuffleActivated: boolean;
  skillChangeHandCardCountActivated: boolean;
  skillChangeHandCardCountIsPositive: boolean;
}>;

export function createLiveCardSkillActivatedFlags(): LiveCardSkillActivatedFlags {
  return {
    skillReshuffleActivated: false,
    skillChangeHandCardCountActivated: false,
    skillChangeHandCardCountIsPositive: false,
  };
}

export function liveCardSkillActivatedFlags<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveCardSkillActivatedFlags {
  const card = state.cards.find((entry) => entry.cardInstanceId === cardInstanceId);
  if (!card) throw new Error('Live skill source card is absent');
  return card;
}

export function clearLiveCardSkillActivatedFlags<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  return updateFlags(state, cardInstanceId, createLiveCardSkillActivatedFlags());
}

export function markLiveCardReshuffleActivated<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  return updateFlags(state, cardInstanceId, {
    ...liveCardSkillActivatedFlags(state, cardInstanceId),
    skillReshuffleActivated: true,
  });
}

export function markLiveCardHandCountActivated<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
  effectAmount: number,
): LiveDeckBoardState<Id> {
  if (effectAmount === 0) return state;
  return updateFlags(state, cardInstanceId, {
    ...liveCardSkillActivatedFlags(state, cardInstanceId),
    skillChangeHandCardCountActivated: true,
    skillChangeHandCardCountIsPositive: effectAmount >= 0,
  });
}

export function liveCardSkipsHandCardDraw<Id extends LiveCardIdentifier>(
  state: Readonly<{
    deckBoard: LiveDeckBoardState<Id>;
    liveHands: LiveDeckHandsState<Id> | null;
    tokenCardDeck: LiveTokenCardDeckState<Id>;
  }>,
  cardInstanceId: Id,
): boolean {
  const flags = liveCardSkillActivatedFlags(state.deckBoard, cardInstanceId);
  if (state.liveHands === null) throw new Error('Live hand is unresolved during skill draw');
  const count = state.liveHands[state.tokenCardDeck.currentDeck].handCount;
  return (
    flags.skillReshuffleActivated ||
    (flags.skillChangeHandCardCountActivated && !flags.skillChangeHandCardCountIsPositive) ||
    (count > state.tokenCardDeck.handTargetCounts.current && count > 3)
  );
}

function updateFlags<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
  flags: LiveCardSkillActivatedFlags,
): LiveDeckBoardState<Id> {
  liveCardSkillActivatedFlags(state, cardInstanceId);
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.cardInstanceId === cardInstanceId ? { ...card, ...flags } : card,
    ),
  };
}
