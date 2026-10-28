import { selectLiveDeckDrawCandidate } from '../../runtime/cards/cardDraw.ts';
import { prepareLiveDeckDraw } from '../../runtime/cards/deckDraw.ts';
import {
  boardCardIds,
  currentDeckCardIds,
  moveCardsToBoard,
  recoverCurrentDeckGraveyard,
} from './deckBoard.ts';
import { liveBoardState } from '../../runtime/cards/deckBoardState.ts';
import { createRangeRandom } from '../random.ts';
import { drawWeight } from './drawLottery.ts';
import { consumeSearch } from './search.ts';
import { activateHandPermanentEffects, removeHandCardEffects } from './handEffects.ts';
import { applyDrawAbility } from './drawAbilities.ts';
import type { Card, GameState, HandShuffle } from '../model.ts';
import { initializeHandCardStats } from './handCardStats.ts';
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
  next = removeHandCardEffects(next, removed);
  return {
    ...next,
    deckBoard: moveCardsToBoard(next, removed, liveBoardState.graveyard).deckBoard,
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
    next = {
      ...next,
      deckBoard: prepareLiveDeckDraw(next.deckBoard, currentDeckCardIds(next), probability),
    };
    const deckIds = new Set(boardCardIds(next, liveBoardState.deck));
    const available = next.deck.filter((card) => deckIds.has(card.id)).map((card) => card.id);
    const random = createRangeRandom(next.randomSeed);
    const randomIndex = (maximumExclusive: number) => Math.floor(random.range(0, maximumExclusive));
    const searched = consumeSearch(next);
    next = searched.state;
    const candidate = (cardInstanceId: string) => ({
      cardInstanceId,
      drawProbability: probability(cardInstanceId),
    });
    const drawn = selectLiveDeckDrawCandidate(
      available.map(candidate),
      searched.cardInstanceIds.map(candidate),
      randomIndex,
    )?.cardInstanceId;
    if (!drawn) break;
    next = {
      ...next,
      randomSeed: random.seed,
      hand: [...next.hand, drawn],
      deckBoard: moveCardsToBoard(next, [drawn], liveBoardState.hand).deckBoard,
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
      ...removeHandCardEffects(next, ordered.slice(maximum)),
      hand: ordered.slice(0, maximum),
      deckBoard: moveCardsToBoard(next, ordered.slice(maximum), liveBoardState.graveyard).deckBoard,
    };
  }
  return { ...next, drawContext: 'idle' };
}

export function shuffleHand(state: GameState, options: HandShuffle): GameState {
  let next = removeHandCardEffects(state, state.hand);
  if (options.recoverDiscard) next = recoverCurrentDeckGraveyard(next);
  next = moveCardsToBoard(
    next,
    state.hand,
    options.destination === 'draw' ? liveBoardState.deck : liveBoardState.graveyard,
  );
  return { ...next, hand: [], relayUsed: [], handHeartCollectCounts: {}, drawContext: 'shuffle' };
}
