import { prepareLiveDeckDraw } from './deckDraw.ts';
import {
  type LiveBoardState,
  type LiveDeckBoardState,
  liveBoardState,
  reloadLiveDeckCardInstanceIds,
} from './deckBoardState.ts';

export type LiveTokenCardDeckState = Readonly<{
  currentDeck: 'main' | 'sub';
  subDeckCardInstanceIds: readonly number[] | null;
  handTargetCounts: Readonly<{
    current: number;
    main: number;
    sub: number;
  }> | null;
}>;

export type LiveTokenCardDeckIdentity = Readonly<{
  cardInstanceId: number;
  tokenCardSeriesIds: readonly number[];
}>;

export function createLiveTokenCardDeckState(): LiveTokenCardDeckState {
  return {
    currentDeck: 'main',
    subDeckCardInstanceIds: null,
    handTargetCounts: null,
  };
}

export function splitLiveTokenCardDeck(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
  cards: readonly LiveTokenCardDeckIdentity[],
  tokenCardSeriesId: number,
  handTargetCount: number,
): Readonly<{
  state: LiveTokenCardDeckState;
  deckBoard: LiveDeckBoardState;
}> {
  validateState(state, deckBoard);
  validateCards(deckBoard, cards);
  if (!Number.isSafeInteger(tokenCardSeriesId) || tokenCardSeriesId < 1) {
    throw new Error('Live sub deck token CardSeries.Id is invalid');
  }
  validateHandTargetCount(handTargetCount);
  if (state.subDeckCardInstanceIds !== null) return { state, deckBoard };
  const subDeckCardInstanceIds = cards.flatMap((card) =>
    card.tokenCardSeriesIds.includes(tokenCardSeriesId) ? [card.cardInstanceId] : [],
  );
  const subDeckIds = new Set(subDeckCardInstanceIds);
  return {
    state: {
      currentDeck: 'main',
      subDeckCardInstanceIds,
      handTargetCounts: {
        current: handTargetCount,
        main: handTargetCount,
        sub: 0,
      },
    },
    deckBoard: {
      ...deckBoard,
      cards: deckBoard.cards.map((card) =>
        subDeckIds.has(card.cardInstanceId) ? { ...card, boardState: liveBoardState.deck } : card,
      ),
    },
  };
}

export function switchLiveTokenCardDeck(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
): LiveTokenCardDeckState {
  validateState(state, deckBoard);
  if (state.subDeckCardInstanceIds === null) return state;
  if (state.handTargetCounts === null) {
    throw new Error('Live sub deck hand target counts are absent');
  }
  return reconcileLiveTokenCardDeckHandTarget(
    {
      ...state,
      currentDeck: state.currentDeck === 'main' ? 'sub' : 'main',
    },
    deckBoard,
  );
}

export function reconcileLiveTokenCardDeckHandTarget(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
): LiveTokenCardDeckState {
  validateState(state, deckBoard);
  if (state.handTargetCounts === null) return state;
  const currentHandCount = liveCurrentDeckBoardCardInstanceIds(
    state,
    deckBoard,
    liveBoardState.hand,
  ).length;
  const previousTargetCount = state.handTargetCounts[state.currentDeck];
  const requestedTargetCount = Math.min(
    Math.max(
      state.handTargetCounts.current +
        Math.max(currentHandCount - Math.max(previousTargetCount, 3), 0),
      3,
    ),
    8,
  );
  const nextDeckCardCount = liveDeckCardInstanceIds(state, deckBoard, state.currentDeck).length;
  const nextTargetCount = Math.min(requestedTargetCount, nextDeckCardCount);
  return {
    ...state,
    handTargetCounts: {
      ...state.handTargetCounts,
      current: nextTargetCount,
      [state.currentDeck]: nextTargetCount,
    },
  };
}

export function mergeLiveTokenCardDeck(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
): Readonly<{
  state: LiveTokenCardDeckState;
  deckBoard: LiveDeckBoardState;
}> {
  validateState(state, deckBoard);
  if (state.subDeckCardInstanceIds === null) return { state, deckBoard };
  const subDeckIds = new Set(state.subDeckCardInstanceIds);
  return {
    state: createLiveTokenCardDeckState(),
    deckBoard: {
      ...deckBoard,
      cards: deckBoard.cards.map((card) =>
        subDeckIds.has(card.cardInstanceId) && card.boardState !== liveBoardState.graveyard
          ? { ...card, boardState: liveBoardState.deck }
          : card,
      ),
    },
  };
}

