import { createLiveCardSearchState, type LiveCardSearchState } from './cardSearchState.ts';
export const liveBoardState = {
  deck: 1,
  hand: 2,
  graveyard: 3,
  exclusion: 4,
  extra: 5,
  extra2: 6,
  proxy: 7,
} as const;

export type LiveBoardState = (typeof liveBoardState)[keyof typeof liveBoardState];

export type LiveSkillUseAtBoardState = Readonly<{
  skillUseAtBoardState: LiveBoardState;
}>;

export type LiveCardIdentifier = number | string;

export type LiveDeckBoardCard<Id extends LiveCardIdentifier = number> = Readonly<
  LiveSkillUseAtBoardState & {
    cardInstanceId: Id;
    cardDatasId: Id;
    boardState: LiveBoardState;
  }
>;

export type LiveDeckBoardState<Id extends LiveCardIdentifier = number> = Readonly<
  LiveCardSearchState<Id> & {
    cards: readonly LiveDeckBoardCard<Id>[];
    nextCardInstanceId: number;
    deckOutCount: number;
  }
>;

export function createLiveDeckBoardState(
  deckCardDatasIds: readonly number[],
  handCardDatasIds: readonly number[],
): LiveDeckBoardState {
  validateDeckCards(deckCardDatasIds);
  validateHandCards(deckCardDatasIds, handCardDatasIds);
  const hand = new Set(handCardDatasIds);
  const nextCardInstanceId = Math.max(...deckCardDatasIds) + 1;
  validateCardInstanceId(nextCardInstanceId);
  return {
    cards: deckCardDatasIds.map((cardDatasId) => ({
      cardInstanceId: cardDatasId,
      cardDatasId,
      boardState: hand.has(cardDatasId) ? liveBoardState.hand : liveBoardState.deck,
      skillUseAtBoardState: liveBoardState.graveyard,
    })),
    nextCardInstanceId,
    deckOutCount: 0,
    ...createLiveCardSearchState(),
  };
}

export function addLiveDeckBoardCard(
  state: LiveDeckBoardState,
  cardDatasId: number,
): Readonly<{
  state: LiveDeckBoardState;
  cardInstanceId: number;
}> {
  validateCardDatasId(cardDatasId);
  validateCardInstanceId(state.nextCardInstanceId);
  const cardInstanceId = state.nextCardInstanceId;
  return {
    state: {
      ...state,
      cards: [
        ...state.cards,
        {
          cardInstanceId,
          cardDatasId,
          boardState: liveBoardState.deck,
          skillUseAtBoardState: liveBoardState.graveyard,
        },
      ],
      nextCardInstanceId: cardInstanceId + 1,
    },
    cardInstanceId,
  };
}

export function moveLiveHandCardToGraveyard<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  return updateLiveCardSkillUseAtBoardState(
    moveLiveHandCardToExtra(state, cardInstanceId),
    cardInstanceId,
  );
}

export function moveLiveHandCardToExtra<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  return moveCard(state, cardInstanceId, liveBoardState.hand, liveBoardState.extra);
}

export function moveLiveHandCardToExtra2<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  return moveCard(state, cardInstanceId, liveBoardState.hand, liveBoardState.extra2);
}

export function moveLiveHandCardsToBoardState<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  handCardInstanceIds: readonly Id[],
  boardState: Extract<LiveBoardState, (typeof liveBoardState)['deck' | 'graveyard']>,
): LiveDeckBoardState<Id> {
  const currentHandCardInstanceIds = liveDeckBoardCardInstanceIds(state, liveBoardState.hand);
  if (
    new Set(handCardInstanceIds).size !== handCardInstanceIds.length ||
    new Set(handCardInstanceIds).size !== new Set(currentHandCardInstanceIds).size ||
    handCardInstanceIds.some(
      (cardInstanceId) => !currentHandCardInstanceIds.includes(cardInstanceId),
    )
  ) {
    throw new Error('Live hand board cards do not match runtime hand');
  }
  let next = state;
  for (const cardInstanceId of [...handCardInstanceIds].reverse()) {
    next = moveCard(next, cardInstanceId, liveBoardState.hand, boardState);
  }
  return next;
}

export function setLiveCardSkillUseAtBoardState<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
  skillUseAtBoardState: LiveBoardState,
): LiveDeckBoardState<Id> {
  const card = requireCard(state, cardInstanceId);
  const updated = setLiveSkillUseAtBoardState(card, skillUseAtBoardState);
  if (updated === card) return state;
  return {
    ...state,
    cards: state.cards.map((entry) => (entry === card ? updated : entry)),
  };
}

