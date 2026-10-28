import { ceilToInt32 } from '../numeric.ts';
import type { LiveApIncreaseSpeedEffect } from './apIncreaseSpeed.ts';

export function observeLiveApIncreaseSpeedEffect(
  calculation: LiveApIncreaseSpeedEffect['calculation'],
  currentIncreaseIntervalSeconds: number,
): Readonly<{ effectAmount: number; absorptionAmount: number | null }> {
  if (!Number.isFinite(currentIncreaseIntervalSeconds) || currentIncreaseIntervalSeconds <= 0)
    throw new Error('Live AP increase interval is invalid');
  const factor =
    calculation.kind === 'multiply'
      ? Math.fround(1 - Math.fround(calculation.factor))
      : Math.fround(
          -Math.fround(calculation.milliseconds) /
            Math.fround(currentIncreaseIntervalSeconds * 1000),
        );
  const observed = Math.fround(factor * 100);
  const absorptionAmount = observed < 0 ? null : ceilToInt32(observed);
  return {
    effectAmount: absorptionAmount === null ? observed : Math.fround(absorptionAmount),
    absorptionAmount,
  };
}
