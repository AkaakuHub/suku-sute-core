import { liveCurrentHandCardInstanceIds } from '../../runtime/cards/liveHand.ts';
import { finalizeLiveSkillCost } from '../../runtime/skills/skillCostBuff.ts';
import { calculateLiveAllHandSkillCost } from '../../runtime/cards/useAllHandSkill.ts';
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
      card.consumeAp,
      -(state.costReductions[card.cardInstanceId] ?? 0) +
        skillCostDelta(state, card) +
        (state.onceSkillCostChanges[card.cardInstanceId] ?? 0),
    );
  const cards = liveCurrentHandCardInstanceIds(state).map((id) => {
    const rawOther = state.deck.find((item) => item.cardInstanceId === id);
    if (!rawOther) throw new Error('手札のカードがありません。');
    const other = resolveModeSkill(rawOther, state.modes);
    return other.cardInstanceId === card.cardInstanceId
      ? { kind: 'source' as const, baseCost: card.consumeAp }
      : { kind: 'other' as const, skillCost: cardCost(state, other, true) };
  });
  const reduction = (card.allHandCost?.reductions ?? []).reduce(
    (sum, item) => sum + (state.deck.length >= item.minimumCards ? item.amount : 0),
    0,
  );
  return calculateLiveAllHandSkillCost(
    cards,
    useHand.addAp ?? 0,
    (total) =>
      total -
      reduction -
      (state.costReductions[card.cardInstanceId] ?? 0) +
      skillCostDelta(state, card) +
      (state.onceSkillCostChanges[card.cardInstanceId] ?? 0),
  );
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
            ? card.unitIds.includes(effect.target.unit)
            : card.token === effect.target.token;
        return [
          card.cardInstanceId,
          (state.costReductions[card.cardInstanceId] ?? 0) + (matches ? effect.amount : 0),
        ];
      }),
    ),
  };
}
