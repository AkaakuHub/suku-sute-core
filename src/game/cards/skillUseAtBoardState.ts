import {
  type LiveBoardState,
  type LiveDeckBoardCard,
  setLiveCardSkillUseAtBoardState,
} from '../../runtime/cards/deckBoardState.ts';
import type { GameState } from '../model.ts';

export function cardSkillUseState(state: GameState, cardId: string): LiveDeckBoardCard<string> {
  const card = state.deckBoard.cards.find((entry) => entry.cardInstanceId === cardId);
  if (!card) throw new Error('盤面のカードがありません。');
  return card;
}

export function setCardSkillUseAtBoardState(
  state: GameState,
  cardId: string,
  boardState: LiveBoardState,
): GameState {
  return {
    ...state,
    deckBoard: setLiveCardSkillUseAtBoardState(state.deckBoard, cardId, boardState),
  };
}