export function addLiveCurrentDeckCard(
  state: LiveTokenCardDeckState,
  cardInstanceId: number,
): LiveTokenCardDeckState {
  if (!Number.isSafeInteger(cardInstanceId) || cardInstanceId < 1) {
    throw new Error('Live sub deck card instance ID is invalid');
  }
  if (state.currentDeck === 'main') return state;
  if (state.subDeckCardInstanceIds === null) {
    throw new Error('Live current sub deck is absent');
  }
  if (state.subDeckCardInstanceIds.includes(cardInstanceId)) {
    throw new Error('Live sub deck card instance ID is duplicated');
  }
  return {
    ...state,
    subDeckCardInstanceIds: [...state.subDeckCardInstanceIds, cardInstanceId],
  };
}

export function liveCurrentDeckBoardCardInstanceIds(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
  boardState: LiveBoardState,
): readonly number[] {
  validateState(state, deckBoard);
  const subDeckIds = new Set(state.subDeckCardInstanceIds ?? []);
  return deckBoard.cards.flatMap((card) => {
    const belongsToCurrentDeck =
      state.currentDeck === 'sub'
        ? subDeckIds.has(card.cardInstanceId)
        : !subDeckIds.has(card.cardInstanceId);
    return belongsToCurrentDeck && card.boardState === boardState ? [card.cardInstanceId] : [];
  });
}

export function liveCurrentDeckCardCount(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
): number {
  validateState(state, deckBoard);
  return liveDeckCardInstanceIds(state, deckBoard, state.currentDeck).length;
}

export function prepareLiveCurrentDeckDraw(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
  drawProbability: (cardInstanceId: number) => number,
): LiveDeckBoardState {
  validateState(state, deckBoard);
  return prepareLiveDeckDraw(
    deckBoard,
    liveDeckCardInstanceIds(state, deckBoard, state.currentDeck),
    drawProbability,
  );
}

export function reloadLiveCurrentDeckCards(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
): LiveDeckBoardState {
  validateState(state, deckBoard);
  return reloadLiveDeckCardInstanceIds(
    deckBoard,
    liveCurrentDeckBoardCardInstanceIds(state, deckBoard, liveBoardState.graveyard),
  );
}

export function moveLiveCurrentDeckHandCardsToBoardState(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
  handCardInstanceIds: readonly number[],
  boardState: Extract<LiveBoardState, (typeof liveBoardState)['deck' | 'graveyard']>,
): LiveDeckBoardState {
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

export function moveLiveCurrentDeckHandCardToBoardState(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
  cardInstanceId: number,
  boardState: Extract<LiveBoardState, (typeof liveBoardState)['deck' | 'graveyard']>,
): LiveDeckBoardState {
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

function liveDeckCardInstanceIds(
  state: LiveTokenCardDeckState,
  deckBoard: LiveDeckBoardState,
  deck: 'main' | 'sub',
): readonly number[] {
  const subDeckIds = new Set(state.subDeckCardInstanceIds ?? []);
  return deckBoard.cards.flatMap((card) =>
    (deck === 'sub') === subDeckIds.has(card.cardInstanceId) ? [card.cardInstanceId] : [],
  );
}

function validateState(state: LiveTokenCardDeckState, deckBoard: LiveDeckBoardState): void {
  if (state.currentDeck === 'sub' && state.subDeckCardInstanceIds === null) {
    throw new Error('Live current sub deck is absent');
  }
  if ((state.subDeckCardInstanceIds === null) !== (state.handTargetCounts === null)) {
    throw new Error('Live sub deck hand target counts are invalid');
  }
  if (state.handTargetCounts !== null) {
    validateHandTargetCount(state.handTargetCounts.current);
    validateHandTargetCount(state.handTargetCounts.main);
    validateHandTargetCount(state.handTargetCounts.sub);
  }
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
  if (!Number.isSafeInteger(handTargetCount) || handTargetCount < 0 || handTargetCount > 8) {
    throw new Error('Live sub deck hand target count is invalid');
  }
}

function validateCards(
  deckBoard: LiveDeckBoardState,
  cards: readonly LiveTokenCardDeckIdentity[],
): void {
  const boardIds = deckBoard.cards.map((card) => card.cardInstanceId);
  if (
    cards.length !== boardIds.length ||
    new Set(cards.map((card) => card.cardInstanceId)).size !== cards.length ||
    cards.some(
      (card) =>
        !boardIds.includes(card.cardInstanceId) ||
        new Set(card.tokenCardSeriesIds).size !== card.tokenCardSeriesIds.length ||
        card.tokenCardSeriesIds.some((seriesId) => !Number.isSafeInteger(seriesId) || seriesId < 1),
    )
  ) {
    throw new Error('Live sub deck card identities are invalid');
  }
}
