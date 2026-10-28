import type { Card, Effect, GameState } from '../model.ts';
import { moodValueWithoutLimit } from '../projection.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { applyMoodValueAdditionalBuffs } from './moodValueBoost.ts';
import { absorbSkillEffect } from './proxySkill.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';

type MoodChangeSkillEffect = Extract<Effect, { kind: 'mood-change-skill' }>;

export function activateMoodChangeSkill(
  state: GameState,
  effect: MoodChangeSkillEffect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const currentMood = moodValueWithoutLimit(state);
  const intNum = Number(BigInt.asIntN(32, effect.num));
  const num = Math.fround(Math.fround(intNum) / Math.fround(10_000));
  let value: number;
  let calculation: 'add' | 'fixed';
  let isPositive = true;
  switch (effect.calculationType) {
    case 1:
      value = multiplyFloat32(Math.fround(num + Math.fround(addValue)), multiplier, effectPower);
      calculation = 'add';
      break;
    case 2:
      value = multiplyFloat32(
        effectPower,
        multiplier,
        Math.fround(
          Math.fround(addValue) +
            Math.fround(Math.fround(num * Math.fround(currentMood)) - Math.fround(currentMood)),
        ),
      );
      isPositive = num >= 1;
      calculation = 'add';
      break;
    case 3:
      value = num;
      calculation = 'fixed';
      break;
    case 4:
      if (currentMood === 0) return state;
      value = multiplyFloat32(Math.fround(num + Math.fround(addValue)), multiplier, effectPower);
      if (currentMood < 0) value = Math.fround(-value);
      calculation = 'add';
      break;
  }
  const additional = applyMoodValueAdditionalBuffs(state, card, Math.abs(value), null);
  const adjustedValue = value < 0 ? -additional.value : additional.value;
  const boosted = applyAction52SkillBoostForCard(additional.state, card, Math.abs(adjustedValue));
  const intMagnitude = toSignedInt32(boosted.value);
  const intValue = adjustedValue < 0 ? toSignedInt32(-intMagnitude) : intMagnitude;
  const candidate = {
    ...boosted.state,
    moodSkillBuffs: [
      ...boosted.state.moodSkillBuffs,
      {
        calculation,
        value: intValue,
        remainingSeconds:
          effect.invocationType === 0x388 ||
          effect.invocationType === 0x38b ||
          effect.duration.kind !== 'milliseconds'
            ? null
            : Math.fround(int64ToFloat32(effect.duration.value) / Math.fround(1000)),
        remainingSections:
          effect.invocationType === 0x388 ||
          effect.invocationType === 0x38b ||
          effect.duration.kind !== 'sections'
            ? null
            : effect.duration.value,
        deactivationKey: effect.deactivationKey ?? null,
      },
    ],
  } satisfies GameState;
  if (isPositive) {
    const delta = moodValueWithoutLimit(candidate) - currentMood;
    const absorption = absorbSkillEffect(boosted.state, 48, BigInt(delta));
    if (absorption.absorbed) return absorption.state;
  }
  return candidate;
}

export function advanceMoodChangeSkills(state: GameState, elapsedSeconds: number): GameState {
  return {
    ...state,
    moodSkillBuffs: state.moodSkillBuffs.flatMap((buff) => {
      if (buff.remainingSeconds === null) return [buff];
      const remainingSeconds = Math.fround(buff.remainingSeconds - Math.fround(elapsedSeconds));
      return remainingSeconds > 0 ? [{ ...buff, remainingSeconds }] : [];
    }),
  };
}

export function expireMoodChangeSkillSections(state: GameState): GameState {
  return {
    ...state,
    moodSkillBuffs: state.moodSkillBuffs.flatMap((buff) => {
      if (buff.remainingSections === null) return [buff];
      const remainingSections = buff.remainingSections - 1n;
      return remainingSections > 0 ? [{ ...buff, remainingSections }] : [];
    }),
  };
}

export function deactivateMoodChangeSkills(state: GameState, deactivationKey: string): GameState {
  return {
    ...state,
    moodSkillBuffs: state.moodSkillBuffs.filter((buff) => buff.deactivationKey !== deactivationKey),
  };
}

function multiplyFloat32(first: number, second: number, third: number): number {
  return Math.fround(Math.fround(first * Math.fround(second)) * Math.fround(third));
}

function toSignedInt32(value: number): number {
  if (!Number.isFinite(value)) return -2_147_483_648;
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}
