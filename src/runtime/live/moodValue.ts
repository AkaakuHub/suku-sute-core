import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from '../skills/skillEffectDuration.ts';
import type { LiveSkillEffectPower } from '../skills/skillEffectPower.ts';
import { validateLiveSkillEffectPower } from '../skills/skillEffectPower.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from '../skills/skillEffectValue.ts';

export type LiveMoodValueBuff = Readonly<{
  effectId: string;
  calculation: 'add' | 'fixed';
  value: number;
  duration: LiveSkillEffectDuration;
}>;

export function createLiveMoodValueBuffs(): readonly LiveMoodValueBuff[] {
  return [];
}

export function activateLiveMoodValueBuff(
  buffs: readonly LiveMoodValueBuff[],
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applyAdditionalBuff: (value: number) => number;
    applySkillBoost: (value: number) => number;
  }>,
): readonly LiveMoodValueBuff[] {
  if (effect.actionType !== 48 || !Number.isSafeInteger(input.currentMoodValue)) {
    throw new Error('Live Change Mood Value input is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'Change Mood Value');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'CHANGE_MOOD_VALUE_CALC_TYPE',
      'CHANGE_MOOD_VALUE_NUM',
      'CHANGE_MOOD_VALUE_DISPLAY_TIME_TYPE',
      'CHANGE_MOOD_VALUE_DISPLAY_TIME',
    ],
    'Change Mood Value',
  );
  const calculationType = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_MOOD_VALUE_CALC_TYPE',
    'Change Mood Value',
  );
  if (calculationType !== 1 && calculationType !== 2 && calculationType !== 3) {
    throw new Error('Live Change Mood Value calculation type differs');
  }
  const sourceValue = Math.fround(
    requireLiveSkillEffectDetailValue(details, 'CHANGE_MOOD_VALUE_NUM', 'Change Mood Value') /
      10_000,
  );
  if (sourceValue === 0) {
    throw new Error('Live Change Mood Value is zero');
  }
  const poweredValue = resolvePoweredMoodValue(
    calculationType,
    sourceValue,
    input.currentMoodValue,
    input.power,
  );
  const additionalValue = input.applyAdditionalBuff(poweredValue);
  const boostedValue = applySignedValue(additionalValue, input.applySkillBoost);
  const value = roundAwayFromZero(boostedValue);
  const active = {
    effectId: effect.id,
    calculation: calculationType === 3 ? 'fixed' : 'add',
    value,
    duration: createLiveSkillEffectDuration(
      requireLiveSkillEffectDetailValue(
        details,
        'CHANGE_MOOD_VALUE_DISPLAY_TIME_TYPE',
        'Change Mood Value',
      ),
      requireLiveSkillEffectDetailValue(
        details,
        'CHANGE_MOOD_VALUE_DISPLAY_TIME',
        'Change Mood Value',
      ),
      input.currentTimeSeconds,
      'Change Mood Value',
    ),
  } satisfies LiveMoodValueBuff;
  return [...buffs, active];
}

export function advanceLiveMoodValueBuffs(
  buffs: readonly LiveMoodValueBuff[],
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): readonly LiveMoodValueBuff[] {
  return buffs.flatMap((buff) => {
    const duration = advanceLiveSkillEffectDuration(buff.duration, input);
    return duration === null ? [] : [{ ...buff, duration }];
  });
}

export function resolveLiveMoodValue(
  baseValue: number | null,
  buffs: readonly LiveMoodValueBuff[],
): number | null {
  if (baseValue === null) return null;
  if (!Number.isSafeInteger(baseValue)) {
    throw new Error('Live Mood base value is invalid');
  }
  const value = buffs.reduce((current, buff) => {
    return buff.calculation === 'fixed' ? buff.value : Math.fround(current + buff.value);
  }, baseValue);
  return Math.trunc(Math.min(100, Math.max(-100, value)));
}

function resolvePoweredMoodValue(
  calculationType: 1 | 2 | 3,
  sourceValue: number,
  currentMoodValue: number,
  power: LiveSkillEffectPower,
): number {
  if (calculationType === 3) return sourceValue;
  const baseValue =
    calculationType === 1
      ? sourceValue
      : Math.fround(Math.fround(sourceValue * currentMoodValue) - currentMoodValue);
  return Math.fround(
    Math.fround(Math.fround(baseValue + power.addValue) * power.multiplyFactor) * power.effectPower,
  );
}

function applySignedValue(value: number, apply: (absoluteValue: number) => number): number {
  return value < 0 ? -apply(-value) : apply(value);
}

function roundAwayFromZero(value: number): number {
  return value < 0 ? Math.floor(value) : Math.ceil(value);
}
