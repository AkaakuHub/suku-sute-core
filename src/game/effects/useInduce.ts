import type { Card, Effect, GameState } from '../model.ts';
import type { EffectApplier } from './induceSkillEffect.ts';

export function activateUseInduce(
  state: GameState,
  effect: Extract<Effect, { kind: 'use-induce' }>,
  card: Card | undefined,
  apply: EffectApplier,
): GameState {
  if (effect.targetEffectId === null || effect.effects.length === 0) return state;
  const key = `${card?.cardInstanceId ?? ''}:${effect.targetEffectId}`;
  const activationCount = int32(state.skillEffectActivationCounts[key] ?? 0);
  const limit = int32(effect.limit);
  if (limit !== 0 && activationCount >= limit) return state;
  return effect.effects.reduce((current, child) => apply(current, child, card), state);
}

function int32(value: number | bigint): number {
  return Number(BigInt.asIntN(32, typeof value === 'bigint' ? value : BigInt(Math.trunc(value))));
}

export function activateUseCountInduce(
  state: GameState,
  effect: Extract<Effect, { kind: 'use-count-induce' }>,
  card: Card | undefined,
  apply: EffectApplier,
): GameState {
  const skillUseCount = int32(
    (card ? (state.skillActivationCounts[card.cardInstanceId] ?? 1) : 1) - 1,
  );
  const requireCount = int32(effect.requireCount);
  if (requireCount !== 0 && skillUseCount % requireCount !== 0) return state;
  return activateUseInduce(
    state,
    {
      kind: 'use-induce',
      sourceEffectId: effect.sourceEffectId,
      targetEffectId: effect.targetEffectId,
      limit: effect.limit,
      effects: effect.effects,
    },
    card,
    apply,
  );
}
