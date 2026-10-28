import {
  liveBoardState,
  setLiveCardBoardState,
  type LiveCardIdentifier,
  type LiveDeckBoardState,
} from './deckBoardState.ts';

export type LiveHandState<Id extends LiveCardIdentifier = number> = Readonly<{
  handCards: readonly (Id | null)[];
  handCount: number;
}>;

export type LiveDeckHandsState<Id extends LiveCardIdentifier = number> = Readonly<{
  handCardButtonOrder: readonly number[];
  main: LiveHandState<Id>;
  sub: LiveHandState<Id>;
}>;

type HandOwner<Id extends LiveCardIdentifier> = Readonly<{
  liveHands: LiveDeckHandsState<Id> | null;
  tokenCardDeck: Readonly<{ currentDeck: 'main' | 'sub' }>;
}>;

export function createLiveHandState<Id extends LiveCardIdentifier>(
  handCardInstanceIds: readonly Id[],
): LiveHandState<Id> {
  if (
    handCardInstanceIds.length > 8 ||
    new Set(handCardInstanceIds).size !== handCardInstanceIds.length
  )
    throw new Error('Live hand card instances are invalid');
  return {
    handCards: Array.from({ length: 8 }, (_, index) => handCardInstanceIds[index] ?? null),
    handCount: handCardInstanceIds.length,
  };
}

export function createLiveDeckHandsState<Id extends LiveCardIdentifier>(
  handCardInstanceIds: readonly Id[],
): LiveDeckHandsState<Id> {
  return {
    handCardButtonOrder: Array.from({ length: 8 }, (_, index) => index),
    main: createLiveHandState(handCardInstanceIds),
    sub: createLiveHandState<Id>([]),
  };
}

export function liveHandCardInstanceIds<Id extends LiveCardIdentifier>(
  hand: LiveHandState<Id>,
): readonly Id[] {
  return hand.handCards.filter((cardInstanceId): cardInstanceId is Id => cardInstanceId !== null);
}

export function liveCurrentHandCardInstanceIds<Id extends LiveCardIdentifier>(
  state: HandOwner<Id> & Readonly<{ deckBoard: LiveDeckBoardState<Id> }>,
): readonly Id[] {
  if (state.liveHands === null) throw new Error('Live hand state is unresolved');
  const handIds = new Set(
    state.deckBoard.cards
      .filter((card) => card.boardState === liveBoardState.hand)
      .map((card) => card.cardInstanceId),
  );
  return liveHandCardInstanceIds(state.liveHands[state.tokenCardDeck.currentDeck]).filter((id) =>
    handIds.has(id),
  );
}

export function liveHandCardButtonId<Id extends LiveCardIdentifier>(
  state: HandOwner<Id>,
  cardInstanceId: Id,
): number {
  if (state.liveHands === null) throw new Error('Live hand state is unresolved');
  const index = state.liveHands[state.tokenCardDeck.currentDeck].handCards.indexOf(cardInstanceId);
  const buttonId = index < 0 ? undefined : state.liveHands.handCardButtonOrder[index];
  if (buttonId === undefined) throw new Error('Live hand card button is absent');
  return buttonId;
}

export function removeLiveCurrentHandCard<
  State extends HandOwner<LiveCardIdentifier> &
    Readonly<{ deckBoard: LiveDeckBoardState<LiveCardIdentifier> }>,
>(state: State, index: number, isSlide: boolean): State {
  if (state.liveHands === null) throw new Error('Live hand state is unresolved');
  const hand = state.liveHands[state.tokenCardDeck.currentDeck];
  const cardInstanceId = hand.handCards[index];
  if (cardInstanceId === undefined || cardInstanceId === null)
    throw new Error('Live removed hand slot is empty');
  const card = state.deckBoard.cards.find((item) => item.cardInstanceId === cardInstanceId);
  if (!card) throw new Error('Live removed hand card is absent');
  const handCardButtonOrder = [...state.liveHands.handCardButtonOrder];
  if (isSlide) {
    const buttonId = handCardButtonOrder.splice(index, 1)[0];
    if (buttonId === undefined) throw new Error('Live removed hand card button is absent');
    handCardButtonOrder.push(buttonId);
  }
  return {
    ...state,
    deckBoard:
      card.boardState === liveBoardState.hand
        ? setLiveCardBoardState(state.deckBoard, cardInstanceId, liveBoardState.graveyard)
        : state.deckBoard,
    liveHands: {
      ...state.liveHands,
      handCardButtonOrder,
      [state.tokenCardDeck.currentDeck]: removeLiveHandCard(hand, index, isSlide),
    },
  };
}