export function setLiveSkillUseAtBoardState<T extends LiveSkillUseAtBoardState>(
  state: T,
  skillUseAtBoardState: LiveBoardState,
): Omit<T, 'skillUseAtBoardState'> & LiveSkillUseAtBoardState {
  const current = state.skillUseAtBoardState;
  if (
    skillUseAtBoardState !== liveBoardState.proxy &&
    (current === liveBoardState.proxy ||
      current === liveBoardState.exclusion ||
      (current === liveBoardState.deck && skillUseAtBoardState === liveBoardState.graveyard))
  )
    return state;
  return { ...state, skillUseAtBoardState };
}

export function resetLiveSkillUseAtBoardState<T extends LiveSkillUseAtBoardState>(
  state: T,
): Omit<T, 'skillUseAtBoardState'> & LiveSkillUseAtBoardState {
  return { ...state, skillUseAtBoardState: liveBoardState.graveyard };
}

export function updateLiveCardSkillUseAtBoardState<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  const card = requireCard(state, cardInstanceId);
  const canMove =
    card.skillUseAtBoardState !== liveBoardState.proxy ||
    card.boardState === liveBoardState.extra ||
    card.boardState === liveBoardState.extra2;
  return {
    ...state,
    cards: state.cards.map((entry) =>
      entry.cardInstanceId === cardInstanceId
        ? {
            ...resetLiveSkillUseAtBoardState(entry),
            boardState: canMove ? entry.skillUseAtBoardState : entry.boardState,
          }
        : entry,
    ),
  };
}

export function reloadLiveDeckCards<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
): LiveDeckBoardState<Id> {
  return reloadLiveDeckCardInstanceIds(
    state,
    liveDeckBoardCardInstanceIds(state, liveBoardState.graveyard),
  );
}

export function moveLiveDeckCardToHand<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardState<Id> {
  return moveCard(state, cardInstanceId, liveBoardState.deck, liveBoardState.hand);
}

export function liveDeckBoardCardInstanceIds<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  boardState: LiveBoardState,
): readonly Id[] {
  return state.cards.flatMap((card) =>
    card.boardState === boardState ? [card.cardInstanceId] : [],
  );
}

function moveCard<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
  from: LiveBoardState,
  to: LiveBoardState,
): LiveDeckBoardState<Id> {
  const card = requireCard(state, cardInstanceId);
  if (card.boardState !== from) {
    throw new Error('Live card board state transition is invalid');
  }
  return {
    ...state,
    cards: state.cards.map((current) =>
      current.cardInstanceId === cardInstanceId ? { ...current, boardState: to } : current,
    ),
  };
}

function requireCard<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
): LiveDeckBoardCard<Id> {
  const card = state.cards.find((current) => current.cardInstanceId === cardInstanceId);
  if (card === undefined) {
    throw new Error('Live card board state transition is invalid');
  }
  return card;
}

function validateDeckCards(deckCardDatasIds: readonly number[]): void {
  if (
    deckCardDatasIds.length === 0 ||
    new Set(deckCardDatasIds).size !== deckCardDatasIds.length ||
    deckCardDatasIds.some((cardDatasId) => !isCardIdentifier(cardDatasId))
  ) {
    throw new Error('Live deck board cards are invalid');
  }
}

function validateCardDatasId(cardDatasId: number): void {
  if (!isCardIdentifier(cardDatasId)) {
    throw new Error('Live CardDatasId is invalid');
  }
}

function validateCardInstanceId(cardInstanceId: number): void {
  if (!isCardIdentifier(cardInstanceId)) {
    throw new Error('Live card instance ID is invalid');
  }
}

function isCardIdentifier(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function validateHandCards(
  deckCardDatasIds: readonly number[],
  handCardDatasIds: readonly number[],
): void {
  if (
    new Set(handCardDatasIds).size !== handCardDatasIds.length ||
    handCardDatasIds.some((cardDatasId) => !deckCardDatasIds.includes(cardDatasId))
  ) {
    throw new Error('Live hand board cards are invalid');
  }
}

export function setLiveCardBoardState<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
  boardState: LiveBoardState,
): LiveDeckBoardState<Id> {
  const card = requireCard(state, cardInstanceId);
  return {
    ...state,
    cards: state.cards.map((entry) => (entry === card ? { ...entry, boardState } : entry)),
  };
}

export function reloadLiveDeckCardInstanceIds<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceIds: readonly Id[],
): LiveDeckBoardState<Id> {
  for (const id of cardInstanceIds) {
    if (requireCard(state, id).boardState !== liveBoardState.graveyard)
      throw new Error('Live reloaded card is not in graveyard');
  }
  if (cardInstanceIds.length === 0) return state;
  const ids = new Set(cardInstanceIds);
  return {
    ...state,
    cards: state.cards.map((card) =>
      ids.has(card.cardInstanceId) ? { ...card, boardState: liveBoardState.deck } : card,
    ),
  };
}
