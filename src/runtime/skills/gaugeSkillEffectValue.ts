import type { LiveSkillEffect } from './skillTypes.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveGaugeSkillEffectContract = Readonly<{
  label: string;
  calculationType: string;
  baseValue: string;
  bonusMood: string;
  additionalDetailTypes?: readonly string[];
}>;

export function resolveLiveGaugeSkillEffectAmount(
  effect: LiveSkillEffect,
  input: Readonly<{
    currentMoodValue: number;
    power: LiveSkillEffectPower;
  }>,
  contract: LiveGaugeSkillEffectContract,
): number {
  if (!Number.isSafeInteger(input.currentMoodValue)) {
    throw new Error(`Live ${contract.label} mood is invalid`);
  }
  validateLiveSkillEffectPower(input.power, contract.label);
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      contract.calculationType,
      contract.baseValue,
      contract.bonusMood,
      ...(contract.additionalDetailTypes ?? []),
    ],
    contract.label,
  );
  if (requireLiveSkillEffectDetailValue(details, contract.calculationType, contract.label) !== 1) {
    throw new Error(`Live ${contract.label} calculation type differs`);
  }
  const bonusMood = details.get(contract.bonusMood);
  if (bonusMood === undefined) {
    throw new Error(`Live ${contract.label} bonus mood is absent`);
  }
  const baseValue = Math.fround(
    requireLiveSkillEffectDetailValue(details, contract.baseValue, contract.label) / 10_000,
  );
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  return Math.trunc(
    Math.fround(
      Math.fround(Math.fround(moodValue + baseValue) + input.power.addValue) *
        input.power.multiplyFactor,
    ) * input.power.effectPower,
  );
}
