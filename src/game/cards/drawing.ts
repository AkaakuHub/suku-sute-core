import { liveCurrentHandCardInstanceIds } from '../../runtime/cards/liveHand.ts';
import {
  addLiveHandCard,
  removeLiveHandCard,
  setLiveCurrentHandCards,
} from '../../runtime/cards/liveHand.ts';
import { createLiveDeckDrawContextState } from '../../runtime/cards/cardDraw.ts';
import { flushLiveDeckActions } from '../../runtime/cards/deckActionQueue.ts';
import { liveResetHandCardCount } from '../../runtime/cards/handCardCountReset.ts';
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
  const penalty = state.deck.reduce(
    (sum, card) =>
      sum +
      (state.handEffectCardIds.includes(card.cardInstanceId)
        ? (card.passive?.handLimitDelta ?? 0)
        : 0),
    0,
  );
  return Math.max(3, Math.min(8, state.tokenCardDeck.handTargetCounts.current + penalty));
}

export function fillHand(state: GameState): GameState {
  return drawUntil(state, handCapacity(state), true).state;
}

export function refillHand(
  state: GameState,
  index: number,
): Readonly<{ state: GameState; drawSucceeded: boolean }> {
  return drawUntil(state, handCapacity(state), true, index);
}

export function fillHandToCount(state: GameState, count: number): GameState {
  return drawUntil(state, count, true).state;
}

export function flushHandCardCountActions(state: GameState): GameState {
  return flushLiveDeckActions(state, resetHandCardCount);
}

export function resetHandCardCount(state: GameState, adjustment: number): GameState {
  const next: GameState = {
    ...state,
    deckDrawContext: createLiveDeckDrawContextState(3),
  };
  return adjustment > 0
    ? fillHandToCountRetainingOverflow(
        next,
        liveResetHandCardCount(
          next,
          next.liveHands[next.tokenCardDeck.currentDeck].handCount,
          adjustment,
        ),
      )
    : next;
}

export function fillHandToCountRetainingOverflow(state: GameState, count: number): GameState {
  return drawUntil(state, count, false).state;
}

export function removeRandomHandCards(state: GameState, count: number): GameState {
  let next = state;
  const removed: string[] = [];
  while (removed.length < count && liveCurrentHandCardInstanceIds(next).length > 0) {
    const random = createRangeRandom(next.randomSeed);
    const index = Math.floor(random.range(0, liveCurrentHandCardInstanceIds(next).length));
    const id = liveCurrentHandCardInstanceIds(next)[index];
    if (id === undefined) throw new Error('手札のカードがありません。');
    removed.push(id);
    next = {
      ...next,
      randomSeed: random.seed,
      liveHands: {
        ...next.liveHands,
        [next.tokenCardDeck.currentDeck]: removeLiveHandCard(
          next.liveHands[next.tokenCardDeck.currentDeck],
          index,
          true,
        ),
      },
    };
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

function drawUntil(
  state: GameState,
  count: number,
  trimOverflow: boolean,
  firstDrawIndex?: number,
): Readonly<{ state: GameState; drawSucceeded: boolean }> {
  let next = state;
  const drawnCards: Card[] = [];

  while (next.liveHands[next.tokenCardDeck.currentDeck].handCount < count) {
    const probability = (id: string) => {
      const card = next.deck.find((item) => item.cardInstanceId === id);
      if (!card) throw new Error('山札のカードがありません。');
      return drawWeight(card, next);
    };
    next = {
      ...next,
      deckBoard: prepareLiveDeckDraw(next.deckBoard, currentDeckCardIds(next), probability),
    };
    const deckIds = new Set(boardCardIds(next, liveBoardState.deck));
    const available = next.deck
      .filter((card) => deckIds.has(card.cardInstanceId))
      .map((card) => card.cardInstanceId);
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
      liveHands: {
        ...next.liveHands,
        [next.tokenCardDeck.currentDeck]: addLiveHandCard(
          next.liveHands[next.tokenCardDeck.currentDeck],
          drawnCards.length === 0 && firstDrawIndex !== undefined
            ? firstDrawIndex
            : next.liveHands[next.tokenCardDeck.currentDeck].handCount,
          drawn,
        ),
      },
      deckBoard: moveCardsToBoard(next, [drawn], liveBoardState.hand).deckBoard,
      relayUsed: next.relayUsed.filter((id) => id !== drawn),
      handHeartCollectCounts: { ...next.handHeartCollectCounts, [drawn]: 0 },
    };
    next = initializeHandCardStats(next, [drawn]);
    const card = next.deck.find((item) => item.cardInstanceId === drawn);
    if (!card) throw new Error('引いたカードがありません。');
    drawnCards.push(card);
  }
  if (state.deckDrawContext.currentDrawType === 2)
    return { state: next, drawSucceeded: drawnCards.length > 0 };
  for (const card of drawnCards) {
    if (state.deckDrawContext.currentDrawType !== 0) next = applyDrawAbility(next, card);
    if (state.deckDrawContext.currentDrawType !== 0)
      next = applyAbilityEffects(next, card, card.ability893Effects ?? [], applyEffect);
    next = {
      ...next,
      handEffectCardIds: [
        ...next.handEffectCardIds.filter((id) => id !== card.cardInstanceId),
        card.cardInstanceId,
      ],
    };
    next = activateHandPermanentEffects(next, card);
    next = activateModeAbilityEffects(next, card, applyEffect);
  }
  const maximum = handCapacity(next);
  if (trimOverflow && liveCurrentHandCardInstanceIds(next).length > maximum) {
    const ordered = [...liveCurrentHandCardInstanceIds(next)].sort(
      (left, right) =>
        Number(Boolean(next.deck.find((card) => card.cardInstanceId === right)?.passive)) -
        Number(Boolean(next.deck.find((card) => card.cardInstanceId === left)?.passive)),
    );
    const removed = ordered.slice(maximum);
    next = removeHandCardEffects(next, removed);
    for (const id of removed) {
      const hand = next.liveHands[next.tokenCardDeck.currentDeck];
      next = {
        ...next,
        liveHands: {
          ...next.liveHands,
          [next.tokenCardDeck.currentDeck]: removeLiveHandCard(
            hand,
            hand.handCards.indexOf(id),
            true,
          ),
        },
      };
    }
    next = moveCardsToBoard(next, removed, liveBoardState.graveyard);
  }
  return { state: next, drawSucceeded: drawnCards.length > 0 };
}

export function shuffleHand(state: GameState, options: HandShuffle): GameState {
  let next = removeHandCardEffects(state, liveCurrentHandCardInstanceIds(state));
  if (options.recoverDiscard) next = recoverCurrentDeckGraveyard(next);
  next = moveCardsToBoard(
    next,
    liveCurrentHandCardInstanceIds(state),
    options.destination === 'draw' ? liveBoardState.deck : liveBoardState.graveyard,
  );
  return { ...setLiveCurrentHandCards(next, []), relayUsed: [], handHeartCollectCounts: {} };
}
