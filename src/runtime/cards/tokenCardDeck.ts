import { prepareLiveDeckDraw } from './deckDraw.ts';
import {
  type LiveBoardState,
  type LiveCardIdentifier,
  type LiveDeckBoardState,
  liveBoardState,
  reloadLiveDeckCardInstanceIds,
} from './deckBoardState.ts';

export type LiveTokenCardDeckState<Id extends LiveCardIdentifier = number> = Readonly<{
  initialCardCount: number;
  maxHandSkillActiveCount: number;
  handMaxCardSkillInfo: Readonly<{ targetHandCount: number }> | null;
  currentDeck: 'main' | 'sub';
  subDeckCardInstanceIds: readonly Id[] | null;
  tokenCardSeriesIds: readonly number[] | null;
  handTargetCounts: Readonly<{
    current: number;
    main: number;
    sub: number;
  }>;
}>;

export type LiveTokenCardDeckIdentity<Id extends LiveCardIdentifier = number> = Readonly<{
  cardInstanceId: Id;
  tokenCardSeriesIds: readonly number[];
}>;

export function createLiveTokenCardDeckState<Id extends LiveCardIdentifier = number>(
  initialCardCount: number,
): LiveTokenCardDeckState<Id> {
  validateHandTargetCount(initialCardCount);
  return {
    initialCardCount,
    maxHandSkillActiveCount: 0,
    handMaxCardSkillInfo: null,
    currentDeck: 'main',
    subDeckCardInstanceIds: null,
    tokenCardSeriesIds: null,
    handTargetCounts: { current: initialCardCount, main: initialCardCount, sub: initialCardCount },
  };
}

export function splitLiveTokenCardDeck<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
  cards: readonly LiveTokenCardDeckIdentity<Id>[],
  tokenCardSeriesIds: readonly number[] | null,
): Readonly<{
  state: LiveTokenCardDeckState<Id>;
  deckBoard: LiveDeckBoardState<Id>;
}> {
  validateState(state, deckBoard);
  validateCards(deckBoard, cards);
  if (tokenCardSeriesIds?.some((id) => !Number.isSafeInteger(id))) {
    throw new Error('Live sub deck token CardSeries.Id is invalid');
  }
  if (state.subDeckCardInstanceIds !== null) return { state, deckBoard };
  const mainIds = new Set(liveDeckCardInstanceIds(state, deckBoard, 'main'));
  const subDeckCardInstanceIds = cards.flatMap((card) =>
    mainIds.has(card.cardInstanceId) && liveTokenCardMatchesSeries(card, tokenCardSeriesIds)
      ? [card.cardInstanceId]
      : [],
  );
  const subDeckIds = new Set(subDeckCardInstanceIds);
  return {
    state: {
      ...state,
      currentDeck: 'main',
      subDeckCardInstanceIds,
      tokenCardSeriesIds,
    },
    deckBoard: {
      ...deckBoard,
      cards: deckBoard.cards.map((card) =>
        subDeckIds.has(card.cardInstanceId) ? { ...card, boardState: liveBoardState.deck } : card,
      ),
    },
  };
}

export function switchLiveTokenCardDeck<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
): LiveTokenCardDeckState<Id> {
  validateState(state, deckBoard);
  if (state.subDeckCardInstanceIds === null) return state;
  return {
    ...state,
    currentDeck: state.currentDeck === 'main' ? 'sub' : 'main',
    handTargetCounts: {
      ...state.handTargetCounts,
      [state.currentDeck]: state.handTargetCounts.current,
    },
  };
}

export function liveSwitchDeckHandCardCount<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
): number {
  validateState(state, deckBoard);
  const currentHandCount = liveCurrentDeckBoardCardInstanceIds(
    state,
    deckBoard,
    liveBoardState.hand,
  ).length;
  const previousTargetCount = state.handTargetCounts[state.currentDeck];
  const excess = (currentHandCount - Math.max(previousTargetCount, 3)) | 0;
  const requestedCount = (state.handTargetCounts.current + Math.max(excess, 0)) | 0;
  if (currentHandCount === requestedCount) return currentHandCount;
  return Math.min(
    Math.min(Math.max(requestedCount, 3), 8),
    liveCurrentDeckCardCount(state, deckBoard),
  );
}

