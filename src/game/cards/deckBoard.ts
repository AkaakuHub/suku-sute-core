import {
  liveDeckCardInstanceIds,
  liveCurrentDeckBoardCardInstanceIds,
  reloadLiveCurrentDeckCards,
} from '../../runtime/cards/tokenCardDeck.ts';
import {
  type LiveBoardState,
  type LiveDeckBoardState,
  liveBoardState,
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
  return liveDeckCardInstanceIds(
    state.tokenCardDeck,
    state.deckBoard,
    state.tokenCardDeck.currentDeck,
  );
}

export function boardCardIds(state: GameState, boardState: LiveBoardState): readonly string[] {
  return liveCurrentDeckBoardCardInstanceIds(state.tokenCardDeck, state.deckBoard, boardState);
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
    deckBoard: reloadLiveCurrentDeckCards(state.tokenCardDeck, state.deckBoard),
  };
}
