import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type { LiveAdditionalBuffCard } from './additionalBuffTarget.ts';
import {
  advanceLiveAdditionalSkillBuffs,
  applyLiveAdditionalSkillBuffs,
  createLiveAdditionalSkillBuff,
  type LiveAdditionalSkillBuff,
} from './additionalSkillBuff.ts';
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

type LiveMentalBarrierEndurance =
  | Readonly<{ kind: 'finite'; maximum: number; consumed: number }>
  | Readonly<{ kind: 'infinite' }>;

export type LiveMentalBarrierEffect = Readonly<{
  effectId: string;
  barrierType: 'endurance' | 'attenuation';
  endurance: LiveMentalBarrierEndurance;
  attenuationFactor: number;
  duration: LiveSkillEffectDuration;
}>;

export type LiveMentalBarrierState = Readonly<{
  effects: readonly LiveMentalBarrierEffect[];
  additionalBuffs: readonly LiveAdditionalSkillBuff[];
}>;

export function createLiveMentalBarrierState(): LiveMentalBarrierState {
  return { effects: [], additionalBuffs: [] };
}

export function activateLiveConvertedMentalBarrier(
  state: LiveMentalBarrierState,
  effect: Readonly<{
    effectId: string;
    value: number;
    duration: LiveSkillEffectDuration;
  }>,
  input: Readonly<{
    card: LiveAdditionalBuffCard;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{ state: LiveMentalBarrierState; effectAmount: number }> {
  if (!Number.isSafeInteger(effect.value) || effect.value < 0) {
    throw new Error('Live converted Mental Barrier endurance is invalid');
  }
  const additional = applyLiveAdditionalSkillBuffs(state.additionalBuffs, input.card, effect.value);
  const effectAmount = Math.ceil(
    additional.value > 0 ? input.applySkillBoost(additional.value) : additional.value,
  );
  return {
    effectAmount,
    state: {
      ...state,
      additionalBuffs: additional.buffs,
      effects:
        effectAmount === 0
          ? state.effects
          : [
              ...state.effects,
              {
                effectId: effect.effectId,
                barrierType: 'endurance',
                endurance: {
                  kind: 'finite',
                  maximum: effectAmount,
                  consumed: 0,
                },
                attenuationFactor: 1,
                duration: effect.duration,
              },
            ],
    },
  };
}

export function activateLiveMentalBarrierAdditionalBuff(
  state: LiveMentalBarrierState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveMentalBarrierState {
  const active = createLiveAdditionalSkillBuff(effect, input, {
    label: 'Mental Barrier additional buff',
    actionType: 33,
    calculationType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_CALC_TYPE',
    value: 'MENTAL_BARRIER_ADDITIONAL_BUFF_NUM',
    bonusMood: 'MENTAL_BARRIER_ADDITIONAL_BUFF_BONUS_MOOD',
    displayTimeType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
    displayTime: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISPLAY_TIME',
    disabledType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISABLED_TYPE',
    disabled: 'MENTAL_BARRIER_ADDITIONAL_BUFF_DISABLED',
    targetType: 'MENTAL_BARRIER_ADDITIONAL_BUFF_TARGET_TYPE',
    targetId: 'MENTAL_BARRIER_ADDITIONAL_BUFF_TARGET_ID',
  });
  return { ...state, additionalBuffs: [...state.additionalBuffs, active] };
}

export function activateLiveMentalBarrier(
  state: LiveMentalBarrierState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    maximumMental: number;
    card: LiveAdditionalBuffCard;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{ state: LiveMentalBarrierState; effectAmount: number }> {
  if (effect.actionType !== 7) {
    throw new Error('Live Mental Barrier action type differs');
  }
  if (!Number.isSafeInteger(input.maximumMental) || input.maximumMental < 0) {
    throw new Error('Live Mental Barrier maximum Mental is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'Mental Barrier');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'MENTAL_BARRIER_TYPE',
      'MENTAL_BARRIER_ENDURANCE_TYPE',
      'MENTAL_BARRIER_ENDURANCE_NUM',
      'MENTAL_BARRIER_ENDURANCE_BONUS_MOOD',
      'MENTAL_BARRIER_ATTENUATION_NUM',
      'MENTAL_BARRIER_ATTENUATION_BONUS_MOOD',
      'MENTAL_BARRIER_DISPLAY_TIME_TYPE',
      'MENTAL_BARRIER_DISPLAY_TIME',
    ],
    'Mental Barrier',
  );
  const barrierType = requireValue(details, 'MENTAL_BARRIER_TYPE');
  if (barrierType !== 1 && barrierType !== 2) {
    throw new Error('Live Mental Barrier type differs');
  }
  const enduranceType = requireValue(details, 'MENTAL_BARRIER_ENDURANCE_TYPE');
  if (enduranceType !== 1 && enduranceType !== 2 && enduranceType !== 3) {
    throw new Error('Live Mental Barrier endurance type differs');
  }
  const enduranceApplied = applyLiveAdditionalSkillBuffs(
    state.additionalBuffs,
    input.card,
    calculateBarrierValue(
      details,
      'MENTAL_BARRIER_ENDURANCE_NUM',
      'MENTAL_BARRIER_ENDURANCE_BONUS_MOOD',
      input,
    ),
  );
  const enduranceValue = input.applySkillBoost(enduranceApplied.value);
  const attenuationApplied = applyLiveAdditionalSkillBuffs(
    enduranceApplied.buffs,
    input.card,
    calculateBarrierValue(
      details,
      'MENTAL_BARRIER_ATTENUATION_NUM',
      'MENTAL_BARRIER_ATTENUATION_BONUS_MOOD',
      input,
    ),
  );
  const attenuationValue = input.applySkillBoost(attenuationApplied.value);
  const endurance = resolveEndurance(enduranceType, enduranceValue, input.maximumMental);
  const attenuationFactor = Math.fround(attenuationValue / 100);
  if (barrierType === 2 && attenuationFactor <= 0) {
    throw new Error('Live Mental Barrier attenuation is invalid');
  }
  const active: LiveMentalBarrierEffect = {
    effectId: effect.id,
    barrierType: barrierType === 1 ? 'endurance' : 'attenuation',
    endurance,
    attenuationFactor,
    duration: createLiveSkillEffectDuration(
      requireValue(details, 'MENTAL_BARRIER_DISPLAY_TIME_TYPE'),
      requireValue(details, 'MENTAL_BARRIER_DISPLAY_TIME'),
      'Mental Barrier',
    ),
  };
  return {
    effectAmount: endurance.kind === 'finite' ? endurance.maximum : 0,
    state: {
      effects: [...state.effects, active],
      additionalBuffs: attenuationApplied.buffs,
    },
  };
}

export function advanceLiveMentalBarrierState(
  state: LiveMentalBarrierState,
  input: LiveSkillEffectClock,
): LiveMentalBarrierState {
  return {
    effects: state.effects.flatMap((effect) => {
      if (
        effect.endurance.kind === 'finite' &&
        effect.endurance.maximum <= effect.endurance.consumed
      ) {
        return [];
      }
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
    additionalBuffs: advanceLiveAdditionalSkillBuffs(state.additionalBuffs, input),
  };
}

export function liveMentalBarrierDecreaseIntervalFactor(state: LiveMentalBarrierState): number {
  return state.effects.reduce(
    (maximum, effect) =>
      effect.barrierType === 'attenuation' ? Math.max(maximum, effect.attenuationFactor) : maximum,
    1,
  );
}

function calculateBarrierValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  valueName: string,
  bonusMoodName: string,
  input: Readonly<{
    currentMoodValue: number;
    power: LiveSkillEffectPower;
  }>,
): number {
  const bonusMood = details.get(bonusMoodName);
  if (bonusMood === undefined) {
    throw new Error(`Live Mental Barrier detail is absent:${bonusMoodName}`);
  }
  const value = Math.fround(requireValue(details, valueName) / 10_000);
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  return Math.fround(
    Math.fround(
      Math.fround(Math.fround(value + moodValue) + input.power.addValue) *
        input.power.multiplyFactor,
    ) * input.power.effectPower,
  );
}

function resolveEndurance(
  enduranceType: 1 | 2 | 3,
  value: number,
  maximumMental: number,
): LiveMentalBarrierEndurance {
  if (enduranceType === 3) return { kind: 'infinite' };
  const maximum = Math.fround(
    enduranceType === 1 ? Math.fround(value / 100) * maximumMental : value,
  );
  if (!Number.isFinite(maximum) || maximum < 0) {
    throw new Error('Live Mental Barrier endurance is invalid');
  }
  return { kind: 'finite', maximum, consumed: 0 };
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Mental Barrier');
}
