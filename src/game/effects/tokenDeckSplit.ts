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
import type { TokenDeckSplit, TokenDeckHand } from '../tokenDeckSplitTypes.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

function zones(state: GameState): TokenDeckHand {
  return { hand: state.hand };
}

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
  const handCount = state.hand.length;
  const main: TokenDeckHand = { hand: state.hand.filter((id) => !selected.has(id)) };
  const suppressExpiration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const split: TokenDeckSplit = {
    main,
    sub: { hand: [] },
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
    state.hand.filter((id) => selected.has(id)),
  );
  const partition = splitLiveTokenCardDeck(
    next.tokenCardDeck,
    next.deckBoard,
    next.deck,
    seriesIds,
  );
  next = {
    ...next,
    hand: main.hand,
    deckBoard: partition.deckBoard,
    tokenCardDeck: partition.state,
    tokenDeckSplit: split,
  };
  next = fillHandToCount(next, handCount);
  const activeMain = zones(next);
  let subState: GameState = {
    ...next,
    hand: [],
    tokenCardDeck: { ...next.tokenCardDeck, currentDeck: 'sub' },
    handEffectCardIds: [],
    drawContext: 'sub-deck-start',
    usedCard: null,
    lastUsedSkillIcon: null,
  };
  subState = fillHandToCountRetainingOverflow(
    subState,
    Math.min(
      subState.tokenCardDeck.handTargetCounts.sub,
      liveCurrentDeckCardCount(subState.tokenCardDeck, subState.deckBoard),
    ),
  );
  const handCardStats = { ...subState.handCardStats };
  for (const id of subState.hand) {
    const stats = handCardStats[id];
    if (stats) handCardStats[id] = { ...stats, isActive: false };
  }
  const completed: GameState = {
    ...next,
    randomSeed: subState.randomSeed,
    deckBoard: subState.deckBoard,
    deckActions: subState.deckActions,
    handHeartCollectCounts: subState.handHeartCollectCounts,
    relayUsed: subState.relayUsed,
    handCardStats,
    drawContext: 'idle',
    usedCard: null,
    lastUsedSkillIcon: null,
    tokenDeckSplit: { ...split, main: activeMain, sub: zones(subState) },
  };
  return completeDeckOutChecks(completed, applyEffect);
}

function reconcileHand(state: GameState): GameState {
  const target = liveSwitchDeckHandCardCount(state.tokenCardDeck, state.deckBoard);
  const next =
    state.hand.length > target ? removeRandomHandCards(state, state.hand.length - target) : state;
  return fillHandToCountRetainingOverflow(next, target);
}

export function switchTokenDeck(state: GameState, applyEffect: EffectApplier): GameState {
  const ready = flushHandCardCountActions(state);
  const split = ready.tokenDeckSplit;
  if (!split) return ready;
  const outgoingName = ready.tokenCardDeck.currentDeck;
  const incomingName = outgoingName === 'main' ? 'sub' : 'main';
  let next = disposeHandEffects(
    { ...ready, tokenCardDeck: { ...ready.tokenCardDeck, isSwitchDeck: true } },
    ready.hand,
  );
  next = resetLivePendingHandCardCount(next, resetHandCardCount);
  const tokenCardDeck = switchLiveTokenCardDeck(next.tokenCardDeck, next.deckBoard);
  const physicalHand = new Set(
    liveCurrentDeckBoardCardInstanceIds(tokenCardDeck, next.deckBoard, liveBoardState.hand),
  );
  const incoming = split[incomingName].hand.filter((id) => physicalHand.has(id));
  const updated: TokenDeckSplit = { ...split, [outgoingName]: zones(next) };
  next = { ...next, hand: incoming, tokenCardDeck, tokenDeckSplit: updated, handEffectCardIds: [] };
  const handCardStats = { ...next.handCardStats };
  for (const id of state.hand) {
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
      tokenDeckSplit: { ...updated, [incomingName]: zones(next) },
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
  const removed = removeHandCardEffects(mainState, activeSplit.sub.hand);
  const merged = mergeLiveTokenCardDeck(removed.tokenCardDeck, removed.deckBoard);
  return {
    ...removed,
    deckBoard: merged.deckBoard,
    tokenCardDeck: merged.state,
    tokenDeckSplit: null,
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
