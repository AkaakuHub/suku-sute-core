import type { LiveAdditionalBuffCard } from './additionalBuffTarget.ts';
import { resolveLiveAdditionalBuffTarget } from './additionalBuffTarget.ts';
import {
  advanceLiveAdditionalSkillBuffs,
  applyLiveAdditionalSkillBuffs,
  type LiveAdditionalSkillBuff,
} from './additionalSkillBuff.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import { createLiveSkillEffectDuration } from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import { requireLiveSkillEffectDetailValue } from './skillEffectValue.ts';

export type LiveMoodValueAdditionalBuffState = Readonly<{
  effects: readonly LiveAdditionalSkillBuff[];
}>;

export function createLiveMoodValueAdditionalBuffState(): LiveMoodValueAdditionalBuffState {
  return { effects: [] };
}

export function activateLiveMoodValueAdditionalBuff(
  state: LiveMoodValueAdditionalBuffState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveMoodValueAdditionalBuffState {
  if (effect.actionType !== 50 || !Number.isSafeInteger(input.currentMoodValue)) {
    throw new Error('Live Change Mood Value Boost input is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'Change Mood Value Boost');
  const details = requireDetails(effect);
  const calculationType = requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_CALC_TYPE');
  if (calculationType !== 1 && calculationType !== 2) {
    throw new Error('Live Change Mood Value Boost calculation type differs');
  }
  const bonusMood = requireDetail(details, 'CHANGE_MOOD_VALUE_BOOST_NUM_BONUS_MOOD');
  const sourceValue = Math.fround(requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_PARAM') / 10_000);
  const moodCorrection = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  const poweredValue = Math.fround(
    Math.fround(Math.fround(sourceValue + moodCorrection) + input.power.addValue) *
      input.power.multiplyFactor,
  );
  const valueBeforeBoost = calculationType === 1 ? roundAwayFromZero(poweredValue) : poweredValue;
  const valueAfterBoost =
    valueBeforeBoost > 0 ? input.applySkillBoost(valueBeforeBoost) : valueBeforeBoost;
  const value = valueAfterBoost > 0 ? Math.ceil(valueAfterBoost) : valueAfterBoost;
  const disabledType = requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_DISABLED_TYPE');
  const disabledCount = requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_DISABLED_PARAM');
  if ((disabledType !== 0 && disabledType !== 1) || (disabledType === 1 && disabledCount < 1)) {
    throw new Error('Live Change Mood Value Boost disabled condition differs');
  }
  const active: LiveAdditionalSkillBuff = {
    effectId: effect.id,
    calculation: calculationType === 1 ? { kind: 'percent', value } : { kind: 'add', value },
    target: resolveLiveAdditionalBuffTarget(
      requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE'),
      requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE_ID'),
      'Change Mood Value Boost',
    ),
    skillTokenCardSeriesIds: requireTokenCardSeriesIds(details),
    remainingUses: disabledType === 1 ? disabledCount : null,
    duration: createLiveSkillEffectDuration(
      requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_TYPE'),
      requireValue(details, 'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_PARAM'),
      input.currentTimeSeconds,
      'Change Mood Value Boost',
    ),
  };
  return { effects: [...state.effects, active] };
}

export function advanceLiveMoodValueAdditionalBuffState(
  state: LiveMoodValueAdditionalBuffState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveMoodValueAdditionalBuffState {
  return {
    effects: advanceLiveAdditionalSkillBuffs(state.effects, input),
  };
}

export function applyLiveMoodValueAdditionalBuffs(
  state: LiveMoodValueAdditionalBuffState,
  card: LiveAdditionalBuffCard,
  value: number,
): Readonly<{ state: LiveMoodValueAdditionalBuffState; value: number }> {
  const sign = value < 0 ? -1 : 1;
  const applied = applyLiveAdditionalSkillBuffs(state.effects, card, Math.abs(value));
  return {
    state: { effects: applied.buffs },
    value: Math.fround(applied.value * sign),
  };
}

function requireDetails(
  effect: LiveSkillEffect,
): ReadonlyMap<string, LiveSkillEffect['details'][number]> {
  const names = [
    'CHANGE_MOOD_VALUE_BOOST_CALC_TYPE',
    'CHANGE_MOOD_VALUE_BOOST_PARAM',
    'CHANGE_MOOD_VALUE_BOOST_NUM_BONUS_MOOD',
    'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_TYPE',
    'CHANGE_MOOD_VALUE_BOOST_DISPLAY_TIME_PARAM',
    'CHANGE_MOOD_VALUE_BOOST_DISABLED_TYPE',
    'CHANGE_MOOD_VALUE_BOOST_DISABLED_PARAM',
    'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE',
    'CHANGE_MOOD_VALUE_BOOST_TARGET_TYPE_ID',
    'CHANGE_MOOD_VALUE_BOOST_TOKEN_CARD_SERIES_ID',
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
        (detail.detailType !== 'CHANGE_MOOD_VALUE_BOOST_TOKEN_CARD_SERIES_ID' &&
          detail.params.length !== 0),
    )
  ) {
    throw new Error('Live Change Mood Value Boost details differ');
  }
  return details;
}

function requireTokenCardSeriesIds(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
): readonly number[] {
  const values = requireDetail(details, 'CHANGE_MOOD_VALUE_BOOST_TOKEN_CARD_SERIES_ID').params.map(
    (param) => {
      if (
        param.paramType !== 'CHANGE_MOOD_VALUE_BOOST_TOKEN_CARD_SERIES_ID' ||
        !/^[1-9]\d*$/.test(param.paramValue)
      ) {
        throw new Error('Live Change Mood Value Boost token CardSeries.Id is invalid');
      }
      const value = Number(param.paramValue);
      if (!Number.isSafeInteger(value)) {
        throw new Error('Live Change Mood Value Boost token CardSeries.Id is invalid');
      }
      return value;
    },
  );
  if (new Set(values).size !== values.length) {
    throw new Error('Live Change Mood Value Boost token CardSeries.Id is duplicated');
  }
  return values;
}

function requireDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): LiveSkillEffect['details'][number] {
  const detail = details.get(name);
  if (detail === undefined) {
    throw new Error(`Live Change Mood Value Boost detail is absent:${name}`);
  }
  return detail;
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Change Mood Value Boost');
}

function roundAwayFromZero(value: number): number {
  return value < 0 ? Math.floor(value) : Math.ceil(value);
}
