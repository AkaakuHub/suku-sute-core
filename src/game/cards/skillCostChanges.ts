import { createLiveHandCardStats } from '../../runtime/cards/handCardStats.ts';
import { calculateLiveChangeSkillCostValue } from '../../runtime/skills/changeSkillCostValue.ts';
import { liveChangeSkillCostConditionValue } from '../../runtime/skills/changeSkillCostCondition.ts';
import { sectionAt } from '../projection.ts';
import { skillCostContext } from './skillCostContext.ts';
import { applyAction52SkillBoostForCard } from '../effects/action52SkillBoost.ts';
import type { Card, GameState } from '../model.ts';
import type { SkillCostChange, SkillCostChangeEffect } from '../modelTypes.ts';

export function addSkillCostChange(
  state: GameState,
  effect: SkillCostChangeEffect,
  card: Card | undefined,
  multiplier: number,
): GameState {
  if (!card) throw new Error('発動元カードがありません。');
  const base = Math.fround(
    Math.fround(Math.fround(effect.amount) - Math.fround(effect.addValue ?? 0)) *
      Math.fround(multiplier),
  );
  const boosted =
    base < 0
      ? applyAction52SkillBoostForCard(state, card, Math.fround(Math.abs(base)))
      : { state, value: base };
  const amount = base < 0 ? int32(-int32(boosted.value)) : base;
  const change: SkillCostChange = {
    sourceId: card.id,
    amount,
    minimum: effect.minimum,
    maximum: effect.maximum,
    conditionType: effect.conditionType,
    conditionId: effect.conditionId ?? 0,
    remainingSections:
      effect.invocationType === 0x388 || effect.invocationType === 0x38b
        ? null
        : (effect.duration?.sections ?? null),
    invocationType: effect.invocationType ?? null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return { ...boosted.state, skillCostChanges: [...boosted.state.skillCostChanges, change] };
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function deactivateSkillCostChanges(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    skillCostChanges: state.skillCostChanges.filter(
      (change) =>
        change.deactivationKey !== deactivationKey ||
        change.invocationType === 0x388 ||
        change.invocationType === 0x38b,
    ),
  };
}

export function skillCostDelta(state: GameState, card: Card): number {
  return state.skillCostChanges
    .filter((change) => change.sourceId === card.id)
    .reduce((total, change) => {
      const value = liveChangeSkillCostConditionValue(change, skillCostContext(state, card));
      return total + calculateLiveChangeSkillCostValue(change, value);
    }, 0);
}

export function initializeHandCardStats(state: GameState, ids: readonly string[]): GameState {
  const sectionIndex = state.track.sections.indexOf(sectionAt(state));
  const handCardStats = { ...state.handCardStats };
  for (const id of ids) {
    handCardStats[id] = createLiveHandCardStats(sectionIndex);
  }
  return { ...state, handCardStats };
}
