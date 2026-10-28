import type { LiveSkillEffectClock } from '../skills/skillEffectDuration.ts';
import {
  type LiveAdditionalBuffCard,
  resolveLiveAdditionalBuffTarget,
} from '../skills/additionalBuffTarget.ts';
import {
  advanceLiveAdditionalSkillBuffs,
  applyLiveAdditionalSkillBuffs,
  type LiveAdditionalSkillBuff,
} from '../skills/additionalSkillBuff.ts';
import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from '../skills/skillEffectDuration.ts';
import type { LiveSkillEffectPower } from '../skills/skillEffectPower.ts';
import { validateLiveSkillEffectPower } from '../skills/skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from './skillMood.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from '../skills/skillEffectValue.ts';

export const liveBaseHeartLimit = 100;
export const liveMaximumHeartLimit = 10_000_000;

type LiveHeartLimitCalculation = 'add' | 'multiply';

export type LiveHeartLimitEffect = Readonly<{
  effectId: string;
  calculation: LiveHeartLimitCalculation;
  value: number;
  duration: LiveSkillEffectDuration;
}>;

export type LiveHeartLimitState = Readonly<{
  effects: readonly LiveHeartLimitEffect[];
  additionalBuffs: readonly LiveAdditionalSkillBuff[];
}>;

export type LiveHeartLimitActivation = Readonly<{
  state: LiveHeartLimitState;
  value: number;
  valueWithoutLimit: number;
  effectAmount: number;
}>;

export function createLiveHeartLimitState(): LiveHeartLimitState {
  return { effects: [], additionalBuffs: [] };
}

export function activateLiveHeartLimitAdditionalBuff(
  state: LiveHeartLimitState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
  }>,
): LiveHeartLimitState {
  if (effect.actionType !== 49) {
    throw new Error('Live Heart Limit additional buff action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Heart Limit additional buff');
  const details = requireHeartLimitAdditionalBuffDetails(effect);
  const calculationType = requireValue(
    details,
    'CHANGE_HEART_LIMIT_BOOST_CALC_TYPE',
    'Heart Limit additional buff',
  );
  if (calculationType !== 1 && calculationType !== 2) {
    throw new Error('Live Heart Limit additional buff calculation type differs');
  }
  const bonusMood = requireDetail(
    details,
    'CHANGE_HEART_LIMIT_BOOST_NUM_BONUS_MOOD',
    'Heart Limit additional buff',
  );
  const calculatedValue = Math.ceil(
    Math.fround(
      Math.fround(
        Math.fround(
          requireValue(details, 'CHANGE_HEART_LIMIT_BOOST_PARAM', 'Heart Limit additional buff') /
            10_000,
        ) +
          calculateLiveSkillMoodCorrection(
            bonusMood.targetMood,
            input.currentMoodValue,
            bonusMood.effectValue / 10_000,
          ),
      ) + input.power.addValue,
    ) * input.power.multiplyFactor,
  );
  if (calculatedValue < 0) {
    return state;
  }
  const disabledType = requireValue(
    details,
    'CHANGE_HEART_LIMIT_BOOST_DISABLED_TYPE',
    'Heart Limit additional buff',
  );
  const disabledCount = requireValue(
    details,
    'CHANGE_HEART_LIMIT_BOOST_DISABLED_PARAM',
    'Heart Limit additional buff',
  );
  if ((disabledType !== 0 && disabledType !== 1) || (disabledType === 1 && disabledCount < 1)) {
    throw new Error('Live Heart Limit additional buff disabled condition differs');
  }
  const targetType = requireValue(
    details,
    'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE',
    'Heart Limit additional buff',
  );
  if (targetType < 1 || targetType > 3) {
    throw new Error('Live Heart Limit additional buff target type differs');
  }
  const additionalBuff: LiveAdditionalSkillBuff = {
    effectId: effect.id,
    calculation:
      calculationType === 1
        ? { kind: 'percent', value: calculatedValue }
        : { kind: 'add', value: calculatedValue },
    target: resolveLiveAdditionalBuffTarget(
      targetType - 1,
      requireValue(
        details,
        'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE_ID',
        'Heart Limit additional buff',
      ),
      'Heart Limit additional buff',
    ),
    skillTokenCardSeriesIds: requireTokenCardSeriesIds(details),
    remainingUses: disabledType === 1 ? disabledCount : null,
    duration: createLiveSkillEffectDuration(
      requireValue(
        details,
        'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_TYPE',
        'Heart Limit additional buff',
      ),
      requireValue(
        details,
        'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_PARAM',
        'Heart Limit additional buff',
      ),
      'Heart Limit additional buff',
    ),
  };
  return {
    ...state,
    additionalBuffs: [...state.additionalBuffs, additionalBuff],
  };
}

export function activateLiveHeartLimit(
  state: LiveHeartLimitState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    card: LiveAdditionalBuffCard;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveHeartLimitActivation {
  if (effect.actionType !== 25) {
    throw new Error('Live Heart Limit action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Heart Limit');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'CHANGE_HEART_LIMIT_CALC_TYPE',
      'CHANGE_HEART_LIMIT_NUM',
      'CHANGE_HEART_LIMIT_NUM_BONUS_MOOD',
      'CHANGE_HEART_LIMIT_DISPLAY_TIME_TYPE',
      'CHANGE_HEART_LIMIT_DISPLAY_TIME',
    ],
    'Heart Limit',
  );
  const calculationType = requireValue(details, 'CHANGE_HEART_LIMIT_CALC_TYPE', 'Heart Limit');
  if (calculationType !== 1 && calculationType !== 2) {
    throw new Error('Live Heart Limit calculation type differs');
  }
  const bonusMood = requireDetail(details, 'CHANGE_HEART_LIMIT_NUM_BONUS_MOOD', 'Heart Limit');
  const baseValue = Math.fround(
    requireValue(details, 'CHANGE_HEART_LIMIT_NUM', 'Heart Limit') / 10_000,
  );
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  const currentValueWithoutLimit = liveHeartLimitValueWithoutLimit(state);
  const valueBeforePower =
    calculationType === 1
      ? Math.fround(baseValue + moodValue)
      : Math.fround(
          Math.fround(Math.fround(baseValue + moodValue) * currentValueWithoutLimit) -
            currentValueWithoutLimit,
        );
  const poweredValue = Math.fround(
    Math.fround(valueBeforePower + input.power.addValue) * input.power.multiplyFactor,
  );
  const effectPoweredValue = Math.fround(poweredValue * input.power.effectPower);
  const additional = applyLiveAdditionalSkillBuffs(
    state.additionalBuffs,
    input.card,
    effectPoweredValue,
  );
  const boostedValue =
    additional.value > 0 ? input.applySkillBoost(additional.value) : additional.value;
  const limitEffect: LiveHeartLimitEffect = {
    effectId: effect.id,
    calculation: calculationType === 1 ? 'add' : 'multiply',
    value: Math.ceil(boostedValue),
    duration: createLiveSkillEffectDuration(
      requireValue(details, 'CHANGE_HEART_LIMIT_DISPLAY_TIME_TYPE', 'Heart Limit'),
      requireValue(details, 'CHANGE_HEART_LIMIT_DISPLAY_TIME', 'Heart Limit'),
      'Heart Limit',
    ),
  };
  const nextState = {
    effects: [...state.effects, limitEffect],
    additionalBuffs: additional.buffs,
  };
  const valueWithoutLimit = liveHeartLimitValueWithoutLimit(nextState);
  return {
    state: nextState,
    value: Math.min(valueWithoutLimit, liveMaximumHeartLimit),
    valueWithoutLimit,
    effectAmount: valueWithoutLimit - currentValueWithoutLimit,
  };
}

export function advanceLiveHeartLimitState(
  state: LiveHeartLimitState,
  input: LiveSkillEffectClock,
): LiveHeartLimitState {
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
    additionalBuffs: advanceLiveAdditionalSkillBuffs(state.additionalBuffs, input),
  };
}

