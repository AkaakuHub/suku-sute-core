import { int64ToFloat32 } from '../../runtime/numeric.ts';
import { voltageThreshold } from '../live/voltageLevel.ts';
import type { Effect, GameState } from '../model.ts';
import { induceMentalHearts } from './mentalHeartInduce.ts';
import { convertVoltageIncrease } from './voltageConversion.ts';
import { induceSkillEffects, type EffectApplier } from './induceSkillEffect.ts';
import { addMasteryVoltage, notifyVoltageBaseLevelChange } from '../resources.ts';
import { addLiveGenesisGauge } from '../../runtime/skills/genesisSkill.ts';

export function activateInfinityGauge(
  state: GameState,
  effect: Extract<Effect, { kind: 'infinity-gauge' }>,
  applyEffect?: EffectApplier,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const suppressDuration = effect.invocationType === 0x388 || effect.invocationType === 0x38b;
  const suspended = state.genesis.effects.length > 0;
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
  if (suspended) {
    return {
      ...next,
      genesis: addLiveGenesisGauge(state.genesis, {
        actionType: 39,
        gaugeType: 0,
        effectValue: 500,
      }),
    };
  }
  if (!firstActivation) return next;
  if (effect.gauge === 'ap') return { ...next, ap: { ...next.ap, currentAp: next.ap.maxAp } };
  if (effect.gauge === 'mental' && !state.mental.mentalDown)
    return induceMentalHearts(
      { ...next, mental: { ...next.mental, currentMental: next.maximumMental, timerSeconds: 0 } },
      next.maximumMental,
    );
  if (effect.gauge === 'voltage') {
    const currentVoltage = voltageThreshold(next.maximumVoltageLevel);
    next = { ...next, voltage: { ...next.voltage, currentVoltage } };
    const mastery = addMasteryVoltage(
      next,
      int64ToFloat32(BigInt.asIntN(64, currentVoltage - state.voltage.currentVoltage)),
    );
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
