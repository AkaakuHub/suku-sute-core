import type { LiveConditionContext } from '../live/conditionContext.ts';
import { createLiveBranchSkill, isLiveBranchConditionSatisfied } from './branchSkill.ts';
import type { LiveGenesisState } from './genesisSkill.ts';
import type { LiveSkillEffect } from './skillTypes.ts';

export function selectLiveBranchEffects<Effect>(
  input: Readonly<{
    genesis: LiveGenesisState;
    gaugeCondition: boolean;
    condition: () => boolean;
    whenTrue: readonly Effect[];
    whenFalse: readonly Effect[];
  }>,
): readonly Effect[] {
  if (input.gaugeCondition && input.genesis.effects.length > 0)
    return [...input.whenTrue, ...input.whenFalse];
  return input.condition() ? input.whenTrue : input.whenFalse;
}

export function activateLiveBranchSkill<State>(
  state: State,
  effect: LiveSkillEffect,
  effects: readonly LiveSkillEffect[],
  ports: Readonly<{
    conditionContext: (state: State) => LiveConditionContext;
    genesis: (state: State) => LiveGenesisState;
    applyEffect: (state: State, effect: LiveSkillEffect) => State;
  }>,
): State {
  const ancestors = new Set<string>();
  return activate(state, effect);

  function activate(current: State, currentEffect: LiveSkillEffect): State {
    if (currentEffect.actionType !== 12) return ports.applyEffect(current, currentEffect);
    if (ancestors.has(currentEffect.id))
      throw new Error(`Live Branch effect cycle detected:${currentEffect.id}`);
    const branch = createLiveBranchSkill(currentEffect, effects);
    const children = selectLiveBranchEffects({
      genesis: ports.genesis(current),
      gaugeCondition: branch.branchType === 1 || branch.branchType === 2,
      condition: () => isLiveBranchConditionSatisfied(branch, ports.conditionContext(current)),
      whenTrue: branch.trueEffect === null ? [] : [branch.trueEffect],
      whenFalse: branch.falseEffect === null ? [] : [branch.falseEffect],
    });
    ancestors.add(currentEffect.id);
    try {
      return children.reduce((next, child) => activate(next, child), current);
    } finally {
      ancestors.delete(currentEffect.id);
    }
  }
}
