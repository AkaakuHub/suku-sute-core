import type { LiveReshuffleEffect } from './deckActionTypes.ts';
import {
  type LiveDeckBoardState,
  liveBoardState,
  setLiveCardSkillUseAtBoardState,
} from './deckBoardState.ts';

export type LiveReshuffleDeckAction = Readonly<{
  effect: LiveReshuffleEffect;
  cardInstanceId: number;
  skillMainEffect: number;
}>;

export function applyLiveAllHandSkillReshuffle(
  state: LiveDeckBoardState,
  handCardInstanceIds: readonly number[],
  action: LiveReshuffleDeckAction,
): LiveDeckBoardState {
  if (action.effect.stashType !== 'deck') return state;
  return handCardInstanceIds.reduce(
    (current, id) =>
      id === action.cardInstanceId
        ? current
        : setLiveCardSkillUseAtBoardState(current, id, liveBoardState.deck),
    state,
  );
}
