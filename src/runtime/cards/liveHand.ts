import type { LiveCardIdentifier } from './deckBoardState.ts';

export type LiveHandState<Id extends LiveCardIdentifier = number> = Readonly<{
  handCards: readonly (Id | null)[];
  handCount: number;
}>;

export type LiveDeckHandsState<Id extends LiveCardIdentifier = number> = Readonly<{
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
  return { main: createLiveHandState(handCardInstanceIds), sub: createLiveHandState<Id>([]) };
}

export function liveHandCardInstanceIds<Id extends LiveCardIdentifier>(
  hand: LiveHandState<Id>,
): readonly Id[] {
  return hand.handCards.filter((cardInstanceId): cardInstanceId is Id => cardInstanceId !== null);
}

export function liveCurrentHandCardInstanceIds<Id extends LiveCardIdentifier>(
  state: HandOwner<Id>,
): readonly Id[] {
  if (state.liveHands === null) throw new Error('Live hand state is unresolved');
  return liveHandCardInstanceIds(state.liveHands[state.tokenCardDeck.currentDeck]);
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
