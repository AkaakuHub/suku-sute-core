import { cardSkillUseState } from './skillUseAtBoardState.ts';
import { recoverCurrentDeckGraveyard } from './deckBoard.ts';
import {
  updateLiveCardSkillUseAtBoardState,
  liveBoardState,
} from '../../runtime/cards/deckBoardState.ts';
import type { GameState } from '../model.ts';
import { removeHandCardEffects } from './handEffects.ts';
import { flushDeckActions } from './boardActions.ts';
import { fillHand, handCapacity, removeRandomHandCards } from './drawing.ts';
import { deactivateInducedEffects } from '../effects/effectInduce.ts';

export function finishCardActivation(state: GameState): GameState {
  const activation = state.activation;
  if (!activation) throw new Error('カードの使用処理がありません。');
  const source = state.deck.find((card) => card.cardInstanceId === activation.sourceId);
  if (!source) throw new Error('使用したカードがありません。');
  const children = activation.usedCards.filter((id) => id !== source.cardInstanceId);
  const handStatsCompleted = (activation.pendingHandStatsDeactivationKeys ?? []).reduce(
    (current, key) => deactivateInducedEffects(current, key),
    removeHandCardEffects(state, activation.usedCards),
  );
  let next = activation.recoverDiscard
    ? recoverCurrentDeckGraveyard(handStatsCompleted)
    : handStatsCompleted;
  for (const id of children) {
    next = { ...next, deckBoard: updateLiveCardSkillUseAtBoardState(next.deckBoard, id) };
    if (cardSkillUseState(next, id).boardState === liveBoardState.exclusion)
      next = excludeCards(next, [id]);
  }
  next = flushDeckActions(next);
  const handCountChange = activation.handCountChanges[source.cardInstanceId] ?? 0;
  const handReady: GameState = {
    ...next,
    usedCard: source,
    lastUsedSkillIcon: source.skillIcon ?? null,
    drawContext: 'skill',
  };
  const skipSourceRefill = next.activation?.skipSourceRefill ?? false;
  if (skipSourceRefill) {
    next = { ...handReady, drawContext: 'idle' };
  } else if (handCountChange < 0) {
    const target = Math.min(handCapacity(handReady), handReady.deck.length);
    const removedCount = Math.max(0, handReady.hand.length + 1 - target);
    next = {
      ...removeRandomHandCards(handReady, removedCount),
      drawContext: 'idle',
    };
  } else if (handCapacity(handReady) < handReady.hand.length + 1) {
    next = { ...handReady, drawContext: 'idle' };
  } else {
    next = fillHand(handReady);
  }
  next = {
    ...next,
    deckBoard: updateLiveCardSkillUseAtBoardState(next.deckBoard, source.cardInstanceId),
  };
  if (cardSkillUseState(next, source.cardInstanceId).boardState === liveBoardState.exclusion)
    next = excludeCards(next, [source.cardInstanceId]);
  return { ...next, activation: null };
}

function excludeCards(state: GameState, ids: readonly string[]): GameState {
  return {
    ...state,
    deck: state.deck.filter((card) => !ids.includes(card.cardInstanceId)),
    handCardStats: Object.fromEntries(
      Object.entries(state.handCardStats).filter(([id]) => !ids.includes(id)),
    ),
    parameterValueFactors: state.parameterValueFactors.filter(
      (factor) => !ids.includes(factor.cardId),
    ),
    activeModeParameterChanges: state.activeModeParameterChanges.filter(
      (item) => !ids.includes(item.cardId),
    ),
    hand: state.hand.filter((id) => !ids.includes(id)),
  };
}
