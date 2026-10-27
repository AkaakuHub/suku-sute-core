import { finalizeLiveSkillCost } from '../../runtime/skills/skillCostBuff.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { skillCostDelta } from './skillCostChanges.ts';
import { resolveModeSkill } from '../live/modes.ts';
import { resolveEffectParameterDetails } from '../parameters/parameterValueChange.ts';

export function cardCost(state: GameState, card: Card, activeAllHandSkill = false): number {
  card = resolveModeSkill(card, state.modes);
  const useHandEffect = card.effects.find((effect) => effect.kind === 'use-hand');
  const useHand = useHandEffect ? resolveEffectParameterDetails(state, card, useHandEffect) : null;
  if (!useHand || useHand.kind !== 'use-hand' || activeAllHandSkill)
    return finalizeLiveSkillCost(
      card.cost,
      -(state.costReductions[card.id] ?? 0) +
        skillCostDelta(state, card) +
        (state.onceSkillCostChanges[card.id] ?? 0),
    );
  const total = state.hand.reduce((sum, id) => {
    const rawOther = state.deck.find((item) => item.id === id);
    if (!rawOther) return sum;
    const other = resolveModeSkill(rawOther, state.modes);
    return (
      sum +
      (other.id === card.id
        ? card.cost + toInt32(useHand.addAp ?? 0)
        : finalizeLiveSkillCost(
            other.cost,
            -(state.costReductions[other.id] ?? 0) +
              skillCostDelta(state, other) +
              (state.onceSkillCostChanges[other.id] ?? 0),
          ))
    );
  }, 0);
  const reduction = (card.allHandCost?.reductions ?? []).reduce(
    (sum, item) => sum + (state.deck.length >= item.minimumCards ? item.amount : 0),
    0,
  );
  return Math.max(
    1,
    total -
      reduction -
      (state.costReductions[card.id] ?? 0) +
      skillCostDelta(state, card) +
      (state.onceSkillCostChanges[card.id] ?? 0),
  );
}

function toInt32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function applyCostReduction(
  state: GameState,
  effect: Extract<Effect, { kind: 'cost-reduction' }>,
): GameState {
  return {
    ...state,
    costReductions: Object.fromEntries(
      state.deck.map((card) => {
        const matches =
          effect.target.kind === 'unit'
            ? card.unit === effect.target.unit
            : card.token === effect.target.token;
        return [card.id, (state.costReductions[card.id] ?? 0) + (matches ? effect.amount : 0)];
      }),
    ),
  };
}
