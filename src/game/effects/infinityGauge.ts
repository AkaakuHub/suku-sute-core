import { voltageThreshold } from '../live/voltageLevel.ts';
import type { Effect, GameState } from '../model.ts';
import { induceMentalHearts } from './mentalHeartInduce.ts';
import { convertVoltageIncrease } from './voltageConversion.ts';
import { induceSkillEffects, type EffectApplier } from './induceSkillEffect.ts';
import { addMasteryVoltage, notifyVoltageBaseLevelChange } from '../resources.ts';

export function activateInfinityGauge(
  state: GameState,
  effect: Extract<Effect, { kind: 'infinity-gauge' }>,
  applyEffect?: EffectApplier,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const bloom = state.bloom;
  const suspended = bloom !== null;
  const active = {
    gauge: effect.gauge,
    remainingSeconds:
      !suppressDuration && effect.duration.kind === 'milliseconds'
        ? Math.fround(effect.duration.value / 1000)
        : null,
    remainingSections:
      !suppressDuration && effect.duration.kind === 'sections' ? effect.duration.value : null,
    suspended,
    deactivationKey: effect.deactivationKey ?? null,
  };
  const firstActivation = !state.gaugeInfinities.some(
    (infinity) => infinity.gauge === effect.gauge,
  );
  let next: GameState = { ...state, gaugeInfinities: [...state.gaugeInfinities, active] };
  if (bloom) {
    const progress = BigInt.asIntN(32, bloom.progress + 500n);
    return { ...next, bloom: { ...bloom, progress: progress < 0n ? 0n : progress } };
  }
  if (!firstActivation) return next;
  if (effect.gauge === 'ap') return { ...next, energy: next.maxEnergy };
  if (effect.gauge === 'mental' && !state.resting)
    return induceMentalHearts(
      { ...next, stamina: next.maximumMental, mentalTimerSeconds: 0 },
      next.maximumMental,
    );
  if (effect.gauge === 'voltage') {
    const excitement = voltageThreshold(next.maximumVoltageLevel);
    next = { ...next, excitement };
    const mastery = addMasteryVoltage(next, Math.fround(excitement - state.excitement));
    next = mastery.state;
    let voltageUp = mastery.gain;
    if (voltageUp > 0) {
      const conversion = convertVoltageIncrease(next, BigInt(voltageUp), undefined, applyEffect);
      next = conversion.state;
      if (conversion.converted) voltageUp = 0;
    }
    next = notifyVoltageBaseLevelChange(state, next, applyEffect);
    if (voltageUp > 0 && applyEffect)
      next = induceSkillEffects(next, 'voltage', voltageUp, applyEffect);
  }
  return next;
}
