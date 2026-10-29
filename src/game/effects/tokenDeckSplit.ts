import { liveCurrentHandCardInstanceIds } from '../../runtime/cards/liveHand.ts';
import {
  createLiveHandState,
  removeLiveCurrentHandCard,
  liveHandCardInstanceIds,
  setLiveCurrentHandCards,
} from '../../runtime/cards/liveHand.ts';
import { createLiveDeckDrawContextState } from '../../runtime/cards/cardDraw.ts';
import { resetLivePendingHandCardCount } from '../../runtime/cards/handCardCountReset.ts';
import { liveBoardState } from '../../runtime/cards/deckBoardState.ts';
import {
  liveCurrentDeckBoardCardInstanceIds,
  liveCurrentDeckCardCount,
  liveTokenCardMatchesSeries,
  mergeLiveTokenCardDeck,
  liveSwitchDeckHandCardCount,
  splitLiveTokenCardDeck,
  switchLiveTokenCardDeck,
} from '../../runtime/cards/tokenCardDeck.ts';
import {
  activateHandPermanentEffects,
  disposeHandEffects,
  removeHandCardEffects,
} from '../cards/handEffects.ts';
import { activateModeAbilityEffects } from '../cards/modeAbility.ts';
import {
  fillHandToCount,
  flushHandCardCountActions,
  resetHandCardCount,
  fillHandToCountRetainingOverflow,
  removeRandomHandCards,
} from '../cards/drawing.ts';
import type { GameState } from '../model.ts';
import type { TokenDeckSplit } from '../tokenDeckSplitTypes.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function activateTokenDeckSplit(
  state: GameState,
  effect: Extract<import('../modelTypes').Effect, { kind: 'token-deck-split' }>,
  applyEffect: EffectApplier,
): GameState {
  if (state.tokenCardDeck.subDeckCardInstanceIds !== null) return state;
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('表示パート数が0です。');
  const seriesIds = effect.seriesIds?.map((id) => Number(BigInt.asIntN(32, id))) ?? null;
  const selected = new Set(
    state.deck
      .filter((card) => liveTokenCardMatchesSeries(card, seriesIds))
      .map((card) => card.cardInstanceId),
  );
  const handCount = state.liveHands[state.tokenCardDeck.currentDeck].handCount;
  const suppressExpiration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const split: TokenDeckSplit = {
    remainingSeconds:
      !suppressExpiration && effect.duration.kind === 'milliseconds'
        ? Math.fround(Math.fround(effect.duration.value) / Math.fround(1000))
        : null,
    remainingSections:
      !suppressExpiration && effect.duration.kind === 'sections' ? effect.duration.value : null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  let next = removeHandCardEffects(
    state,
    liveCurrentHandCardInstanceIds(state).filter((id) => selected.has(id)),
  );
  for (let index = 7; index >= 0; index--) {
    const id = next.liveHands[next.tokenCardDeck.currentDeck].handCards[index];
    if (id !== null && id !== undefined && selected.has(id))
      next = removeLiveCurrentHandCard(next, index, true);
  }
  const partition = splitLiveTokenCardDeck(
    next.tokenCardDeck,
    next.deckBoard,
    next.deck,
    seriesIds,
  );
  next = {
    ...next,
    deckBoard: partition.deckBoard,
    tokenCardDeck: partition.state,
    tokenDeckSplit: split,
  };
  next = fillHandToCount(next, handCount);
  let subState: GameState = {
    ...next,
    liveHands: { ...next.liveHands, sub: createLiveHandState<string>([]) },
    tokenCardDeck: { ...next.tokenCardDeck, currentDeck: 'sub' },
    handEffectCardIds: [],
    deckDrawContext: createLiveDeckDrawContextState(2),
  };
  subState = fillHandToCountRetainingOverflow(
    subState,
    Math.min(
      subState.tokenCardDeck.handTargetCounts.sub,
      liveCurrentDeckCardCount(subState.tokenCardDeck, subState.deckBoard),
    ),
  );
  const handCardStats = { ...subState.handCardStats };
  for (const id of liveCurrentHandCardInstanceIds(subState)) {
    const stats = handCardStats[id];
    if (stats) handCardStats[id] = { ...stats, isActive: false };
  }
  const completed: GameState = {
    ...next,
    randomSeed: subState.randomSeed,
    deckBoard: subState.deckBoard,
    deckActions: subState.deckActions,
    handHeartCollectCounts: subState.handHeartCollectCounts,
    handCollectionActivationCounts: subState.handCollectionActivationCounts,
    handCardStats,
    deckDrawContext: createLiveDeckDrawContextState(3),

    liveHands: subState.liveHands,
    tokenDeckSplit: split,
  };
  return completeDeckOutChecks(completed, applyEffect);
}

function reconcileHand(state: GameState): GameState {
  const target = liveSwitchDeckHandCardCount(state.tokenCardDeck, state.deckBoard);
  const next =
    liveCurrentHandCardInstanceIds(state).length > target
      ? removeRandomHandCards(state, liveCurrentHandCardInstanceIds(state).length - target)
      : state;
  return fillHandToCountRetainingOverflow(next, target);
}

export function switchTokenDeck(state: GameState, applyEffect: EffectApplier): GameState {
  const ready = flushHandCardCountActions(state);
  const split = ready.tokenDeckSplit;
  if (!split) return ready;
  let next = disposeHandEffects(
    { ...ready, tokenCardDeck: { ...ready.tokenCardDeck, isSwitchDeck: true } },
    liveCurrentHandCardInstanceIds(ready),
  );
  next = resetLivePendingHandCardCount(next, resetHandCardCount);
  const tokenCardDeck = switchLiveTokenCardDeck(next.tokenCardDeck, next.deckBoard);
  const physicalHand = new Set(
    liveCurrentDeckBoardCardInstanceIds(tokenCardDeck, next.deckBoard, liveBoardState.hand),
  );
  const incoming = liveHandCardInstanceIds(next.liveHands[tokenCardDeck.currentDeck]).filter((id) =>
    physicalHand.has(id),
  );
  next = {
    ...setLiveCurrentHandCards({ ...next, tokenCardDeck }, incoming),
    handEffectCardIds: [],
  };
  const handCardStats = { ...next.handCardStats };
  for (const id of liveCurrentHandCardInstanceIds(state)) {
    const stats = handCardStats[id];
    if (stats) handCardStats[id] = { ...stats, isActive: false };
  }
  for (const id of incoming) {
    const stats = handCardStats[id];
    if (stats) handCardStats[id] = { ...stats, isActive: true };
  }
  next = { ...next, handCardStats, handEffectCardIds: [...incoming] };
  for (const id of incoming) {
    const card = next.deck.find((item) => item.cardInstanceId === id);
    if (!card) throw new Error('切替先の手札がありません。');
    next = activateHandPermanentEffects(next, card);
    next = activateModeAbilityEffects(next, card, applyEffect);
  }
  next = reconcileHand(next);
  return completeDeckOutChecks(
    {
      ...next,
      tokenCardDeck: { ...next.tokenCardDeck, isSwitchDeck: false },
    },
    applyEffect,
  );
}

function mergeTokenDeck(state: GameState, applyEffect: EffectApplier): GameState {
  const split = state.tokenDeckSplit;
  if (!split) return state;
  const mainState =
    state.tokenCardDeck.currentDeck === 'main'
      ? reconcileHand(state)
      : switchTokenDeck(state, applyEffect);
  const activeSplit = mainState.tokenDeckSplit;
  if (!activeSplit) throw new Error('統合する手札情報がありません。');
  const removed = removeHandCardEffects(
    mainState,
    liveHandCardInstanceIds(mainState.liveHands.sub),
  );
  const merged = mergeLiveTokenCardDeck(removed.tokenCardDeck, removed.deckBoard);
  return {
    ...removed,
    deckBoard: merged.deckBoard,
    tokenCardDeck: merged.state,
    tokenDeckSplit: null,
    liveHands: { ...removed.liveHands, sub: createLiveHandState<string>([]) },
  };
}

export function deactivateTokenDeck(
  state: GameState,
  deactivationKey: string,
  applyEffect: EffectApplier,
): GameState {
  return state.tokenDeckSplit?.deactivationKey === deactivationKey
    ? mergeTokenDeck(state, applyEffect)
    : state;
}

export function advanceTokenDeckSplit(
  state: GameState,
  seconds: number,
  applyEffect: EffectApplier,
): GameState {
  const split = state.tokenDeckSplit;
  if (!split || split.remainingSeconds === null) return state;
  const remainingSeconds = split.remainingSeconds - seconds;
  return remainingSeconds <= 0
    ? mergeTokenDeck(state, applyEffect)
    : { ...state, tokenDeckSplit: { ...split, remainingSeconds } };
}

export function expireTokenDeckSplitSections(
  state: GameState,
  applyEffect: EffectApplier,
): GameState {
  const split = state.tokenDeckSplit;
  if (!split || split.remainingSections === null) return state;
  const remainingSections = split.remainingSections - 1n;
  return remainingSections <= 0n
    ? mergeTokenDeck(state, applyEffect)
    : { ...state, tokenDeckSplit: { ...split, remainingSections } };
}
