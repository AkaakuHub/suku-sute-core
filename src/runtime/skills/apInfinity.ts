import type { LiveAutomaticGaugeRuntimeState } from '../live/automaticGaugeRuntime.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

const apInfinityEffectDetails = [
  'INFINITY_GAUGE_TYPE',
  'INFINITY_GAUGE_DISPLAY_TIME_TYPE',
  'INFINITY_GAUGE_DISPLAY_TIME',
] as const;

export function activateLiveApInfinitySkillEffect(
  state: LiveAutomaticGaugeRuntimeState,
  effect: LiveSkillEffect,
): LiveAutomaticGaugeRuntimeState {
  if (effect.actionType !== 39) {
    throw new Error('Live AP Infinity effect action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    apInfinityEffectDetails,
    'AP Infinity',
  );
  const gaugeType = requireLiveSkillEffectDetailValue(
    details,
    'INFINITY_GAUGE_TYPE',
    'AP Infinity',
  );
  const displayTimeType = requireLiveSkillEffectDetailValue(
    details,
    'INFINITY_GAUGE_DISPLAY_TIME_TYPE',
    'AP Infinity',
  );
  const displayTime = requireLiveSkillEffectDetailValue(
    details,
    'INFINITY_GAUGE_DISPLAY_TIME',
    'AP Infinity',
  );
  if (gaugeType !== 1 || displayTimeType !== 3 || displayTime !== 0) {
    throw new Error('Live AP Infinity effect values differ');
  }
  return { ...state, apInfinity: true };
}
