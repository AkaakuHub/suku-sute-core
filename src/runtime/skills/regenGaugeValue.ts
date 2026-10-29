import { ceilToInt32 } from '../numeric.ts';
import { validateLiveSkillEffectPower, type LiveSkillEffectPower } from './skillEffectPower.ts';
import type { LiveRegenGaugeApplication } from './regenGaugeSkill.ts';

export function calculateLiveRegenGaugeSkillValue(
  value: number,
  power: LiveSkillEffectPower,
): number {
  validateLiveSkillEffectPower(power, 'Regen gauge');
  return Math.fround(
    Math.fround(
      Math.fround(Math.fround(value) + Math.fround(power.addValue)) *
        Math.fround(power.multiplyFactor),
    ) * Math.fround(power.effectPower),
  );
}

export type LiveRegenGaugeObservation = Readonly<{
  actionType: 5 | 10;
  gauge: 'mental' | 'voltage';
  amount: number;
}>;

export function resolveLiveRegenGaugeObservation(
  application: LiveRegenGaugeApplication,
  maximumMental: number,
): LiveRegenGaugeObservation | null {
  if (application.calculationType !== 1) return null;
  const value =
    application.gauge === 'mental'
      ? Math.fround(Math.fround(maximumMental) * Math.fround(Math.fround(application.value) / 100))
      : Math.fround(application.value);
  return {
    actionType: application.gauge === 'mental' ? 5 : 10,
    gauge: application.gauge,
    amount: ceilToInt32(value),
  };
}
