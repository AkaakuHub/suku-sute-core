import { voltageLevel } from '../live/voltageLevel.ts';
import { sectionAt, moodValue } from '../projection.ts';
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
      const value = conditionValue(state, card, change);
      const bounded =
        change.conditionType === 1
          ? change.amount
          : Math.max(change.minimum, Math.min(change.maximum, value * change.amount));
      return total + bounded;
    }, 0);
}

export function initializeHandCardStats(state: GameState, ids: readonly string[]): GameState {
  const sectionIndex = state.track.sections.indexOf(sectionAt(state));
  const handCardStats = { ...state.handCardStats };
  for (const id of ids) {
    handCardStats[id] = {
      isActive: true,
      enteredSectionIndex: sectionIndex,
      skillUseCountsByMember: {},
      skillUseCountsByIcon: {},
      skillUseCountsByUnit: {},
    };
  }
  return { ...state, handCardStats };
}

function conditionValue(state: GameState, source: Card, change: SkillCostChange): number {
  const stats = state.handCardStats[source.id];
  const currentHand = state.hand.flatMap((id) => {
    const card = state.deck.find((item) => item.id === id);
    return card ? [card] : [];
  });
  switch (change.conditionType) {
    case 1:
      return 1;
    case 2:
      return state.cardUseCounts[source.id] ?? 0;
    case 3:
      return voltageLevel(state.excitement, state.maximumVoltageLevel);
    case 4:
      return Math.min(1, Math.trunc(state.stamina) / state.maximumMental);
    case 5:
      return stats ? state.track.sections.indexOf(sectionAt(state)) - stats.enteredSectionIndex : 0;
    case 6:
      return stats?.skillUseCountsByMember[change.conditionId] ?? 0;
    case 7:
      return stats?.skillUseCountsByIcon[change.conditionId] ?? 0;
    case 8:
      return currentHand.filter((card) => card.mainEffect === change.conditionId).length;
    case 9:
      return Math.fround(
        state.boosts.reduce((sum, boost) => sum + boost.percent, 0) +
          state.skillScoreUps.reduce((sum, boost) => sum + boost.percent, 0) +
          state.temporaryScoreBoosts.reduce((sum, boost) => sum + boost.percent, 0),
      );
    case 10:
      return currentHand.filter((card) => card.style === change.conditionId).length;
    case 11:
      return currentHand.filter((card) => card.member === change.conditionId).length;
    case 12: {
      const mood = moodValue(state);
      return change.conditionId === 2
        ? Math.abs(mood)
        : change.conditionId === 1
          ? Math.max(0, mood)
          : mood > -1
            ? mood
            : -mood;
    }
    case 13:
      return stats?.skillUseCountsByUnit[change.conditionId] ?? 0;
    case 14:
      return currentHand.filter((card) => card.unit === change.conditionId).length;
    case 15:
      return state.cardPool.length - state.deck.length;
  }
  throw new Error('スキルコスト条件が正しくありません。');
}
