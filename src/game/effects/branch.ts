import type { Card, Effect, GameState } from '../model.ts';
import { conditionContext } from '../conditions/gameContext.ts';
import { evaluateCondition } from '../conditions/evaluate.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { completeDeckOutChecks } from './deckOutCheck.ts';
import { deactivateInducedEffects, withDeactivationKey } from './effectInduce.ts';

type BranchEffect = Extract<Effect, { kind: 'branch' }>;

export function activateBranchInducer(
  state: GameState,
  effect: BranchEffect,
  card: Card | undefined,
): GameState {
  return {
    ...state,
    branchInducers: [
      ...state.branchInducers,
      {
        id: state.nextBranchInducerId,
        condition: effect.condition,
        whenTrue: effect.whenTrue,
        whenFalse: effect.whenFalse,
        active: null,
        deactivationKey: effect.deactivationKey ?? null,
        sourceCardId: card?.cardInstanceId ?? null,
      },
    ],
    nextBranchInducerId: state.nextBranchInducerId + 1,
  };
}

export function refreshBranchInducers(state: GameState, apply: EffectApplier): GameState {
  let next = state;
  for (const id of state.branchInducers.map((branch) => branch.id)) {
    const branch = next.branchInducers.find((item) => item.id === id);
    if (!branch) continue;
    const active = evaluateCondition(branch.condition, conditionContext(next));
    if (active === branch.active) continue;
    const childKey = `branch-induce:${branch.id}`;
    next = {
      ...next,
      branchInducers: next.branchInducers.map((item) =>
        item.id === id ? { ...item, active } : item,
      ),
    };
    if (branch.active !== null) next = deactivateInducedEffects(next, childKey);
    const card = branch.sourceCardId
      ? next.cardPool.find((item) => item.cardInstanceId === branch.sourceCardId)
      : undefined;
    const effects = active ? branch.whenTrue : branch.whenFalse;
    for (const effect of effects) {
      next = completeDeckOutChecks(
        apply(next, withDeactivationKey(effect, childKey, true), card),
        apply,
      );
    }
  }
  return next;
}

export function deactivateBranchInducers(state: GameState, deactivationKey: string): GameState {
  const removed = state.branchInducers.filter(
    (branch) => branch.deactivationKey === deactivationKey,
  );
  let next: GameState = {
    ...state,
    branchInducers: state.branchInducers.filter(
      (branch) => branch.deactivationKey !== deactivationKey,
    ),
  };
  for (const branch of removed) {
    if (branch.active === null) continue;
    next = deactivateInducedEffects(next, `branch-induce:${branch.id}`);
  }
  return next;
}
