import { sectionAt, sectionNumber, moodValue } from '../projection.ts';
import { voltageLevel } from '../live/voltageLevel.ts';
import type { Card, GameState } from '../model.ts';
import type { DrawSuccessInduceEffect } from '../drawSuccessInduceTypes.ts';
import type { EffectApplier } from './induceSkillEffect.ts';
import { deactivateInducedEffects, withDeactivationKey } from './effectInduce.ts';
import { int64ToFloat32 } from '../numeric.ts';

function numToValue(value: bigint): number {
  return Math.fround(int64ToFloat32(value) / Math.fround(10_000));
}

export function evaluateDrawSuccessInduce(
  state: GameState,
  isActive: boolean,
  branchTypeValue: bigint,
  branchValue: bigint,
): boolean {
  const branchType = int32(branchTypeValue);
  if (branchType === 1 || branchType === 3 || (isActive && (branchType === 2 || branchType === 5)))
    return true;
  switch (branchType) {
    case 2: {
      const factor = Math.fround(numToValue(branchValue) / Math.fround(100));
      const currentPercent = Math.fround(
        Math.fround(Math.trunc(state.stamina)) / Math.fround(state.maximumMental),
      );
      return currentPercent <= factor;
    }
    case 4: {
      return Math.fround(moodValue(state)) <= numToValue(branchValue);
    }
    case 5: {
      return voltageLevel(state.excitement, state.maximumVoltageLevel) <= numToValue(branchValue);
    }
    case 6:
      return BigInt(state.track.sections.indexOf(sectionAt(state)) + 1) <= branchValue;
    case 7:
      return BigInt(sectionNumber(state)) === branchValue;
    default:
      return false;
  }
}

export function activateDrawSuccessInduce(
  state: GameState,
  effect: DrawSuccessInduceEffect,
  card: Card | undefined,
  apply: EffectApplier,
): GameState {
  if (!card) return state;
  const handCardStats =
    state.activation?.handCardStatsAtUse[card.id] ?? state.handCardStats[card.id];
  if (!handCardStats) return state;
  const condition = evaluateDrawSuccessInduce(
    state,
    handCardStats.isActive,
    effect.branchType,
    effect.branchValue,
  );
  const selected = condition ? effect.whenTrue : effect.whenFalse;
  if (selected.length === 0) return state;
  const branchType = int32(effect.branchType);
  const disabledType =
    effect.disabledType === undefined ? (branchType === 3 ? 1 : 0) : int32(effect.disabledType);
  const deactivationKey = `${card.id}:${effect.sourceEffectId}`;
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
