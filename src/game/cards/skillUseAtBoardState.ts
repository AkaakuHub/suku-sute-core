import {
  type LiveBoardState,
  type LiveSkillUseAtBoardState,
  resetLiveSkillUseAtBoardState,
  setLiveSkillUseAtBoardState,
} from '../../runtime/cards/deckBoardState.ts';
import type { GameState } from '../model.ts';

export function cardSkillUseState(state: GameState, cardId: string): LiveSkillUseAtBoardState {
  const card = state.cardSkillUseStates[cardId];
  if (!card) throw new Error('使用後の移動先を持つカードがありません。');
  return card;
}

export function setCardSkillUseAtBoardState(
  state: GameState,
  cardId: string,
  boardState: LiveBoardState,
): GameState {
  const current = cardSkillUseState(state, cardId);
  const updated = setLiveSkillUseAtBoardState(current, boardState);
  return current === updated
    ? state
    : {
        ...state,
        cardSkillUseStates: { ...state.cardSkillUseStates, [cardId]: updated },
      };
}

export function resetCardSkillUseAtBoardStates(
  state: GameState,
  ids: readonly string[],
): GameState {
  const cardSkillUseStates = { ...state.cardSkillUseStates };
  for (const id of ids)
    cardSkillUseStates[id] = resetLiveSkillUseAtBoardState(cardSkillUseState(state, id));
  return { ...state, cardSkillUseStates };
}
