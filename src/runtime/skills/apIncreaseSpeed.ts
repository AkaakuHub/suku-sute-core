import { observeLiveApIncreaseSpeedEffect } from './apIncreaseSpeedObservation.ts';
import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import { roundLiveGaugeIntervalSeconds } from '../live/gaugeTiming.ts';
import type { LiveApIncreaseSpeedChange } from './apIncreaseSpeedEffect.ts';
import { ceilToInt32, int64ToInt32, int64ToFloat32, isInt64 } from '../numeric.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';

const skillRate = 10_000;
const factorRate = 100;

export type LiveApIncreaseSpeedEffect = Readonly<{
  effectId: string | null;
  deactivationKey: string | null;
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
  effect: LiveApIncreaseSpeedChange,
  input: Readonly<{
    effectId: string | null;
    currentMoodValue: number;
    currentIncreaseIntervalMilliseconds: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{
  state: LiveApIncreaseSpeedState;
  effectAmount: number;
  absorptionAmount: number | null;
  calculation: LiveApIncreaseSpeedEffect['calculation'];
}> {
  if (
    ![effect.num, effect.bonusMoodValue, effect.displayTimeType, effect.displayTime].every(
      isInt64,
    ) ||
    (effect.calculationType !== 1 && effect.calculationType !== 2) ||
    !Number.isSafeInteger(input.currentMoodValue) ||
    !Number.isFinite(input.currentIncreaseIntervalMilliseconds) ||
    input.currentIncreaseIntervalMilliseconds <= 0
  ) {
    throw new Error('Live AP increase speed input is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'AP increase speed');
  const displayTimeType = int64ToInt32(effect.displayTimeType);
  if (displayTimeType === 2 && effect.displayTime === 0n)
    throw new Error('Live AP increase speed display time is invalid');
  const moodCorrection = calculateLiveSkillMoodCorrection(
    effect.bonusMoodTarget,
    input.currentMoodValue,
    Math.fround(int64ToFloat32(effect.bonusMoodValue) / skillRate),
  );
  const speedIncrease = Math.fround(
    Math.fround(Math.fround(input.power.addValue) * factorRate) +
      Math.fround(
        int64ToFloat32(BigInt.asIntN(64, BigInt(skillRate) - effect.num)) -
          Math.fround(moodCorrection * skillRate),
      ),
  );
  const poweredSpeedIncrease = Math.fround(speedIncrease * Math.fround(input.power.multiplyFactor));
  const boostedSpeedIncrease =
    poweredSpeedIncrease > 0
      ? Math.fround(ceilToInt32(Math.fround(input.applySkillBoost(poweredSpeedIncrease))))
      : poweredSpeedIncrease;
  const calculation = resolveCalculation(
    effect.calculationType,
    int64ToFloat32(effect.num),
    moodCorrection,
    boostedSpeedIncrease,
    input.power,
  );
  const observation = observeLiveApIncreaseSpeedEffect(
    calculation,
    input.currentIncreaseIntervalMilliseconds,
  );
  return {
    ...observation,
    calculation,
    state: [
      ...state,
      {
        effectId: input.effectId,
        deactivationKey: effect.deactivationKey ?? null,
        calculation,
        duration:
          effect.invocationType === 0x388 || effect.invocationType === 0x38b
            ? { kind: 'full-end' }
            : createLiveSkillEffectDuration(
                displayTimeType,
                effect.displayTime,
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
  state: readonly Pick<LiveApIncreaseSpeedEffect, 'calculation'>[],
): number {
  return roundLiveGaugeIntervalSeconds(
    resolveLiveApIncreaseIntervalMilliseconds(baseIntervalSeconds, state),
  );
}

export function resolveLiveApIncreaseIntervalMilliseconds(
  baseIntervalSeconds: number,
  state: readonly Pick<LiveApIncreaseSpeedEffect, 'calculation'>[],
): number {
  if (!Number.isFinite(baseIntervalSeconds) || baseIntervalSeconds < 0) {
    throw new Error('Live AP increase interval is invalid');
  }
  const addedMilliseconds = state.reduce(
    (value, effect) =>
      effect.calculation.kind === 'add'
        ? value + Math.fround(effect.calculation.milliseconds)
        : value,
    Math.fround(baseIntervalSeconds * 1_000),
  );
  const multiplyDelta = state.reduce(
    (value, effect) =>
      effect.calculation.kind === 'multiply'
        ? value + Math.fround(Math.fround(effect.calculation.factor) - 1)
        : value,
    0,
  );
  const multiplyFactor = Math.fround(1 + Math.max(Math.fround(multiplyDelta), -1));
  const minimum = Math.fround(baseIntervalSeconds * 1000) * 0.1;
  return Math.max(addedMilliseconds * multiplyFactor, minimum);
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
