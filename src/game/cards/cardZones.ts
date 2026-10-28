import type { GameState } from '../model.ts';
import { removeHandCardEffects } from './handEffects.ts';
import { flushDeckActions } from './boardActions.ts';
import { fillHand, handCapacity, removeRandomHandCards } from './drawing.ts';
import { deactivateInducedEffects } from '../effects/effectInduce.ts';

export function finishCardActivation(state: GameState): GameState {
  const activation = state.activation;
  if (!activation) throw new Error('カードの使用処理がありません。');
  const source = state.deck.find((card) => card.id === activation.sourceId);
  if (!source) throw new Error('使用したカードがありません。');
  const children = activation.usedCards.filter((id) => id !== source.id);
  const excludedIds = new Set([
    ...activation.excluded,
    ...activation.usedCards.filter((id) => state.skillUseDestinations[id] === 'exclusion'),
  ]);
  const proxyIds = new Set(
    activation.usedCards.filter((id) => state.skillUseDestinations[id] === 'proxy'),
  );
  const returnToDrawIds = new Set([
    ...activation.returnToDraw,
    ...activation.usedCards.filter((id) => state.skillUseDestinations[id] === 'deck'),
  ]);
  const handStatsCompleted = (activation.pendingHandStatsDeactivationKeys ?? []).reduce(
    (current, key) => deactivateInducedEffects(current, key),
    removeHandCardEffects(state, activation.usedCards),
  );
  let next = excludeCards(
    handStatsCompleted,
    [...excludedIds].filter((id) => id !== source.id),
  );
  const activeChildren = children.filter((id) => next.deck.some((card) => card.id === id));
  next = {
    ...next,
    drawPile: [
      ...next.drawPile,
      ...(activation.recoverDiscard ? next.discard : []),
      ...activeChildren.filter((id) => returnToDrawIds.has(id)),
    ],
    discard: [
      ...(activation.recoverDiscard ? [] : next.discard),
      ...activeChildren.filter((id) => !returnToDrawIds.has(id)),
    ],
  };
  next = flushDeckActions(next);
  if (proxyIds.size > 0) {
    next = {
      ...next,
      hand: next.hand.filter((id) => !proxyIds.has(id)),
      drawPile: next.drawPile.filter((id) => !proxyIds.has(id)),
      discard: next.discard.filter((id) => !proxyIds.has(id)),
      proxyCards: [...new Set([...next.proxyCards, ...proxyIds])],
    };
  }
  const handCountChange = activation.handCountChanges[source.id] ?? 0;
  const handReady: GameState = {
    ...next,
    lastUsedMember: source.member,
    lastUsedUnit: source.unit,
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
  next = proxyIds.has(source.id)
    ? next
    : excludedIds.has(source.id)
      ? excludeCards(next, [source.id])
      : returnToDrawIds.has(source.id)
        ? { ...next, drawPile: [...next.drawPile, source.id] }
        : { ...next, discard: [...next.discard, source.id] };
  const completed = {
    ...next,
    skillUseDestinations: Object.fromEntries(
      Object.entries(next.skillUseDestinations).filter(
        ([id]) => !activation.usedCards.includes(id),
      ),
    ),
    activation: null,
  };
  return completed;
}

function excludeCards(state: GameState, ids: readonly string[]): GameState {
  return {
    ...state,
    deck: state.deck.filter((card) => !ids.includes(card.id)),
    handCardStats: Object.fromEntries(
      Object.entries(state.handCardStats).filter(([id]) => !ids.includes(id)),
    ),
    parameterValueFactors: state.parameterValueFactors.filter(
      (factor) => !ids.includes(factor.cardId),
    ),
    activeModeParameterChanges: state.activeModeParameterChanges.filter(
      (item) => !ids.includes(item.cardId),
    ),
    proxyCards: state.proxyCards.filter((id) => !ids.includes(id)),
    skillUseDestinations: Object.fromEntries(
      Object.entries(state.skillUseDestinations).filter(([id]) => !ids.includes(id)),
    ),
    hand: state.hand.filter((id) => !ids.includes(id)),
    drawPile: state.drawPile.filter((id) => !ids.includes(id)),
    discard: state.discard.filter((id) => !ids.includes(id)),
  };
}
