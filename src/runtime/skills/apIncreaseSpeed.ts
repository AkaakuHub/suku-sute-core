import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import { roundLiveGaugeIntervalSeconds } from '../live/gaugeTiming.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

const skillRate = 10_000;
const factorRate = 100;

export type LiveApIncreaseSpeedEffect = Readonly<{
  effectId: string;
  calculation:
    | Readonly<{ kind: 'add'; milliseconds: number }>
    | Readonly<{ kind: 'multiply'; factor: number }>;
  duration: LiveSkillEffectDuration;
}>;

export type LiveApIncreaseSpeedState = readonly LiveApIncreaseSpeedEffect[];

export function createLiveApIncreaseSpeedState(): LiveApIncreaseSpeedState {
  return [];
}

export function activateLiveApIncreaseSpeed(
  state: LiveApIncreaseSpeedState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    currentIncreaseIntervalSeconds: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{
  state: LiveApIncreaseSpeedState;
  effectAmount: number;
}> {
  if (
    effect.actionType !== 21 ||
    !Number.isSafeInteger(input.currentMoodValue) ||
    !Number.isFinite(input.currentIncreaseIntervalSeconds) ||
    input.currentIncreaseIntervalSeconds <= 0
  ) {
    throw new Error('Live AP increase speed input is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'AP increase speed');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'CHANGE_AP_INCREASE_SPEED_CALC_TYPE',
      'CHANGE_AP_INCREASE_SPEED_NUM',
      'CHANGE_AP_INCREASE_SPEED_NUM_BONUS_MOOD',
      'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME_TYPE',
      'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME',
    ],
    'AP increase speed',
  );
  const value = requireValue(details, 'CHANGE_AP_INCREASE_SPEED_NUM');
  const bonusMood = details.get('CHANGE_AP_INCREASE_SPEED_NUM_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live AP increase speed bonus mood is absent');
  }
  const moodCorrection = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / skillRate,
  );
  const speedIncrease = Math.fround(
    Math.fround(Math.fround(skillRate - value) - Math.fround(moodCorrection * skillRate)) +
      Math.fround(input.power.addValue * factorRate),
  );
  const poweredSpeedIncrease = Math.fround(speedIncrease * input.power.multiplyFactor);
  const boostedSpeedIncrease =
    poweredSpeedIncrease > 0
      ? Math.ceil(input.applySkillBoost(poweredSpeedIncrease))
      : poweredSpeedIncrease;
  const calculationType = requireValue(details, 'CHANGE_AP_INCREASE_SPEED_CALC_TYPE');
  const calculation = resolveCalculation(
    calculationType,
    value,
    moodCorrection,
    boostedSpeedIncrease,
    input.power,
  );
  const effectAmount = resolveEffectAmount(calculation, input.currentIncreaseIntervalSeconds);
  return {
    effectAmount,
    state: [
      ...state,
      {
        effectId: effect.id,
        calculation,
        duration: createLiveSkillEffectDuration(
          requireValue(details, 'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME_TYPE'),
          requireValue(details, 'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME'),
          'AP increase speed',
        ),
      },
    ],
  };
}

export function advanceLiveApIncreaseSpeedState(
  state: LiveApIncreaseSpeedState,
  input: LiveSkillEffectClock,
): LiveApIncreaseSpeedState {
  return state.flatMap((effect) => {
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

export function resolveLiveApIncreaseIntervalSeconds(
  baseIntervalSeconds: number,
  state: LiveApIncreaseSpeedState,
): number {
  if (!Number.isFinite(baseIntervalSeconds) || baseIntervalSeconds < 0) {
    throw new Error('Live AP increase interval is invalid');
  }
  const addedMilliseconds = state.reduce(
    (value, effect) =>
      effect.calculation.kind === 'add'
        ? Math.fround(value + effect.calculation.milliseconds)
        : value,
    Math.fround(baseIntervalSeconds * 1_000),
  );
  const multiplyDelta = state.reduce(
    (value, effect) =>
      effect.calculation.kind === 'multiply'
        ? Math.fround(value + Math.fround(effect.calculation.factor - 1))
        : value,
    0,
  );
  const multiplyFactor = Math.max(Math.fround(1 + multiplyDelta), 0);
  return roundLiveGaugeIntervalSeconds(
    Math.max(Math.fround(addedMilliseconds * multiplyFactor), 0),
  );
}

function resolveCalculation(
  calculationType: number,
  value: number,
  moodCorrection: number,
  boostedSpeedIncrease: number,
  power: LiveSkillEffectPower,
): LiveApIncreaseSpeedEffect['calculation'] {
  switch (calculationType) {
    case 1:
      return {
        kind: 'add',
        milliseconds: Math.fround(
          Math.fround(Math.fround(value + moodCorrection) + power.addValue) * power.multiplyFactor,
        ),
      };
    case 2:
      return {
        kind: 'multiply',
        factor: Math.fround(Math.fround(skillRate - boostedSpeedIncrease) / skillRate),
      };
    default:
      throw new Error('Live AP increase speed calculation type differs');
  }
}

function resolveEffectAmount(
  calculation: LiveApIncreaseSpeedEffect['calculation'],
  currentIncreaseIntervalSeconds: number,
): number {
  return calculation.kind === 'add'
    ? Math.ceil(
        Math.fround(
          -calculation.milliseconds / Math.fround(currentIncreaseIntervalSeconds * 1_000),
        ),
      )
    : Math.ceil(Math.fround(1 - calculation.factor));
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'AP increase speed');
}
