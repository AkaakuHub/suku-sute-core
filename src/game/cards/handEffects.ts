import type { Card, GameState } from '../model.ts';
import {
  applyParameterValueChange,
  deactivateParameterValueChanges,
} from '../parameters/parameterValueChange.ts';
import { applyEffect } from '../effects.ts';
import { withDeactivationKey, deactivateInducedEffects } from '../effects/effectInduce.ts';
import { deactivateModeAbilityEffects } from './modeAbility.ts';
import { handInducerStateKey } from './handInducer.ts';

export function activateHandPermanentEffects(state: GameState, card: Card): GameState {
  const effects = card.handPermanentEffects;
  if (!effects?.length || state.activeHandPermanentCardIds.includes(card.cardInstanceId))
    return state;
  const deactivationKey = `hand-permanent:${card.cardInstanceId}`;
  let next = state;
  for (const effect of effects) {
    next =
      effect.kind === 'parameter-value-change'
        ? applyParameterValueChange(next, card, effect)
        : applyEffect(
            next,
            effect.kind === 'hand-limit' ||
              effect.kind === 'skill-boost' ||
              effect.kind === 'ap-speed-change' ||
              effect.kind === 'voltage-convert' ||
              effect.kind === 'mental-heart-induce'
              ? { ...effect, invocationType: 0x388, deactivationKey }
              : withDeactivationKey(effect, deactivationKey, true),
            card,
          );
  }
  return {
    ...next,
    activeHandPermanentCardIds: [...state.activeHandPermanentCardIds, card.cardInstanceId],
  };
}

export function disposeHandEffects(state: GameState, ids: readonly string[]): GameState {
  let next = state;
  for (const id of ids) {
    const card = state.deck.find((item) => item.cardInstanceId === id);
    if (card?.modeAbilityChanges) next = deactivateModeAbilityEffects(next, card);
    if (!card) continue;
    const resetInducers = (card.handInducers ?? []).filter(
      (inducer) => inducer.limitMemory === 'reset',
    );
    for (const effect of resetInducers.flatMap((inducer) => inducer.effects)) {
      if (effect.kind === 'parameter-value-change')
        next = applyParameterValueChange(next, card, effect, true);
    }
    const resetKeys = new Set(
      resetInducers.map((inducer) =>
        handInducerStateKey(card.cardInstanceId, inducer.sourceEffectId),
      ),
    );
    next = {
      ...next,
      handUseActivationCounts: Object.fromEntries(
        Object.entries(next.handUseActivationCounts).filter(([key]) => !resetKeys.has(key)),
      ),
    };
  }
  for (const active of state.activeModeParameterChanges) {
    if (!ids.includes(active.cardId)) continue;
    const card = state.cardPool.find((item) => item.cardInstanceId === active.cardId);
    if (!card?.modeParameterChanges) continue;
    const effects = active.isOn ? card.modeParameterChanges.on : card.modeParameterChanges.off;
    next = deactivateParameterValueChanges(next, card, effects);
  }
  const activeHandPermanentCardIds = state.activeHandPermanentCardIds.filter(
    (id) => !ids.includes(id),
  );
  const removedHandInducerKeys = new Set(
    ids.flatMap((id) => {
      const card = state.cardPool.find((item) => item.cardInstanceId === id);
      return (card?.handInducers ?? []).map((inducer) =>
        handInducerStateKey(id, inducer.sourceEffectId),
      );
    }),
  );
  for (const id of state.activeHandPermanentCardIds) {
    if (!ids.includes(id)) continue;
    const card = state.cardPool.find((item) => item.cardInstanceId === id);
    const effects = card?.handPermanentEffects;
    if (!card || !effects) continue;
    next = deactivateParameterValueChanges(
      next,
      card,
      effects.filter((effect) => effect.kind === 'parameter-value-change'),
    );
    const deactivationKey = `hand-permanent:${card.cardInstanceId}`;
    next = deactivateInducedEffects(next, deactivationKey);
    next = {
      ...next,
      targetBoosts: next.targetBoosts.filter((boost) => boost.deactivationKey !== deactivationKey),
    };
  }
  return {
    ...next,
    handEffectCardIds: state.handEffectCardIds.filter((id) => !ids.includes(id)),
    activeModeParameterChanges: state.activeModeParameterChanges.filter(
      (item) => !ids.includes(item.cardId),
    ),
    activeHandPermanentCardIds,
    handCollectionActivationCounts: Object.fromEntries(
      Object.entries(state.handCollectionActivationCounts).filter(([id]) => {
        if (!ids.includes(id)) return true;
        return (
          state.deck.find((card) => card.cardInstanceId === id)?.collectionEffects?.limitMemory ===
          'retain'
        );
      }),
    ),
    handUseActivationCounts: next.handUseActivationCounts,
    handUseHeartCollectionCounts: Object.fromEntries(
      Object.entries(state.handUseHeartCollectionCounts).filter(
        ([key]) => !removedHandInducerKeys.has(key),
      ),
    ),
  };
}

export function removeHandCardEffects(state: GameState, ids: readonly string[]): GameState {
  const next = disposeHandEffects(state, ids);
  return {
    ...next,
    handCardStats: Object.fromEntries(
      Object.entries(next.handCardStats).filter(([id]) => !ids.includes(id)),
    ),
  };
}
