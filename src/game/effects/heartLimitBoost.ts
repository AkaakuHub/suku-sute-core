import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { moodValue } from '../projection.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';

type HeartLimitBoostEffect = Extract<Effect, { kind: 'heart-limit-boost' }>;

export function activateHeartLimitBoost(
  state: GameState,
  effect: HeartLimitBoostEffect,
  multiplier: number,
  addValue: number,
): GameState {
  const num = Math.fround(int64ToFloat32(effect.num) / Math.fround(10_000));
  if (num < 0) return state;
  const mood =
    effect.bonusMoodTarget === 0
      ? 0
      : calculateLiveSkillMoodCorrection(
          effect.bonusMoodTarget,
          moodValue(state),
          Math.fround(int64ToFloat32(effect.bonusMoodValue) / Math.fround(10_000)),
        );
  const calculated = Math.fround(
    Math.fround(Math.fround(mood + num) + Math.fround(addValue)) * Math.fround(multiplier),
  );
  const value = toInt32(calculated);
  const suppressed = effect.duration.kind === 'none' || effect.duration.kind === 'stage';
  const buff: GameState['heartLimitAdditionalBuffs'][number] = {
    id: state.nextHeartLimitAdditionalBuffId,
    calculation: effect.calculationType === 1 ? 'multiply2' : 'add',
    value,
    target: effect.target,
    remainingUses: toSignedInt32(effect.disabledType) === 1 ? effect.disabledCount : null,
    remainingSeconds:
      suppressed || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      suppressed || effect.duration.kind !== 'sections' ? null : effect.duration.value,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...state,
    heartLimitAdditionalBuffs: [...state.heartLimitAdditionalBuffs, buff],
    nextHeartLimitAdditionalBuffId: state.nextHeartLimitAdditionalBuffId + 1,
  };
}

export function applyHeartLimitBoosts(
  state: GameState,
  card: Card,
  value: number,
): Readonly<{ state: GameState; value: number }> {
  if (!(value > 0)) return { state, value };
  const matched = state.heartLimitAdditionalBuffs.filter((buff) =>
    matchesTarget(buff.target, card),
  );
  if (matched.length === 0) return { state, value };
  let result = Math.fround(value);
  for (const buff of matched) {
    if (buff.calculation === 'add') result = Math.fround(result + Math.fround(buff.value));
  }
  const multiply2Buffs = matched.filter((buff) => buff.calculation === 'multiply2');
  if (multiply2Buffs.length > 0) {
    const sum = multiply2Buffs.reduce(
      (total, buff) => Math.fround(total + Math.fround(buff.value)),
      0,
    );
    result = Math.fround((Math.max(-100, sum) * result) / 100 + result);
  }
  const usedIds = new Set(
    matched.flatMap((buff) => (buff.remainingUses === null ? [] : [buff.id])),
  );
  const expiredIds = new Set(
    matched.flatMap((buff) =>
      buff.remainingUses === null || buff.remainingUses > 1n ? [] : [buff.id],
    ),
  );
  const heartLimitAdditionalBuffs = state.heartLimitAdditionalBuffs.flatMap((buff) => {
    if (expiredIds.has(buff.id)) return [];
    if (usedIds.has(buff.id) && buff.remainingUses !== null)
      return [{ ...buff, remainingUses: buff.remainingUses - 1n }];
    return [buff];
  });
  return { state: { ...state, heartLimitAdditionalBuffs }, value: result };
}

export function advanceHeartLimitAdditionalBuffs(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    heartLimitAdditionalBuffs: state.heartLimitAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireHeartLimitAdditionalBuffSections(state: GameState): GameState {
  return {
    ...state,
    heartLimitAdditionalBuffs: state.heartLimitAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateHeartLimitAdditionalBuffs(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    heartLimitAdditionalBuffs: state.heartLimitAdditionalBuffs.filter(
      (buff) => buff.deactivationKey !== deactivationKey,
    ),
  };
}

function toSignedInt32(value: number): number {
  if (!Number.isFinite(value)) return -2_147_483_648;
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

function toInt32(value: number): number {
  if (!Number.isFinite(value)) return -2_147_483_648;
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

function matchesTarget(
  target: GameState['heartLimitAdditionalBuffs'][number]['target'],
  card: Card,
): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return card.member === target.member;
    case 'unit':
      return card.unit === target.unit;
    case 'card-series':
      return card.tokenSeriesIds?.includes(target.seriesId) ?? false;
  }
}
