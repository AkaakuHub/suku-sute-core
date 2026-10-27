import type { Card, GameState } from '../model.ts';
import type { EffectApplier } from '../effects/induceSkillEffect.ts';
import { completeDeckOutChecks } from '../effects/deckOutCheck.ts';
import { deactivateInducedEffects, withDeactivationKey } from '../effects/effectInduce.ts';

export function activateModeAbilityEffects(
  state: GameState,
  card: Card,
  apply: EffectApplier,
): GameState {
  const changes = card.modeAbilityChanges;
  if (!changes || !state.handEffectCardIds.includes(card.id)) return state;
  const isOn = state.modes.entries.find((mode) => mode.id === changes.modeId)?.on ?? false;
  const variant = isOn ? changes.on : changes.off;
  if (!variant.modeEffects.length) return state;
  const deactivationKey = `mode-ability:${card.id}`;
  let next = state;
  for (const effect of variant.modeEffects)
    next = completeDeckOutChecks(
      apply(next, withDeactivationKey(effect, deactivationKey), card),
      apply,
    );
  return next;
}

export function deactivateModeAbilityEffects(state: GameState, card: Card): GameState {
  return deactivateInducedEffects(state, `mode-ability:${card.id}`);
}
