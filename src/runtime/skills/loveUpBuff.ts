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

export type LiveLoveUpBuffEffect = Readonly<{
  effectId: string;
  bonusScoreValue: number;
  disabledType: 0 | 1 | 2;
  duration: LiveSkillEffectDuration;
}>;

export type LiveLoveUpAdditionalBuffEffect = LiveAdditionalSkillBuff;

export type LiveLoveUpBuffState = Readonly<{
  effects: readonly LiveLoveUpBuffEffect[];
  additionalBuffs: readonly LiveLoveUpAdditionalBuffEffect[];
}>;

export function createLiveLoveUpBuffState(): LiveLoveUpBuffState {
  return { effects: [], additionalBuffs: [] };
}

export function activateLiveConvertedLoveUpBuff(
  state: LiveLoveUpBuffState,
  effect: Readonly<{
    effectId: string;
    value: number;
    disabledType: 0 | 1 | 2;
    duration: LiveSkillEffectDuration;
  }>,
  input: Readonly<{
    card: LiveAdditionalBuffCard;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{ state: LiveLoveUpBuffState; effectAmount: number }> {
  if (
    !Number.isSafeInteger(effect.value) ||
    effect.value < 0 ||
    (effect.disabledType !== 0 && effect.disabledType !== 1 && effect.disabledType !== 2)
  ) {
    throw new Error('Live converted LOVE UP effect is invalid');
  }
  const additional = applyLoveAdditionalBuffs(state, input.card, effect.value);
  const effectAmount = Math.ceil(
    additional.value > 0 ? input.applySkillBoost(additional.value) : additional.value,
  );
  return {
    effectAmount,
    state:
      effectAmount === 0
        ? additional.state
        : {
            ...additional.state,
            effects: [
              ...additional.state.effects,
              {
                effectId: effect.effectId,
                bonusScoreValue: effectAmount,
                disabledType: effect.disabledType,
                duration: effect.duration,
              },
            ],
          },
  };
}

export function activateLiveLoveUpAdditionalBuff(
  state: LiveLoveUpBuffState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveLoveUpBuffState {
  const active: LiveLoveUpAdditionalBuffEffect = createLiveAdditionalSkillBuff(effect, input, {
    label: 'LOVE additional buff',
    actionType: 30,
    calculationType: 'LOVE_UP_ADDITIONAL_BUFF_CALC_TYPE',
    value: 'LOVE_UP_ADDITIONAL_BUFF_NUM',
    bonusMood: 'LOVE_UP_ADDITIONAL_BUFF_BONUS_MOOD',
    displayTimeType: 'LOVE_UP_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
    displayTime: 'LOVE_UP_ADDITIONAL_BUFF_DISPLAY_TIME',
    disabledType: 'LOVE_UP_ADDITIONAL_BUFF_DISABLED_TYPE',
    disabled: 'LOVE_UP_ADDITIONAL_BUFF_DISABLED',
    targetType: 'LOVE_UP_ADDITIONAL_BUFF_TARGET_TYPE',
    targetId: 'LOVE_UP_ADDITIONAL_BUFF_TARGET_ID',
  });
  return { ...state, additionalBuffs: [...state.additionalBuffs, active] };
}

export function activateLiveLoveUpBuff(
  state: LiveLoveUpBuffState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    card: LiveAdditionalBuffCard;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{
  state: LiveLoveUpBuffState;
  effectAmount: number;
}> {
  if (effect.actionType !== 2) {
    throw new Error('Live LOVE UP action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'LOVE_UP_CALC_TYPE',
      'LOVE_UP_NUM_BASE',
      'LOVE_UP_NUM_BONUS_MOOD',
      'LOVE_DISPLAY_TIME_TYPE',
      'LOVE_DISPLAY_TIME',
      'LOVE_UP_DISABLED_TYPE',
    ],
    'LOVE UP',
  );
  if (requireValue(details, 'LOVE_UP_CALC_TYPE', 'LOVE UP') !== 1) {
    throw new Error('Live LOVE UP calculation type differs');
  }
  validateLiveSkillEffectPower(input.power, 'LOVE UP');
  const bonusMood = requireDetail(details, 'LOVE_UP_NUM_BONUS_MOOD', 'LOVE UP');
  const baseValue = Math.fround(requireValue(details, 'LOVE_UP_NUM_BASE', 'LOVE UP') / 10_000);
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  const poweredValue = Math.trunc(
    Math.fround(
      Math.fround(Math.fround(moodValue + baseValue) + input.power.addValue) *
        input.power.multiplyFactor,
    ),
  );
  const additionalBuff = applyLoveAdditionalBuffs(
    state,
    input.card,
    Math.fround(poweredValue * input.power.effectPower),
  );
  const effectAmount = Math.trunc(
    additionalBuff.value > 0 ? input.applySkillBoost(additionalBuff.value) : additionalBuff.value,
  );
  if (effectAmount === 0) {
    return { state: additionalBuff.state, effectAmount };
  }
  const disabledType = requireValue(details, 'LOVE_UP_DISABLED_TYPE', 'LOVE UP');
  if (disabledType !== 0 && disabledType !== 1 && disabledType !== 2) {
    throw new Error('Live LOVE UP disabled type differs');
  }
  const active: LiveLoveUpBuffEffect = {
    effectId: effect.id,
    bonusScoreValue: effectAmount,
    disabledType,
    duration: createLiveSkillEffectDuration(
      requireValue(details, 'LOVE_DISPLAY_TIME_TYPE', 'LOVE UP'),
      requireValue(details, 'LOVE_DISPLAY_TIME', 'LOVE UP'),
      input.currentTimeSeconds,
      'LOVE UP',
    ),
  };
  return {
    effectAmount,
    state: {
      ...additionalBuff.state,
      effects: [...additionalBuff.state.effects, active],
    },
  };
}

export function advanceLiveLoveUpBuffState(
  state: LiveLoveUpBuffState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveLoveUpBuffState {
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
    additionalBuffs: advanceLiveAdditionalSkillBuffs(state.additionalBuffs, input),
  };
}

export function consumeLiveLoveUpBuffDisableEvent(
  state: LiveLoveUpBuffState,
  event: 'collect' | 'touch',
): LiveLoveUpBuffState {
  const disabledType = event === 'collect' ? 1 : 2;
  return {
    ...state,
    effects: state.effects.filter((effect) => effect.disabledType !== disabledType),
  };
}

export function liveLoveUpBonusScoreValue(state: LiveLoveUpBuffState): number {
  return state.effects.reduce((sum, effect) => Math.fround(sum + effect.bonusScoreValue), 0);
}

function applyLoveAdditionalBuffs(
  state: LiveLoveUpBuffState,
  card: LiveAdditionalBuffCard,
  value: number,
): Readonly<{ state: LiveLoveUpBuffState; value: number }> {
  const applied = applyLiveAdditionalSkillBuffs(state.additionalBuffs, card, value);
  return {
    value: applied.value,
    state: { ...state, additionalBuffs: applied.buffs },
  };
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
