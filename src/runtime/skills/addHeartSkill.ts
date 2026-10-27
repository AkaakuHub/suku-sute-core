import type { LiveSkillEffect } from './skillTypes.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveAddHeartOption = Readonly<{
  calculation:
    | Readonly<{ kind: 'beat-ratio'; value: number }>
    | Readonly<{ kind: 'fixed'; value: number }>;
  lifeTimeSeconds: number;
  effectPower: number;
}>;

export function resolveLiveAddHeartOption(
  effect: LiveSkillEffect,
  input: Readonly<{
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveAddHeartOption {
  if (effect.actionType !== 1 || !Number.isSafeInteger(input.currentMoodValue)) {
    throw new Error('Live Add Heart input is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'Add Heart');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'HEART_CALC_TYPE',
      'HEART_NUM_BASE',
      'HEART_NUM_BONUS_MOOD',
      'HEART_DISPLAY_TIME_TYPE',
      'HEART_DISPLAY_TIME',
    ],
    'Add Heart',
  );
  const calculationType = requireValue(details, 'HEART_CALC_TYPE');
  if (calculationType !== 1 && calculationType !== 2) {
    throw new Error('Live Add Heart calculation type differs');
  }
  const bonusMood = details.get('HEART_NUM_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live Add Heart bonus mood is absent');
  }
  const baseValue = Math.fround(requireValue(details, 'HEART_NUM_BASE') / 10_000);
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  const poweredValue = Math.fround(
    Math.fround(Math.fround(moodValue + baseValue) + input.power.addValue) *
      input.power.multiplyFactor,
  );
  const roundedValue = Math.ceil(poweredValue);
  const boostedValue = roundedValue > 0 ? Math.ceil(input.applySkillBoost(roundedValue)) : 0;
  const displayTimeType = requireValue(details, 'HEART_DISPLAY_TIME_TYPE');
  const displayTime = requireValue(details, 'HEART_DISPLAY_TIME');
  if (displayTimeType !== 1 && displayTimeType !== 2 && displayTimeType !== 3) {
    throw new Error('Live Add Heart display time type differs');
  }
  if (displayTime < 0 || (displayTimeType === 2 && displayTime === 0)) {
    throw new Error('Live Add Heart display time differs');
  }
  return {
    calculation:
      calculationType === 1
        ? { kind: 'beat-ratio', value: boostedValue }
        : { kind: 'fixed', value: boostedValue },
    lifeTimeSeconds: displayTimeType === 1 ? displayTime / 1000 : 9999,
    effectPower: input.power.effectPower,
  };
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Add Heart');
}
