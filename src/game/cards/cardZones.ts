import { liveCurrentHandCardInstanceIds } from '../../runtime/cards/liveHand.ts';
import { setLiveCurrentHandCards } from '../../runtime/cards/liveHand.ts';
import {
  enqueueLiveAllHandDraw,
  executeLiveAllHandDraw,
} from '../../runtime/cards/allHandDeckActions.ts';
import { liveCurrentDeckCardCount } from '../../runtime/cards/tokenCardDeck.ts';
import { enqueueLiveCardSearchReset } from '../../runtime/cards/deckActionQueue.ts';
import { completeDeckOutChecks } from '../effects/deckOutCheck.ts';
import { applyEffect } from '../effects.ts';
import { cardSkillUseState } from './skillUseAtBoardState.ts';
import { recoverCurrentDeckGraveyard } from './deckBoard.ts';
import {
  updateLiveCardSkillUseAtBoardState,
  liveBoardState,
} from '../../runtime/cards/deckBoardState.ts';
import type { GameState } from '../model.ts';
import { removeHandCardEffects } from './handEffects.ts';
import { flushDeckActions } from './boardActions.ts';
import {
  fillHand,
  flushHandCardCountActions,
  fillHandToCountRetainingOverflow,
  handCapacity,
  removeRandomHandCards,
  shuffleHand,
} from './drawing.ts';
import { deactivateInducedEffects } from '../effects/effectInduce.ts';

export function finishCardActivation(state: GameState): GameState {
  const activation = state.activation;
  if (!activation) throw new Error('カードの使用処理がありません。');
  const source = state.deck.find((card) => card.cardInstanceId === activation.sourceId);
  if (!source) throw new Error('使用したカードがありません。');
  if (activation.hasUseAllHandSkill) return finishAllHandActivation(state, source);
  let next = completeUsedCards(state, source.cardInstanceId);
  next = flushDeckActions(next);
  const handCountChange = activation.handCountChanges[source.cardInstanceId] ?? 0;
  const handReady: GameState = {
    ...next,

    deckDrawContext: {
      currentDrawType: 1 as const,
      usedCard: source,
      usedSkill: { skillType: 2 as const, skillMainEffect: source.skillMainEffect ?? null },
    },
  };
  const skipSourceRefill = next.activation?.skipSourceRefill ?? false;
  if (skipSourceRefill) {
    next = handReady;
  } else if (handCountChange < 0) {
    const target = Math.min(handCapacity(handReady), handReady.deck.length);
    const removedCount = Math.max(0, liveCurrentHandCardInstanceIds(handReady).length + 1 - target);
    next = {
      ...removeRandomHandCards(handReady, removedCount),
    };
  } else if (handCapacity(handReady) < liveCurrentHandCardInstanceIds(handReady).length + 1) {
    next = handReady;
  } else {
    next = fillHand(handReady);
  }
  next = {
    ...next,
    deckBoard: updateLiveCardSkillUseAtBoardState(next.deckBoard, source.cardInstanceId),
  };
  if (cardSkillUseState(next, source.cardInstanceId).boardState === liveBoardState.exclusion)
    next = excludeCards(next, [source.cardInstanceId]);
  return flushHandCardCountActions(enqueueLiveCardSearchReset({ ...next, activation: null }));
}

function completeUsedCards(state: GameState, sourceId: string): GameState {
  const activation = state.activation;
  if (!activation) throw new Error('カードの使用処理がありません。');
  const children = activation.usedCards.filter((id) => id !== sourceId);
  const handStatsCompleted = (activation.pendingHandStatsDeactivationKeys ?? []).reduce(
    (current, key) => deactivateInducedEffects(current, key),
    removeHandCardEffects(state, activation.usedCards),
  );
  let next = handStatsCompleted;
  for (const id of children) {
    next = { ...next, deckBoard: updateLiveCardSkillUseAtBoardState(next.deckBoard, id) };
    if (cardSkillUseState(next, id).boardState === liveBoardState.exclusion)
      next = excludeCards(next, [id]);
  }
  return next;
}

function finishAllHandActivation(state: GameState, source: GameState['deck'][number]): GameState {
  const queued = enqueueLiveCardSearchReset(
    enqueueLiveAllHandDraw(flushDeckActions(state), source),
  );
  const ready = completeDeckOutChecks(queued, applyEffect);
  const drawn = executeLiveAllHandDraw(ready, (current, card) => {
    let next = current.tokenCardDeck.allHandSkillDeckReload
      ? recoverCurrentDeckGraveyard(current)
      : current;
    next = {
      ...next,
      deckDrawContext: { currentDrawType: 1 as const, usedCard: card, usedSkill: null },
    };
    const target = Math.min(
      handCapacity(next),
      liveCurrentDeckCardCount(next.tokenCardDeck, next.deckBoard),
    );
    next = completeUsedCards(next, source.cardInstanceId);
    next = shuffleHand(next, { recoverDiscard: false, destination: 'discard' });
    next = fillHandToCountRetainingOverflow(
      {
        ...next,
        deckDrawContext: { currentDrawType: 1 as const, usedCard: card, usedSkill: null },
      },
      target,
    );
    next = {
      ...next,
      deckBoard: updateLiveCardSkillUseAtBoardState(next.deckBoard, source.cardInstanceId),
    };
    return cardSkillUseState(next, source.cardInstanceId).boardState === liveBoardState.exclusion
      ? excludeCards(next, [source.cardInstanceId])
      : next;
  });
  return { ...completeDeckOutChecks(drawn, applyEffect), activation: null };
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
    liveHands: setLiveCurrentHandCards(
      state,
      liveCurrentHandCardInstanceIds(state).filter((id) => !ids.includes(id)),
    ).liveHands,
  };
}
