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

export type LiveFixedParameterTarget = 1 | 2 | 3;
export type LiveFixedParameterCalculation = 1 | 2 | 3;

export type LiveFixedParameterExtendEffect = Readonly<{
  effectId: string;
  target: LiveFixedParameterTarget;
  calculation: LiveFixedParameterCalculation;
  value: number;
  duration: LiveSkillEffectDuration;
}>;

export type LiveFixedParameterExtendState = readonly LiveFixedParameterExtendEffect[];

export function createLiveFixedParameterExtendState(): LiveFixedParameterExtendState {
  return [];
}

export function activateLiveFixedParameterExtend(
  state: LiveFixedParameterExtendState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    applySkillBoost: (value: number) => number;
  }>,
): LiveFixedParameterExtendState {
  validateState(state);
  if (effect.actionType !== 58) {
    throw new Error('Live FixedParameterExtend action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'FIXED_PARAM_TARGET',
      'FIXED_PARAM_CALC_TYPE',
      'FIXED_PARAM_VALUE',
      'FIXED_PARAM_DURATION_TYPE',
      'FIXED_PARAM_DURATION_VALUE',
    ],
    'FixedParameterExtend',
  );
  const target = requireTarget(
    requireLiveSkillEffectDetailValue(details, 'FIXED_PARAM_TARGET', 'FixedParameterExtend'),
  );
  const calculation = requireCalculation(
    requireLiveSkillEffectDetailValue(details, 'FIXED_PARAM_CALC_TYPE', 'FixedParameterExtend'),
  );
  const baseValue = requireLiveSkillEffectDetailValue(
    details,
    'FIXED_PARAM_VALUE',
    'FixedParameterExtend',
  );
  const boostedValue = calculation === 3 ? baseValue : input.applySkillBoost(baseValue);
  if (!Number.isFinite(boostedValue)) {
    throw new Error('Live FixedParameterExtend boosted value is invalid');
  }
  return [
    ...state,
    {
      effectId: effect.id,
      target,
      calculation,
      value: Math.ceil(boostedValue),
      duration: createLiveSkillEffectDuration(
        requireLiveSkillEffectDetailValue(
          details,
          'FIXED_PARAM_DURATION_TYPE',
          'FixedParameterExtend',
        ),
        requireLiveSkillEffectDetailValue(
          details,
          'FIXED_PARAM_DURATION_VALUE',
          'FixedParameterExtend',
        ),
        'FixedParameterExtend',
      ),
    },
  ];
}

export function advanceLiveFixedParameterExtendState(
  state: LiveFixedParameterExtendState,
  input: LiveSkillEffectClock,
): LiveFixedParameterExtendState {
  validateState(state);
  return state.flatMap((effect) => {
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

export function deactivateLiveFixedParameterExtend(
  state: LiveFixedParameterExtendState,
  effectId: string,
): LiveFixedParameterExtendState {
  validateState(state);
  return state.filter((effect) => effect.effectId !== effectId);
}

export function resolveLiveFixedParameterValue(
  state: LiveFixedParameterExtendState,
  target: LiveFixedParameterTarget,
  origin: number,
): number {
  validateState(state);
  if (!Number.isSafeInteger(origin)) {
    throw new Error('Live FixedParameterExtend origin is invalid');
  }
  return state.reduce((value, effect) => {
    if (effect.target !== target) return value;
    switch (effect.calculation) {
      case 1:
        return value + effect.value;
      case 2:
        return Math.ceil(Math.fround(value * Math.fround(1 + Math.fround(effect.value) / 10_000)));
      case 3:
        return effect.value;
    }
    throw new Error('Live FixedParameterExtend calculation is invalid');
  }, origin);
}

export function resolveLiveFixedMaximumAp(
  state: LiveFixedParameterExtendState,
  origin: number,
): number {
  return Math.min(Math.max(resolveLiveFixedParameterValue(state, 1, origin), 0), 100);
}

export function resolveLiveFixedMaximumVoltageLevel(
  state: LiveFixedParameterExtendState,
  origin: number,
  maximumSupportedLevel: number,
): number {
  if (!Number.isSafeInteger(maximumSupportedLevel) || maximumSupportedLevel < 1) {
    throw new Error('Live maximum supported Voltage level is invalid');
  }
  return Math.min(
    Math.max(resolveLiveFixedParameterValue(state, 2, origin), 1),
    maximumSupportedLevel,
  );
}

export function resolveLiveFixedMaximumMental(
  state: LiveFixedParameterExtendState,
  origin: number,
  baseMultiple = 1,
): number {
  if (!Number.isSafeInteger(baseMultiple) || baseMultiple < 1) {
    throw new Error('Live Mental base multiple is invalid');
  }
  return Math.min(
    Math.max(resolveLiveFixedParameterValue(state, 3, origin), 1),
    Math.trunc((origin * 10) / baseMultiple),
  );
}

function requireTarget(value: number): LiveFixedParameterTarget {
  if (value !== 1 && value !== 2 && value !== 3) {
    throw new Error('Live FixedParameterExtend target is invalid');
  }
  return value;
}

function requireCalculation(value: number): LiveFixedParameterCalculation {
  if (value !== 1 && value !== 2 && value !== 3) {
    throw new Error('Live FixedParameterExtend calculation is invalid');
  }
  return value;
}

function validateState(state: LiveFixedParameterExtendState): void {
  for (const effect of state) {
    if (
      !/^[1-9]\d*$/.test(effect.effectId) ||
      !Number.isSafeInteger(effect.value) ||
      (effect.target !== 1 && effect.target !== 2 && effect.target !== 3) ||
      (effect.calculation !== 1 && effect.calculation !== 2 && effect.calculation !== 3)
    ) {
      throw new Error('Live FixedParameterExtend state is invalid');
    }
  }
}