export function mergeLiveTokenCardDeck<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
): Readonly<{
  state: LiveTokenCardDeckState<Id>;
  deckBoard: LiveDeckBoardState<Id>;
}> {
  validateState(state, deckBoard);
  if (state.subDeckCardInstanceIds === null) return { state, deckBoard };
  const subDeckIds = new Set(state.subDeckCardInstanceIds);
  return {
    state: {
      ...state,
      currentDeck: 'main',
      subDeckCardInstanceIds: null,
      tokenCardSeriesIds: null,
    },
    deckBoard: {
      ...deckBoard,
      cards: deckBoard.cards.map((card) =>
        subDeckIds.has(card.cardInstanceId) &&
        card.boardState !== liveBoardState.graveyard &&
        card.boardState !== liveBoardState.exclusion
          ? { ...card, boardState: liveBoardState.deck }
          : card,
      ),
    },
  };
}

export function liveTokenCardMatchesSeries(
  card: Pick<LiveTokenCardDeckIdentity<LiveCardIdentifier>, 'tokenCardSeriesIds'>,
  seriesIds: readonly number[] | null,
): boolean {
  return seriesIds !== null && card.tokenCardSeriesIds.some((id) => seriesIds.includes(id));
}

export function addLiveTokenCardDeckCard<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  card: LiveTokenCardDeckIdentity<Id>,
): LiveTokenCardDeckState<Id> {
  const cardInstanceId = card.cardInstanceId;
  if (
    typeof cardInstanceId === 'number'
      ? !Number.isSafeInteger(cardInstanceId) || cardInstanceId < 1
      : cardInstanceId.length === 0
  ) {
    throw new Error('Live sub deck card instance ID is invalid');
  }
  if (state.subDeckCardInstanceIds === null) return state;
  if (!liveTokenCardMatchesSeries(card, state.tokenCardSeriesIds)) return state;
  if (state.subDeckCardInstanceIds.includes(cardInstanceId)) {
    throw new Error('Live sub deck card instance ID is duplicated');
  }
  return {
    ...state,
    subDeckCardInstanceIds: [...state.subDeckCardInstanceIds, cardInstanceId],
  };
}

export function liveCurrentDeckBoardCardInstanceIds<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
  boardState: LiveBoardState,
): readonly Id[] {
  validateState(state, deckBoard);
  const subDeckIds = new Set(state.subDeckCardInstanceIds ?? []);
  return deckBoard.cards.flatMap((card) => {
    const belongsToCurrentDeck =
      state.currentDeck === 'sub'
        ? subDeckIds.has(card.cardInstanceId)
        : !subDeckIds.has(card.cardInstanceId);
    return belongsToCurrentDeck &&
      card.boardState !== liveBoardState.exclusion &&
      card.boardState === boardState
      ? [card.cardInstanceId]
      : [];
  });
}

export function liveCurrentDeckCardCount<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
): number {
  validateState(state, deckBoard);
  return liveDeckCardInstanceIds(state, deckBoard, state.currentDeck).length;
}

export function prepareLiveCurrentDeckDraw<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
  drawProbability: (cardInstanceId: Id) => number,
): LiveDeckBoardState<Id> {
  validateState(state, deckBoard);
  return prepareLiveDeckDraw(
    deckBoard,
    liveDeckCardInstanceIds(state, deckBoard, state.currentDeck),
    drawProbability,
  );
}

export function reloadLiveCurrentDeckCards<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
): LiveDeckBoardState<Id> {
  validateState(state, deckBoard);
  return reloadLiveDeckCardInstanceIds(
    deckBoard,
    liveCurrentDeckBoardCardInstanceIds(state, deckBoard, liveBoardState.graveyard),
  );
}

