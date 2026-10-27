import type { Card } from '../cards/cardTypes.ts';
import { activateHandPermanentEffects, disposeHandEffects } from '../cards/handEffects.ts';
import { fillHandToCount } from '../cards/drawing.ts';
import type { GameState } from '../model.ts';
import type { TokenDeckSplit, TokenDeckZones } from '../tokenDeckSplitTypes.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

function zones(state: GameState): TokenDeckZones {
  return { hand: state.hand, drawPile: state.drawPile, discard: state.discard };
}

function isSeriesCard(card: Card, seriesIds: readonly number[] | null): boolean {
  return seriesIds !== null && (card.tokenSeriesIds ?? []).some((id) => seriesIds.includes(id));
}

function withZones(state: GameState, value: TokenDeckZones): GameState {
  return { ...state, hand: value.hand, drawPile: value.drawPile, discard: value.discard };
}

export function activateTokenDeckSplit(
  state: GameState,
  effect: Extract<import('../modelTypes').Effect, { kind: 'token-deck-split' }>,
  applyEffect: EffectApplier,
): GameState {
  if (state.tokenDeckSplit) return state;
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('表示パート数が0です。');
  const seriesIds = effect.seriesIds?.map((id) => Number(BigInt.asIntN(32, id))) ?? null;
  const selected = new Set(
    state.deck.filter((card) => isSeriesCard(card, seriesIds)).map((card) => card.id),
  );
  const handCount = state.hand.length;
  const main: TokenDeckZones = {
    hand: state.hand.filter((id) => !selected.has(id)),
    drawPile: state.drawPile.filter((id) => !selected.has(id)),
    discard: state.discard.filter((id) => !selected.has(id)),
  };
  const sub: TokenDeckZones = {
    hand: [],
    drawPile: state.deck.filter((card) => selected.has(card.id)).map((card) => card.id),
    discard: [],
  };
  const suppressExpiration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const split: TokenDeckSplit = {
    seriesIds,
    main,
    sub,
    active: 'main',
    remainingSeconds:
      !suppressExpiration && effect.duration.kind === 'milliseconds'
        ? Math.fround(Math.fround(effect.duration.value) / Math.fround(1000))
        : null,
    remainingSections:
      !suppressExpiration && effect.duration.kind === 'sections' ? effect.duration.value : null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  let next = disposeHandEffects(
    state,
    state.hand.filter((id) => selected.has(id)),
  );
  next = { ...withZones(next, main), tokenDeckSplit: split };
  next = fillHandToCount(next, handCount);
  const activeMain = zones(next);
  let subState = withZones(next, { hand: [], drawPile: sub.drawPile, discard: sub.discard });
  subState = { ...subState, handEffectCardIds: [], drawContext: 'initial' };
  subState = fillHandToCount(subState, Math.min(handCount, selected.size));
  const inactiveSubStats = { ...subState.handCardStats };
  for (const id of subState.hand) {
    const stats = inactiveSubStats[id];
    if (stats) inactiveSubStats[id] = { ...stats, isActive: false };
  }
  const completed: GameState = {
    ...next,
    randomSeed: subState.randomSeed,
    handCardStats: { ...next.handCardStats, ...inactiveSubStats },
    drawContext: 'idle',
    tokenDeckSplit: { ...split, main: activeMain, sub: zones(subState) },
  };
  return completeDeckOutChecks(completed, applyEffect);
}

export function switchTokenDeck(state: GameState, applyEffect: EffectApplier): GameState {
  const split = state.tokenDeckSplit;
  if (!split) return state;
  const incoming = split.active === 'main' ? split.sub : split.main;
  const outgoingName = split.active;
  const incomingName = split.active === 'main' ? 'sub' : 'main';
  let next = disposeHandEffects(state, state.hand);
  const updated: TokenDeckSplit = {
    ...split,
    [outgoingName]: zones(state),
    active: incomingName,
  };
  next = {
    ...withZones(next, incoming),
    tokenDeckSplit: updated,
    handEffectCardIds: [],
  };
  const handCardStats = { ...next.handCardStats };
  for (const id of state.hand) {
    const stats = handCardStats[id];
    if (stats) handCardStats[id] = { ...stats, isActive: false };
  }
  for (const id of incoming.hand) {
    const stats = handCardStats[id];
    if (stats) handCardStats[id] = { ...stats, isActive: true };
  }
  next = { ...next, handCardStats };
  next = { ...next, handEffectCardIds: [...incoming.hand] };
  for (const id of incoming.hand) {
    const card = next.deck.find((item) => item.id === id);
    if (card) next = activateHandPermanentEffects(next, card);
  }
  const switched = { ...next, tokenDeckSplit: { ...updated, [incomingName]: zones(next) } };
  return incoming.hand.length === 0 ? completeDeckOutChecks(switched, applyEffect) : switched;
}

function mergeTokenDeck(state: GameState, applyEffect: EffectApplier): GameState {
  const split = state.tokenDeckSplit;
  if (!split) return state;
  const mainState =
    split.active === 'main'
      ? { ...state, tokenDeckSplit: { ...split, main: zones(state) } }
      : switchTokenDeck(state, applyEffect);
  const activeSplit = mainState.tokenDeckSplit;
  if (!activeSplit) return mainState;
  const sub = activeSplit.sub;
  const drawPile = [...activeSplit.main.drawPile, ...sub.hand, ...sub.drawPile];
  const merged: TokenDeckZones = {
    ...activeSplit.main,
    drawPile: [...new Set(drawPile)],
    discard: [
      ...activeSplit.main.discard,
      ...sub.discard.filter((id) => !activeSplit.main.discard.includes(id)),
    ],
  };
  return { ...withZones(mainState, merged), tokenDeckSplit: null };
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
