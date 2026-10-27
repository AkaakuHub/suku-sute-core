import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { moodValue } from '../projection.ts';
import type { Action52BuffEffect, Action52BuffTarget } from '../skillBoostTypes.ts';
import type { Card, GameState } from '../model.ts';
import { int64ToFloat32 } from '../numeric.ts';

export function activateAction52SkillBoost(
  state: GameState,
  effect: Action52BuffEffect,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const moodBonus = effect.moodBonus
    ? calculateLiveSkillMoodCorrection(
        effect.moodBonus.target,
        moodValue(state),
        effect.moodBonus.perPoint,
      )
    : 0;
  const num = Number(BigInt.asIntN(32, BigInt(Math.trunc(effect.num))));
  const percent = Math.fround(Math.fround(Math.fround(num) / 10_000) + moodBonus);
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const buff: GameState['action52Buffs'][number] = {
    id: state.nextAction52BuffId,
    percent,
    target: effect.target,
    remainingSeconds:
      suppressDuration || effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      suppressDuration || effect.duration.kind !== 'sections' ? null : effect.duration.value,
    remainingUses: effect.uses,
    skillTokenSeriesIds: effect.skillTokenSeriesIds ?? null,
    deactivationKey: effect.deactivationKey ?? null,
  };
  return {
    ...state,
    action52Buffs: [...state.action52Buffs, buff],
    nextAction52BuffId: state.nextAction52BuffId + 1,
  };
}

export function applyAction52SkillBoost(
  state: GameState,
  card: Card | undefined,
  value: number,
  skillTokenSeriesIds?: readonly number[],
): Readonly<{ state: GameState; value: number }> {
  if (!(value > 0)) return { state, value };
  const matched = state.action52Buffs.filter(
    (buff) =>
      matchesTarget(buff.target, card) &&
      (buff.skillTokenSeriesIds === null ||
        (skillTokenSeriesIds !== undefined &&
          skillTokenSeriesIds.some((seriesId) =>
            buff.skillTokenSeriesIds?.includes(BigInt(seriesId)),
          ))),
  );
  if (matched.length === 0) return { state, value };
  const percent = matched.reduce((sum, buff) => Math.fround(sum + Math.fround(buff.percent)), 0);
  const input = Math.fround(value);
  const adjusted = Math.fround((Math.max(-100, percent) * input) / 100 + input);
  const usedIds = new Set(
    matched.flatMap((buff) => (buff.remainingUses === null ? [] : [buff.id])),
  );
  const removedIds = new Set(
    matched.flatMap((buff) =>
      buff.remainingUses !== null && buff.remainingUses <= 1n ? [buff.id] : [],
    ),
  );
  const action52Buffs = state.action52Buffs.flatMap((buff) => {
    if (removedIds.has(buff.id)) return [];
    if (usedIds.has(buff.id) && buff.remainingUses !== null)
      return [{ ...buff, remainingUses: buff.remainingUses - 1n }];
    return [buff];
  });
  return { state: { ...state, action52Buffs }, value: adjusted };
}

export function applyAction52SkillBoostForCard(
  state: GameState,
  card: Card | undefined,
  value: number,
): Readonly<{ state: GameState; value: number }> {
  return card ? applyAction52SkillBoost(state, card, value) : { state, value };
}

export function advanceAction52SkillBoosts(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    action52Buffs: state.action52Buffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireAction52SkillBoostSections(state: GameState): GameState {
  return {
    ...state,
    action52Buffs: state.action52Buffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateAction52SkillBoosts(
  state: GameState,
  deactivationKey: string,
): GameState {
  return {
    ...state,
    action52Buffs: state.action52Buffs.filter((buff) => buff.deactivationKey !== deactivationKey),
  };
}

function matchesTarget(target: Action52BuffTarget, card: Card | undefined): boolean {
  switch (target.kind) {
    case 'all':
      return true;
    case 'member':
      return card?.member === target.member;
    case 'unit':
      return card?.unit === target.unit;
    case 'token-series':
      return card?.tokenSeriesIds?.includes(target.seriesId) ?? false;
  }
}
