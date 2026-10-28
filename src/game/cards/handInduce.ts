import {
  notifyLiveHandCardStatsSkillUse,
  advanceLiveHandCardStatsSection,
} from '../../runtime/cards/handCardStats.ts';
import { sectionAt } from '../projection.ts';
import type { Card, Effect, GameState } from '../model.ts';
import type { HandUseTrigger } from './cardTypes.ts';
import { handInducerStateKey } from './handInducer.ts';
import type { EffectApplier } from '../effects/induceSkillEffect.ts';
import { completeDeckOutChecks } from '../effects/deckOutCheck.ts';

export function notifyHandSkillUse(state: GameState, used: Card, apply: EffectApplier): GameState {
  const withUpdatedStats = updateHandCardSkillUseStats(state, used);
  return activateHandInducers(withUpdatedStats, apply, (trigger) => {
    switch (trigger.kind) {
      case 'member':
        return int32(trigger.member) === used.charactersId;
      case 'skill-main-effect':
        return int32(trigger.mainEffect) === used.skillMainEffect;
      case 'unit':
        return used.unitIds.includes(int32(trigger.unit));
      case 'heart-quantity-count':
        return false;
      case 'same-card':
        return false;
      case 'any-skill':
        return true;
      case 'voltage-increase':
      case 'section-change':
        return false;
    }
  });
}

function updateHandCardSkillUseStats(state: GameState, used: Card): GameState {
  const handCardStats = Object.fromEntries(
    Object.entries(state.handCardStats).map(([id, stats]) => [
      id,
      notifyLiveHandCardStatsSkillUse(stats, used.charactersId, used.skillMainEffect),
    ]),
  );
  return { ...state, handCardStats };
}

export function notifyHandCardBeforeUse(
  state: GameState,
  used: Card,
  skillType: number,
  apply: EffectApplier,
): GameState {
  return activateHandInducers(
    state,
    apply,
    (trigger, source) => trigger.kind === 'same-card' && source.id === used.id && skillType === 2,
  );
}

export function notifyHandHeartCollect(
  state: GameState,
  collectedCount: number,
  apply: EffectApplier,
): GameState {
  let next = state;
  const activationCounts = { ...state.handUseActivationCounts };
  const collectionCounts = { ...state.handUseHeartCollectionCounts };
  for (const id of state.handEffectCardIds) {
    const card = state.cardPool.find((item) => item.id === id);
    if (!card) throw new Error('手札効果のカードがありません。');
    for (const inducer of card.handInducers ?? []) {
      const trigger = inducer.trigger;
      if (!inducer.effects.length || trigger.kind !== 'heart-quantity-count') continue;
      const key = handInducerStateKey(card.id, inducer.sourceEffectId);
      const count = int32((collectionCounts[key] ?? 0) + int32(collectedCount));
      collectionCounts[key] = count;
      const activationCount = int32(activationCounts[key] ?? 0);
      if (
        (inducer.limit !== undefined &&
          int32(inducer.limit) !== 0 &&
          int32(inducer.limit) <= activationCount) ||
        count < int32(trigger.count)
      )
        continue;
      collectionCounts[key] = 0;
      next = applyEffects(next, inducer.effects, card, apply);
      activationCounts[key] = int32(activationCount + 1);
    }
  }
  return {
    ...next,
    handUseActivationCounts: activationCounts,
    handUseHeartCollectionCounts: collectionCounts,
  };
}

export function notifyHandVoltageIncrease(
  state: GameState,
  previousLevel: number,
  currentLevel: number,
  apply: EffectApplier,
): GameState {
  let next = state;
  for (let level = 0; level < Math.max(0, currentLevel - previousLevel); level++)
    next = activateHandInducers(next, apply, (trigger) => trigger.kind === 'voltage-increase');
  return next;
}

export function notifyHandSectionChange(state: GameState, apply: EffectApplier): GameState {
  const currentSection = state.track.sections.indexOf(sectionAt(state));
  const handCardStats = Object.fromEntries(
    Object.entries(state.handCardStats).map(([id, stats]) => [
      id,
      advanceLiveHandCardStatsSection(stats, currentSection),
    ]),
  );
  return activateHandInducers(
    { ...state, handCardStats },
    apply,
    (trigger) => trigger.kind === 'section-change',
  );
}

function activateHandInducers(
  state: GameState,
  apply: EffectApplier,
  matches: (trigger: HandUseTrigger, source: Card) => boolean,
): GameState {
  let next = state;
  const activationCounts = { ...state.handUseActivationCounts };
  for (const id of state.handEffectCardIds) {
    const card = state.cardPool.find((item) => item.id === id);
    if (!card) throw new Error('手札効果のカードがありません。');
    for (const inducer of card.handInducers ?? []) {
      if (!inducer.effects.length || !matches(inducer.trigger, card)) continue;
      const key = handInducerStateKey(card.id, inducer.sourceEffectId);
      const activationCount = int32(activationCounts[key] ?? 0);
      if (
        inducer.limit !== undefined &&
        int32(inducer.limit) !== 0 &&
        int32(inducer.limit) <= activationCount
      )
        continue;
      next = applyEffects(next, inducer.effects, card, apply);
      activationCounts[key] = int32(activationCount + 1);
    }
  }
  return { ...next, handUseActivationCounts: activationCounts };
}

function int32(value: number | bigint): number {
  return Number(BigInt.asIntN(32, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))));
}

function applyEffects(
  state: GameState,
  effects: readonly Effect[],
  card: Card,
  apply: EffectApplier,
): GameState {
  return effects.reduce((next, effect) => {
    return completeDeckOutChecks(apply(next, effect, card), apply);
  }, state);
}
