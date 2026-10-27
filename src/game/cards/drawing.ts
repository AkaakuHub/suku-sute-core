import { createRangeRandom } from '../random.ts';
import { drawCandidate, drawWeight } from './drawLottery.ts';
import { consumeSearch } from './search.ts';
import { activateHandPermanentEffects, disposeHandEffects } from './handEffects.ts';
import { applyDrawAbility } from './drawAbilities.ts';
import type { Card, GameState, HandShuffle } from '../model.ts';
import { initializeHandCardStats } from './skillCostChanges.ts';
import { activateModeAbilityEffects } from './modeAbility.ts';
import { applyEffect } from '../effects.ts';
import { applyAbilityEffects } from './useAbilities.ts';

export function handCapacity(state: GameState): number {
  if (state.handMaxCardEffects.length > 0) return Math.min(8, state.deck.length);
  const penalty = state.deck.reduce(
    (sum, card) =>
      sum + (state.handEffectCardIds.includes(card.id) ? (card.passive?.handLimitDelta ?? 0) : 0),
    0,
  );
  return Math.max(3, Math.min(8, state.handLimit + penalty));
}

export function fillHand(state: GameState): GameState {
  return drawUntil(state, handCapacity(state), true);
}

export function fillHandToCount(state: GameState, count: number): GameState {
  return drawUntil(state, count, true);
}

export function restoreHandLimitCount(state: GameState, adjustment: number): GameState {
  const target = Math.min(
    state.deck.length,
    Math.max(3, Math.min(8, state.hand.length + adjustment)),
  );
  return fillHandToCountRetainingOverflow(state, target);
}

function fillHandToCountRetainingOverflow(state: GameState, count: number): GameState {
  return drawUntil(state, count, false);
}

export function removeRandomHandCards(state: GameState, count: number): GameState {
  let next = state;
  const removed: string[] = [];
  while (removed.length < count && next.hand.length > 0) {
    const random = createRangeRandom(next.randomSeed);
    const index = Math.floor(random.range(0, next.hand.length));
    const id = next.hand[index];
    if (id === undefined) throw new Error('手札のカードがありません。');
    removed.push(id);
    next = { ...next, randomSeed: random.seed, hand: next.hand.filter((cardId) => cardId !== id) };
  }
  next = disposeHandEffects(next, removed);
  return {
    ...next,
    handCardStats: Object.fromEntries(
      Object.entries(next.handCardStats).filter(([id]) => !removed.includes(id)),
    ),
    discard: [...next.discard, ...removed],
    handHeartCollectCounts: Object.fromEntries(
      Object.entries(next.handHeartCollectCounts).filter(([id]) => !removed.includes(id)),
    ),
  };
}

function drawUntil(state: GameState, count: number, trimOverflow: boolean): GameState {
  let next = state;
  const drawnCards: Card[] = [];

  while (next.hand.length < count) {
    const probability = (id: string) => {
      const card = next.deck.find((item) => item.id === id);
      if (!card) throw new Error('山札のカードがありません。');
      return drawWeight(card, next);
    };
    if (next.drawPile.every((id) => probability(id) === 0)) {
      const returned = [...next.drawPile, ...next.discard];
      if (!returned.length) break;
      next = {
        ...next,
        drawPile: returned,
        discard: [],
        deckOutCount: next.deckOutCount + 1,
      };
    }
    const available = next.deck
      .filter((card) => next.drawPile.includes(card.id))
      .map((card) => card.id);
    const random = createRangeRandom(next.randomSeed);
    const randomIndex = (maximumExclusive: number) => Math.floor(random.range(0, maximumExclusive));
    const searched = consumeSearch(next, randomIndex);
    next = searched.state;
    const drawn =
      searched.selected ??
      drawCandidate(
        available.map((id) => ({
          id,
          weight: probability(id),
        })),
        randomIndex,
      ) ??
      available[randomIndex(available.length)];
    if (!drawn) break;
    next = {
      ...next,
      randomSeed: random.seed,
      hand: [...next.hand, drawn],
      drawPile: next.drawPile.filter((id) => id !== drawn),
      discard: next.discard.filter((id) => id !== drawn),
      relayUsed: next.relayUsed.filter((id) => id !== drawn),
      handHeartCollectCounts: { ...next.handHeartCollectCounts, [drawn]: 0 },
    };
    next = initializeHandCardStats(next, [drawn]);
    const card = next.deck.find((item) => item.id === drawn);
    if (!card) throw new Error('引いたカードがありません。');
    drawnCards.push(card);
  }
  for (const card of drawnCards) {
    if (state.drawContext !== 'initial') next = applyDrawAbility(next, card);
    if (state.drawContext !== 'initial')
      next = applyAbilityEffects(next, card, card.ability893Effects ?? [], applyEffect);
    next = {
      ...next,
      handEffectCardIds: [...next.handEffectCardIds.filter((id) => id !== card.id), card.id],
    };
    next = activateHandPermanentEffects(next, card);
    next = activateModeAbilityEffects(next, card, applyEffect);
  }
  const maximum = handCapacity(next);
  if (trimOverflow && next.hand.length > maximum) {
    const ordered = [...next.hand].sort(
      (left, right) =>
        Number(Boolean(next.deck.find((card) => card.id === right)?.passive)) -
        Number(Boolean(next.deck.find((card) => card.id === left)?.passive)),
    );
    next = {
      ...disposeHandEffects(next, ordered.slice(maximum)),
      hand: ordered.slice(0, maximum),
      handCardStats: Object.fromEntries(
        Object.entries(next.handCardStats).filter(([id]) => ordered.slice(0, maximum).includes(id)),
      ),
      discard: [...next.discard, ...ordered.slice(maximum)],
    };
  }
  return { ...next, drawContext: 'idle' };
}

export function shuffleHand(state: GameState, options: HandShuffle): GameState {
  const withoutHandEffects = disposeHandEffects(state, state.hand);
  const recovered = options.recoverDiscard ? state.discard : [];
  const returned = options.destination === 'draw' ? state.hand : [];
  const returnedIds = [...state.drawPile, ...recovered, ...returned];
  return {
    ...withoutHandEffects,
    hand: [],
    handCardStats: {},
    drawPile: state.deck.filter((card) => returnedIds.includes(card.id)).map((card) => card.id),
    discard: [
      ...(options.recoverDiscard ? [] : state.discard),
      ...(options.destination === 'discard' ? state.hand : []),
    ],
    relayUsed: [],
    handHeartCollectCounts: {},
    drawContext: 'shuffle',
  };
}