export function moveLiveCurrentDeckHandCardsToBoardState<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
  handCardInstanceIds: readonly Id[],
  boardState: Extract<LiveBoardState, (typeof liveBoardState)['deck' | 'graveyard']>,
): LiveDeckBoardState<Id> {
  validateState(state, deckBoard);
  const currentHandIds = liveCurrentDeckBoardCardInstanceIds(state, deckBoard, liveBoardState.hand);
  if (
    new Set(handCardInstanceIds).size !== handCardInstanceIds.length ||
    handCardInstanceIds.length !== currentHandIds.length ||
    handCardInstanceIds.some((cardInstanceId) => !currentHandIds.includes(cardInstanceId))
  ) {
    throw new Error('Live current deck hand cards are invalid');
  }
  const handIds = new Set(handCardInstanceIds);
  return {
    ...deckBoard,
    cards: deckBoard.cards.map((card) =>
      handIds.has(card.cardInstanceId) ? { ...card, boardState } : card,
    ),
  };
}

export function moveLiveCurrentDeckHandCardToBoardState<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
  cardInstanceId: Id,
  boardState: Extract<LiveBoardState, (typeof liveBoardState)['deck' | 'graveyard']>,
): LiveDeckBoardState<Id> {
  validateState(state, deckBoard);
  if (
    !liveCurrentDeckBoardCardInstanceIds(state, deckBoard, liveBoardState.hand).includes(
      cardInstanceId,
    )
  ) {
    throw new Error('Live current deck hand card is invalid');
  }
  return {
    ...deckBoard,
    cards: deckBoard.cards.map((card) =>
      card.cardInstanceId === cardInstanceId ? { ...card, boardState } : card,
    ),
  };
}

export function liveDeckCardInstanceIds<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
  deck: 'main' | 'sub',
): readonly Id[] {
  const subDeckIds = new Set(state.subDeckCardInstanceIds ?? []);
  return deckBoard.cards.flatMap((card) =>
    card.boardState !== liveBoardState.exclusion &&
    (deck === 'sub') === subDeckIds.has(card.cardInstanceId)
      ? [card.cardInstanceId]
      : [],
  );
}

function validateState<Id extends LiveCardIdentifier>(
  state: LiveTokenCardDeckState<Id>,
  deckBoard: LiveDeckBoardState<Id>,
): void {
  if (state.subDeckCardInstanceIds === null && state.tokenCardSeriesIds !== null)
    throw new Error('Live sub deck token series are inconsistent');
  if (state.currentDeck === 'sub' && state.subDeckCardInstanceIds === null) {
    throw new Error('Live current sub deck is absent');
  }
  validateHandTargetCount(state.initialCardCount);
  validateHandTargetCount(state.handTargetCounts.current);
  validateHandTargetCount(state.handTargetCounts.main);
  validateHandTargetCount(state.handTargetCounts.sub);
  if (state.subDeckCardInstanceIds === null) return;
  const boardIds = new Set(deckBoard.cards.map((card) => card.cardInstanceId));
  if (
    new Set(state.subDeckCardInstanceIds).size !== state.subDeckCardInstanceIds.length ||
    state.subDeckCardInstanceIds.some((cardInstanceId) => !boardIds.has(cardInstanceId))
  ) {
    throw new Error('Live sub deck cards are invalid');
  }
}

function validateHandTargetCount(handTargetCount: number): void {
  if (!Number.isInteger(handTargetCount) || (handTargetCount | 0) !== handTargetCount) {
    throw new Error('Live sub deck hand target count is invalid');
  }
}

function validateCards<Id extends LiveCardIdentifier>(
  deckBoard: LiveDeckBoardState<Id>,
  cards: readonly LiveTokenCardDeckIdentity<Id>[],
): void {
  const boardIds = deckBoard.cards.map((card) => card.cardInstanceId);
  if (
    deckBoard.cards.some(
      (card) =>
        card.boardState !== liveBoardState.exclusion &&
        !cards.some((identity) => identity.cardInstanceId === card.cardInstanceId),
    ) ||
    new Set(cards.map((card) => card.cardInstanceId)).size !== cards.length ||
    cards.some(
      (card) =>
        !boardIds.includes(card.cardInstanceId) ||
        new Set(card.tokenCardSeriesIds).size !== card.tokenCardSeriesIds.length ||
        card.tokenCardSeriesIds.some((seriesId) => !Number.isSafeInteger(seriesId)),
    )
  ) {
    throw new Error('Live sub deck card identities are invalid');
  }
}