export function completeLiveHandCardDraw<
  State extends HandOwner<LiveCardIdentifier> &
    Readonly<{ deckBoard: LiveDeckBoardState<LiveCardIdentifier> }>,
>(
  state: State,
  handCardButtonId: number,
  draw:
    | ((state: State, index: number) => Readonly<{ state: State; drawSucceeded: boolean }>)
    | null,
  removeEffects: (
    state: State,
    cardInstanceId: NonNullable<NonNullable<State['liveHands']>['main']['handCards'][number]>,
  ) => State,
): State {
  if (state.liveHands === null) throw new Error('Live hand state is unresolved');
  const index = state.liveHands.handCardButtonOrder.indexOf(handCardButtonId);
  if (index < 0) throw new Error('Live used hand card button is absent');
  const cardInstanceId = state.liveHands[state.tokenCardDeck.currentDeck].handCards[index];
  if (cardInstanceId === undefined || cardInstanceId === null)
    throw new Error('Live used hand card slot is empty');
  const removed = removeEffects(
    removeLiveCurrentHandCard(state, index, draw === null),
    cardInstanceId,
  );
  if (draw === null) return removed;
  const result = draw(removed, index);
  if (result.drawSucceeded) return result.state;
  const liveHands = result.state.liveHands;
  if (liveHands === null) throw new Error('Live hand state is unresolved after draw');
  const currentHand = liveHands[state.tokenCardDeck.currentDeck];
  const handCards = [...currentHand.handCards];
  handCards.splice(index, 1);
  handCards.push(null);
  const handCardButtonOrder = [...liveHands.handCardButtonOrder];
  const buttonId = handCardButtonOrder.splice(index, 1)[0];
  if (buttonId === undefined) throw new Error('Live used hand card button is absent after draw');
  handCardButtonOrder.push(buttonId);
  return {
    ...result.state,
    liveHands: {
      ...liveHands,
      handCardButtonOrder,
      [state.tokenCardDeck.currentDeck]: { ...currentHand, handCards },
    },
  };
}

export function setLiveCurrentHandCards<State extends HandOwner<LiveCardIdentifier>>(
  state: State,
  handCardInstanceIds: readonly NoInfer<
    NonNullable<NonNullable<State['liveHands']>['main']['handCards'][number]>
  >[],
): State {
  if (state.liveHands === null) throw new Error('Live hand state is unresolved');
  return {
    ...state,
    liveHands: {
      ...state.liveHands,
      [state.tokenCardDeck.currentDeck]: createLiveHandState(handCardInstanceIds),
    },
  };
}

export function addLiveHandCard<Id extends LiveCardIdentifier>(
  hand: LiveHandState<Id>,
  index: number,
  cardInstanceId: Id,
): LiveHandState<Id> {
  validateIndex(index);
  if (hand.handCards[index] !== null || hand.handCards.includes(cardInstanceId))
    throw new Error('Live hand card slot is occupied');
  return {
    handCards: hand.handCards.map((card, slot) => (slot === index ? cardInstanceId : card)),
    handCount: hand.handCount + 1,
  };
}

export function removeLiveHandCard<Id extends LiveCardIdentifier>(
  hand: LiveHandState<Id>,
  index: number,
  isSlide: boolean,
): LiveHandState<Id> {
  validateIndex(index);
  if (hand.handCards[index] === null) throw new Error('Live hand card slot is empty');
  const handCards = [...hand.handCards];
  if (isSlide) {
    handCards.splice(index, 1);
    handCards.push(null);
  } else {
    handCards[index] = null;
  }
  return { handCards, handCount: hand.handCount - 1 };
}

function validateIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > 7)
    throw new Error('Live hand card index is invalid');
}
