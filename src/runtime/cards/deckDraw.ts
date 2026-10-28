import {
  type LiveCardIdentifier,
  type LiveDeckBoardState,
  liveBoardState,
  reloadLiveDeckCardInstanceIds,
} from './deckBoardState.ts';

export function prepareLiveDeckDraw<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  cardInstanceIds: readonly Id[],
  drawProbability: (cardInstanceId: Id) => number,
): LiveDeckBoardState<Id> {
  const ids = new Set(cardInstanceIds);
  const cards = state.cards.filter((card) => ids.has(card.cardInstanceId));
  const deck = cards.filter((card) => card.boardState === liveBoardState.deck);
  if (!deck.every((card) => drawProbability(card.cardInstanceId) === 0)) return state;
  const graveyard = cards.filter((card) => card.boardState === liveBoardState.graveyard);
  const reloaded = reloadLiveDeckCardInstanceIds(
    state,
    graveyard.map((card) => card.cardInstanceId),
  );
  if (deck.length + graveyard.length === 0) return reloaded;
  return { ...reloaded, deckOutCount: (reloaded.deckOutCount + 1) | 0 };
}
