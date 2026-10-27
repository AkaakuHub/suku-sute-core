import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { moodValue } from '../projection.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../numeric.ts';

type MoodValueBoostEffect = Extract<Effect, { kind: 'mood-value-boost' }>;

export function activateMoodValueBoost(
  state: GameState,
  effect: MoodValueBoostEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
): GameState {
  const intNum = Number(BigInt.asIntN(32, BigInt(Math.trunc(effect.num))));
  const num = Math.fround(Math.fround(intNum) / Math.fround(10_000));
  let mood =
    effect.bonusMoodTarget === 0
      ? 0
      : calculateLiveSkillMoodCorrection(
          effect.bonusMoodTarget,
          moodValue(state),
          Math.fround(int64ToFloat32(effect.bonusMoodValue) / Math.fround(10_000)),
        );
  if (num < 0) mood = Math.fround(-mood);
  let value = Math.fround(
    Math.fround(Math.fround(mood + num) + Math.fround(addValue)) * Math.fround(multiplier),
  );
  if (effect.calculationType === 1) value = toSignedInt32(value);
  if (value > 0) {
    const boosted = applyAction52SkillBoostForCard(state, card, value);
    state = boosted.state;
    value = toSignedInt32(boosted.value);
  }
  return {
    ...state,
    moodValueAdditionalBuffs: [
      ...state.moodValueAdditionalBuffs,
      {
        id: state.nextMoodValueAdditionalBuffId,
        calculation: effect.calculationType === 1 ? 'multiply2' : 'add',
        value,
        target: effect.target,
        paramSeriesIds: effect.tokenCardSeriesIds ?? null,
        remainingUses: 1,
        remainingDeactivations:
          toSignedInt32(effect.disabledType) === 1 ? toSignedInt32(effect.disabledCount) : null,
        remainingSeconds:
          effect.duration.kind !== 'milliseconds'
            ? null
            : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
        remainingSections: effect.duration.kind !== 'sections' ? null : effect.duration.value,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
    nextMoodValueAdditionalBuffId: state.nextMoodValueAdditionalBuffId + 1,
  };
}

export function applyMoodValueAdditionalBuffs(
  state: GameState,
  card: Card | undefined,
  value: number,
  skillTokenSeriesIds: readonly number[] | null,
): Readonly<{ state: GameState; value: number }> {
  if (!(value > 0)) return { state, value };
  const matched = state.moodValueAdditionalBuffs.filter(
    (buff) =>
      matchesTarget(buff.target, card) &&
      (buff.paramSeriesIds === null ||
        (skillTokenSeriesIds !== null &&
          skillTokenSeriesIds.some((id) => buff.paramSeriesIds?.includes(BigInt(id))))),
  );
  if (matched.length === 0) return { state, value };
  let result = Math.fround(value);
  for (const buff of matched) {
    if (buff.calculation === 'add') result = Math.fround(result + Math.fround(buff.value));
  }
  const multiply2 = matched.filter((buff) => buff.calculation === 'multiply2');
  if (multiply2.length > 0) {
    const sum = multiply2.reduce((total, buff) => Math.fround(total + Math.fround(buff.value)), 0);
    result = Math.fround((Math.max(-100, sum) * result) / 100 + result);
  }
  const usedIds = new Set(
    matched.flatMap((buff) => (buff.remainingUses === null ? [] : [buff.id])),
  );
  const expiredIds = new Set(
    matched.flatMap((buff) =>
      buff.remainingUses === null || buff.remainingUses > 1 ? [] : [buff.id],
    ),
  );
  return {
    state: {
      ...state,
      moodValueAdditionalBuffs: state.moodValueAdditionalBuffs.flatMap((buff) => {
        if (expiredIds.has(buff.id)) return [];
        if (usedIds.has(buff.id) && buff.remainingUses !== null)
          return [{ ...buff, remainingUses: buff.remainingUses - 1 }];
        return [buff];
      }),
    },
    value: result,
  };
}

export function advanceMoodValueAdditionalBuffs(
  state: GameState,
  elapsedSeconds: number,
): GameState {
  return {
    ...state,
    moodValueAdditionalBuffs: state.moodValueAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireMoodValueAdditionalBuffSections(state: GameState): GameState {
  return {
    ...state,
    moodValueAdditionalBuffs: state.moodValueAdditionalBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateMoodValueAdditionalBuffs(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    moodValueAdditionalBuffs: state.moodValueAdditionalBuffs.flatMap((buff) => {
      if (buff.deactivationKey !== deactivationKey || buff.remainingDeactivations === null)
        return [buff];
      const remainingDeactivations = buff.remainingDeactivations - 1;
      return remainingDeactivations < 1 ? [] : [{ ...buff, remainingDeactivations }];
    }),
  };
}

function matchesTarget(
  target: GameState['moodValueAdditionalBuffs'][number]['target'],
  card: Card | undefined,
): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return card?.member === target.member;
    case 'unit':
      return card?.unit === target.unit;
    case 'card-series':
      return card?.tokenSeriesIds?.includes(target.seriesId) ?? false;
  }
}

function toSignedInt32(value: number): number {
  if (!Number.isFinite(value)) return -2_147_483_648;
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}
