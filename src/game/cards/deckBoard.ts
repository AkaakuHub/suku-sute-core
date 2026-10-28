import {
  type LiveBoardState,
  type LiveDeckBoardState,
  liveBoardState,
  reloadLiveDeckCardInstanceIds,
  setLiveCardBoardState,
} from '../../runtime/cards/deckBoardState.ts';
import type { Card, GameState } from '../model.ts';

export function createCardDeckBoard(
  cards: readonly Card[],
  hand: readonly string[],
): LiveDeckBoardState<string> {
  return {
    cards: cards.map((card) => ({
      cardInstanceId: card.cardInstanceId,
      cardDatasId: card.cardDatasId,
      boardState: hand.includes(card.cardInstanceId) ? liveBoardState.hand : liveBoardState.deck,
      skillUseAtBoardState: liveBoardState.graveyard,
    })),
    nextCardInstanceId: 1,
    deckOutCount: 0,
    skillCardSearchParams: [],
  };
}

export function currentDeckCardIds(state: GameState): readonly string[] {
  const split = state.tokenDeckSplit;
  return state.deck.flatMap((card) =>
    split === null ||
    split.subDeckCardInstanceIds.includes(card.cardInstanceId) === (split.active === 'sub')
      ? [card.cardInstanceId]
      : [],
  );
}

export function boardCardIds(state: GameState, boardState: LiveBoardState): readonly string[] {
  const ids = new Set(currentDeckCardIds(state));
  return state.deckBoard.cards.flatMap((card) =>
    ids.has(card.cardInstanceId) && card.boardState === boardState ? [card.cardInstanceId] : [],
  );
}

export function moveCardsToBoard(
  state: GameState,
  ids: readonly string[],
  boardState: LiveBoardState,
): GameState {
  let deckBoard = state.deckBoard;
  for (const id of ids) deckBoard = setLiveCardBoardState(deckBoard, id, boardState);
  return { ...state, deckBoard };
}

export function recoverCurrentDeckGraveyard(state: GameState): GameState {
  return {
    ...state,
    deckBoard: reloadLiveDeckCardInstanceIds(
      state.deckBoard,
      boardCardIds(state, liveBoardState.graveyard),
    ),
  };
}
