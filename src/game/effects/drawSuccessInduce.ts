import type { Card, GameState } from '../model.ts';
import type { DrawSuccessInduceEffect } from '../drawSuccessInduceTypes.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { deactivateInducedEffects, withDeactivationKey } from './effectInduce.ts';
import { conditionContext } from '../conditions/gameContext.ts';
import { isLiveDrawSuccessConditionSatisfied } from '../../runtime/skills/drawSuccessCondition.ts';

export function activateDrawSuccessInduce(
  state: GameState,
  effect: DrawSuccessInduceEffect,
  card: Card | undefined,
  apply: EffectApplier,
): GameState {
  if (!card) return state;
  const handCardStats = state.handCardStats[card.cardInstanceId];
  if (!handCardStats) return state;
  const condition = isLiveDrawSuccessConditionSatisfied(
    effect,
    conditionContext(state),
    state.genesis,
  );
  const selected = condition ? effect.whenTrue : effect.whenFalse;
  if (selected.length === 0) return state;
  const branchType = int32(effect.branchType);
  const disabledType =
    effect.disabledType === undefined ? (branchType === 3 ? 1 : 0) : int32(effect.disabledType);
  const deactivationKey = `${card.cardInstanceId}:${effect.sourceEffectId}`;
  const applied = selected.reduce(
    (next, child) =>
      apply(next, disabledType === 1 ? child : withDeactivationKey(child, deactivationKey), card),
    state,
  );
  if (disabledType === 1) return applied;
  const activation = applied.activation;
  if (!activation) return deactivateInducedEffects(applied, deactivationKey);
  return {
    ...applied,
    activation: {
      ...activation,
      pendingHandStatsDeactivationKeys: [
        ...(activation.pendingHandStatsDeactivationKeys ?? []),
        deactivationKey,
      ],
    },
  };
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
