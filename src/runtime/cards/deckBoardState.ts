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

export type LiveDeckBoardCard = Readonly<
  LiveSkillUseAtBoardState & {
    cardInstanceId: number;
    cardDatasId: number;
    boardState: LiveBoardState;
  }
>;

export type LiveDeckCardSearchParam = Readonly<{
  searchType: 'skill-main-effect' | 'character-id' | 'unit-id' | 'token-card-series';
  searchId: number;
}>;

export type LiveDeckBoardState = Readonly<{
  cards: readonly LiveDeckBoardCard[];
  nextCardInstanceId: number;
  deckOutCount: number;
  skillCardSearchParams: readonly LiveDeckCardSearchParam[];
}>;

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
    skillCardSearchParams: [],
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

export function registerLiveSkillCardSearchParam(
  state: LiveDeckBoardState,
  param: LiveDeckCardSearchParam,
): LiveDeckBoardState {
  validateCardSearchParam(param);
  return {
    ...state,
    skillCardSearchParams: [...state.skillCardSearchParams, param],
  };
}

export function removeLiveSkillCardSearchParam(
  state: LiveDeckBoardState,
  param: LiveDeckCardSearchParam,
): LiveDeckBoardState {
  validateCardSearchParam(param);
  const index = state.skillCardSearchParams.findIndex(
    (current) => current.searchType === param.searchType && current.searchId === param.searchId,
  );
  if (index < 0) {
    throw new Error('Live skill card search param is not registered');
  }
  return {
    ...state,
    skillCardSearchParams: [
      ...state.skillCardSearchParams.slice(0, index),
      ...state.skillCardSearchParams.slice(index + 1),
    ],
  };
}

export function resetLiveCardSearchParams(state: LiveDeckBoardState): LiveDeckBoardState {
  return { ...state, skillCardSearchParams: [] };
}

export function moveLiveHandCardToGraveyard(
  state: LiveDeckBoardState,
  cardInstanceId: number,
): LiveDeckBoardState {
  return updateLiveCardSkillUseAtBoardState(
    moveLiveHandCardToExtra(state, cardInstanceId),
    cardInstanceId,
  );
}

export function moveLiveHandCardToExtra(
  state: LiveDeckBoardState,
  cardInstanceId: number,
): LiveDeckBoardState {
  return moveCard(state, cardInstanceId, liveBoardState.hand, liveBoardState.extra);
}

export function moveLiveHandCardToExtra2(
  state: LiveDeckBoardState,
  cardInstanceId: number,
): LiveDeckBoardState {
  return moveCard(state, cardInstanceId, liveBoardState.hand, liveBoardState.extra2);
}

export function moveLiveHandCardsToBoardState(
  state: LiveDeckBoardState,
  handCardInstanceIds: readonly number[],
  boardState: Extract<LiveBoardState, (typeof liveBoardState)['deck' | 'graveyard']>,
): LiveDeckBoardState {
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

export function setLiveCardSkillUseAtBoardState(
  state: LiveDeckBoardState,
  cardInstanceId: number,
  skillUseAtBoardState: LiveBoardState,
): LiveDeckBoardState {
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

export function updateLiveCardSkillUseAtBoardState(
  state: LiveDeckBoardState,
  cardInstanceId: number,
): LiveDeckBoardState {
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

export function prepareLiveDeckDraw(state: LiveDeckBoardState): LiveDeckBoardState {
  if (liveDeckBoardCardInstanceIds(state, liveBoardState.deck).length > 0) {
    return state;
  }
  const hasGraveyard = liveDeckBoardCardInstanceIds(state, liveBoardState.graveyard).length > 0;
  if (!hasGraveyard) return state;
  return reloadLiveDeckCards(state);
}

export function reloadLiveDeckCards(state: LiveDeckBoardState): LiveDeckBoardState {
  const hasGraveyard = state.cards.some((card) => card.boardState === liveBoardState.graveyard);
  if (!hasGraveyard) return state;
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.boardState === liveBoardState.graveyard
        ? { ...card, boardState: liveBoardState.deck }
        : card,
    ),
    deckOutCount: state.deckOutCount + 1,
  };
}

export function moveLiveDeckCardToHand(
  state: LiveDeckBoardState,
  cardInstanceId: number,
): LiveDeckBoardState {
  return moveCard(state, cardInstanceId, liveBoardState.deck, liveBoardState.hand);
}

export function liveDeckBoardCardInstanceIds(
  state: LiveDeckBoardState,
  boardState: LiveBoardState,
): readonly number[] {
  return state.cards.flatMap((card) =>
    card.boardState === boardState ? [card.cardInstanceId] : [],
  );
}

function moveCard(
  state: LiveDeckBoardState,
  cardInstanceId: number,
  from: LiveBoardState,
  to: LiveBoardState,
): LiveDeckBoardState {
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

function requireCard(state: LiveDeckBoardState, cardInstanceId: number): LiveDeckBoardCard {
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

function validateCardSearchParam(param: LiveDeckCardSearchParam): void {
  if (!Number.isSafeInteger(param.searchId) || param.searchId < 1) {
    throw new Error('Live skill card search param is invalid');
  }
}
