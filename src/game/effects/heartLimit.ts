import { calculateLiveSkillMoodCorrection } from '../../runtime/live/skillMood.ts';
import { changeLiveHeartLimit } from '../../runtime/live/heartRuntime.ts';
import { moodValue } from '../projection.ts';
import { absorbSkillEffect } from './proxySkill.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { applyHeartLimitBoosts } from './heartLimitBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';
import type { Card, Effect, GameState } from '../model.ts';

type HeartLimitChangeEffect = Extract<Effect, { kind: 'heart-limit-change' }>;
type HeartLimitBuff = GameState['heartLimitBuffs'][number];

const heartLimitMaximum = 10_000_000;
const noHeartLimitBuff = Math.fround(-3.4028234663852886e38);

export function applyHeartLimit(state: GameState, amount: number): GameState {
  return materializeHeartLimit(
    state,
    state.heartLimitBase + Math.ceil(amount),
    state.heartLimitBuffs,
  );
}

export function heartLimitValueWithoutLimit(state: GameState): number {
  return Math.max(
    0,
    Math.trunc(calculateHeartLimitWithoutLimit(state.heartLimitBase, state.heartLimitBuffs)),
  );
}

export function applyHeartLimitEffect(
  state: GameState,
  amount: number,
  card: Card | undefined,
  effectPower: number,
): GameState {
  const base = Math.fround(amount * effectPower);
  const boosted = applyAction52SkillBoostForCard(state, card, base);
  return applyHeartLimit(boosted.state, Math.trunc(boosted.value));
}

export function activateHeartLimitChange(
  state: GameState,
  effect: HeartLimitChangeEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
): GameState {
  if (!card) return state;
  const moodBonus =
    effect.bonusMoodTarget === 0
      ? 0
      : calculateLiveSkillMoodCorrection(
          effect.bonusMoodTarget,
          moodValue(state),
          int64ToFloat32(effect.bonusMoodValue),
        );
  const num = Math.fround(int64ToFloat32(effect.num) / Math.fround(10_000));
  const baseLimit = state.heartLimitBase;
  const oldLimitWithoutLimit = Math.trunc(
    calculateHeartLimitWithoutLimit(baseLimit, state.heartLimitBuffs),
  );
  const oldLimit = Math.max(0, oldLimitWithoutLimit);
  const correction = Math.fround(moodBonus + num);
  const calculated =
    effect.calculationType === 1
      ? Math.fround(Math.fround(correction + addValue) * multiplier)
      : Math.fround(
          Math.fround(
            Math.fround(addValue + Math.fround(correction * Math.fround(oldLimit))) - oldLimit,
          ) * multiplier,
        );
  const powered = Math.fround(calculated * effectPower);
  const additional = applyHeartLimitBoosts(state, card, powered);
  const action52 =
    additional.value > 0
      ? applyAction52SkillBoostForCard(additional.state, card, additional.value)
      : { state: additional.state, value: noHeartLimitBuff };
  const buffValue =
    additional.value <= 0 || action52.value === Number.POSITIVE_INFINITY
      ? noHeartLimitBuff
      : toInt32(action52.value);
  const buff: HeartLimitBuff = {
    id: state.nextHeartLimitBuffId,
    calculation: effect.calculationType === 1 ? 'add' : 'multiply',
    value: buffValue,
    remainingSeconds:
      effect.invocationType === 0x388 ||
      effect.invocationType === 0x38b ||
      effect.duration.kind !== 'milliseconds'
        ? null
        : Math.fround(int64ToFloat32(effect.duration.value) / 1000),
    remainingSections:
      effect.invocationType === 0x388 ||
      effect.invocationType === 0x38b ||
      effect.duration.kind !== 'sections'
        ? null
        : effect.duration.value,
    deactivationKey: effect.deactivationKey ?? null,
  };
  const buffs = [...state.heartLimitBuffs, buff];
  const nextLimit = Math.trunc(calculateHeartLimitWithoutLimit(baseLimit, buffs));
  const delta = nextLimit - oldLimitWithoutLimit;
  const absorb = effect.calculationType === 1 || correction >= 1;
  if (absorb && delta > -1) {
    const absorbed = absorbSkillEffect(action52.state, 25, BigInt(delta));
    if (absorbed.absorbed) return absorbed.state;
  }
  return materializeHeartLimit(
    {
      ...action52.state,
      nextHeartLimitBuffId: state.nextHeartLimitBuffId + 1,
    },
    baseLimit,
    buffs,
  );
}

function toInt32(value: number): number {
  if (!Number.isFinite(value)) return -2_147_483_648;
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function advanceHeartLimitBuffs(state: GameState, elapsedSeconds: number): GameState {
  const heartLimitBuffs = state.heartLimitBuffs.flatMap((buff) => {
    if (buff.remainingSeconds === null) return [buff];
    const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
  });
  return heartLimitBuffs.length === state.heartLimitBuffs.length
    ? state
    : materializeHeartLimit(state, state.heartLimitBase, heartLimitBuffs);
}

export function expireHeartLimitBuffSections(state: GameState): GameState {
  const heartLimitBuffs = state.heartLimitBuffs.flatMap((buff) => {
    if (buff.remainingSections === null) return [buff];
    const remainingSections = buff.remainingSections - 1n;
    return remainingSections > 0n ? [{ ...buff, remainingSections }] : [];
  });
  return heartLimitBuffs.length === state.heartLimitBuffs.length
    ? state
    : materializeHeartLimit(state, state.heartLimitBase, heartLimitBuffs);
}

export function deactivateHeartLimitBuffs(state: GameState, deactivationKey: string): GameState {
  const heartLimitBuffs = state.heartLimitBuffs.filter(
    (buff) => buff.deactivationKey !== deactivationKey,
  );
  return heartLimitBuffs.length === state.heartLimitBuffs.length
    ? state
    : materializeHeartLimit(state, state.heartLimitBase, heartLimitBuffs);
}

function calculateHeartLimitWithoutLimit(base: number, buffs: readonly HeartLimitBuff[]): number {
  let value = base;
  for (const buff of buffs) {
    if (buff.calculation === 'add') value += buff.value;
  }
  const multipliers = buffs.filter((buff) => buff.calculation === 'multiply');
  if (multipliers.length === 0) return value;
  const sum = multipliers.reduce(
    (total, buff) => Math.fround(total + Math.fround(buff.value - 1)),
    0,
  );
  return Math.fround(Math.max(sum, -1) + 1) * value;
}

function materializeHeartLimit(
  state: GameState,
  base: number,
  heartLimitBuffs: readonly HeartLimitBuff[],
): GameState {
  const heartLimit = Math.min(
    heartLimitMaximum,
    Math.max(0, Math.trunc(calculateHeartLimitWithoutLimit(base, heartLimitBuffs))),
  );
  return {
    ...state,
    hearts: changeLiveHeartLimit(state.hearts, heartLimit).state,
    heartLimitBase: base,
    heartLimitBuffs,
  };
}
