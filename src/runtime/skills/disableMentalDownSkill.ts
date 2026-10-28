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

export type LiveDisableMentalDownEffect = Readonly<{
  effectId: string;
  duration: LiveSkillEffectDuration;
}>;

export type LiveDisableMentalDownState = Readonly<{
  effects: readonly LiveDisableMentalDownEffect[];
}>;

export function createLiveDisableMentalDownState(): LiveDisableMentalDownState {
  return { effects: [] };
}

export function createLiveDisableMentalDownEffect(
  effect: LiveSkillEffect,
): LiveDisableMentalDownEffect {
  if (effect.actionType !== 34) {
    throw new Error('Live DisableMentalDown action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['DISABLE_MENTAL_DOWN_DISPLAY_TIME_TYPE', 'DISABLE_MENTAL_DOWN_DISPLAY_TIME'],
    'DisableMentalDown',
  );
  return {
    effectId: effect.id,
    duration: createLiveSkillEffectDuration(
      requireLiveSkillEffectDetailValue(
        details,
        'DISABLE_MENTAL_DOWN_DISPLAY_TIME_TYPE',
        'DisableMentalDown',
      ),
      requireLiveSkillEffectDetailValue(
        details,
        'DISABLE_MENTAL_DOWN_DISPLAY_TIME',
        'DisableMentalDown',
      ),
      'DisableMentalDown',
    ),
  };
}

export function activateLiveDisableMentalDownEffect(
  state: LiveDisableMentalDownState,
  effect: LiveDisableMentalDownEffect,
): LiveDisableMentalDownState {
  return { effects: [...state.effects, effect] };
}

export function advanceLiveDisableMentalDownState(
  state: LiveDisableMentalDownState,
  input: LiveSkillEffectClock,
): LiveDisableMentalDownState {
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
  };
}
