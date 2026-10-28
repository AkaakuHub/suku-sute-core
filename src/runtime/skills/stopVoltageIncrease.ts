import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveStopVoltageIncreaseEffect = Readonly<{
  effectId: string;
  duration: LiveSkillEffectDuration;
}>;

export type LiveStopVoltageIncreaseState = readonly LiveStopVoltageIncreaseEffect[];

export function createLiveStopVoltageIncreaseState(): LiveStopVoltageIncreaseState {
  return [];
}

export function activateLiveStopVoltageIncrease(
  state: LiveStopVoltageIncreaseState,
  effect: LiveSkillEffect,
): LiveStopVoltageIncreaseState {
  if (effect.actionType !== 26) {
    throw new Error('Live Stop Voltage Increase action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['STOP_VOLTAGE_INCREASE_DISPLAY_TIME_TYPE', 'STOP_VOLTAGE_INCREASE_DISPLAY_TIME'],
    'Stop Voltage Increase',
  );
  return [
    ...state,
    {
      effectId: effect.id,
      duration: createLiveSkillEffectDuration(
        requireLiveSkillEffectDetailValue(
          details,
          'STOP_VOLTAGE_INCREASE_DISPLAY_TIME_TYPE',
          'Stop Voltage Increase',
        ),
        requireLiveSkillEffectDetailValue(
          details,
          'STOP_VOLTAGE_INCREASE_DISPLAY_TIME',
          'Stop Voltage Increase',
        ),
        'Stop Voltage Increase',
      ),
    },
  ];
}

export function advanceLiveStopVoltageIncreaseState(
  state: LiveStopVoltageIncreaseState,
  input: LiveSkillEffectClock,
): LiveStopVoltageIncreaseState {
  return state.flatMap((effect) => {
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}