export function liveHeartLimitValueWithoutLimit(state: LiveHeartLimitState): number {
  const calculations = state.effects.reduce<LiveHeartLimitCalculation[]>(
    (result, effect) =>
      result.includes(effect.calculation) ? result : [...result, effect.calculation],
    [],
  );
  const value = calculations.reduce((currentValue, calculation) => {
    const values = state.effects
      .filter((effect) => effect.calculation === calculation)
      .map((effect) => effect.value);
    if (calculation === 'add') {
      return values.reduce((sum, effectValue) => Math.fround(sum + effectValue), currentValue);
    }
    const factor = Math.fround(
      Math.max(
        values.reduce((sum, effectValue) => Math.fround(sum + Math.fround(effectValue - 1)), 0),
        -1,
      ) + 1,
    );
    return Math.fround(currentValue * factor);
  }, liveBaseHeartLimit);
  return Math.max(Math.trunc(value), 0);
}

export function liveHeartLimitValue(state: LiveHeartLimitState): number {
  return Math.min(liveHeartLimitValueWithoutLimit(state), liveMaximumHeartLimit);
}

function requireHeartLimitAdditionalBuffDetails(
  effect: LiveSkillEffect,
): ReadonlyMap<string, LiveSkillEffect['details'][number]> {
  const names = [
    'CHANGE_HEART_LIMIT_BOOST_CALC_TYPE',
    'CHANGE_HEART_LIMIT_BOOST_PARAM',
    'CHANGE_HEART_LIMIT_BOOST_NUM_BONUS_MOOD',
    'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_TYPE',
    'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_PARAM',
    'CHANGE_HEART_LIMIT_BOOST_DISABLED_TYPE',
    'CHANGE_HEART_LIMIT_BOOST_DISABLED_PARAM',
    'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE',
    'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE_ID',
    'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID',
  ] as const;
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    effect.details.length !== names.length ||
    details.size !== names.length ||
    names.some((name) => !details.has(name)) ||
    effect.details.some(
      (detail) =>
        !Number.isSafeInteger(detail.targetMood) ||
        !Number.isSafeInteger(detail.effectValue) ||
        (detail.detailType !== 'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID' &&
          detail.params.length !== 0),
    )
  ) {
    throw new Error('Live Heart Limit additional buff skill effect details differ');
  }
  return details;
}

function requireTokenCardSeriesIds(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
): readonly number[] {
  const values = requireDetail(
    details,
    'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID',
    'Heart Limit additional buff',
  ).params.map((param) => {
    if (
      param.paramType !== 'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID' ||
      !/^[1-9]\d*$/.test(param.paramValue)
    ) {
      throw new Error('Live Heart Limit additional buff token CardSeries.Id is invalid');
    }
    const value = Number(param.paramValue);
    if (!Number.isSafeInteger(value)) {
      throw new Error('Live Heart Limit additional buff token CardSeries.Id is invalid');
    }
    return value;
  });
  if (new Set(values).size !== values.length) {
    throw new Error('Live Heart Limit additional buff token CardSeries.Id is duplicated');
  }
  return values;
}

function requireDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): LiveSkillEffect['details'][number] {
  const detail = details.get(name);
  if (detail === undefined) {
    throw new Error(`Live ${label} detail is absent:${name}`);
  }
  return detail;
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, label);
}
