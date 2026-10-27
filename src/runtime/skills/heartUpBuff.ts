import {
  type LiveAdditionalBuffCard,
  resolveLiveAdditionalBuffTarget,
} from './additionalBuffTarget.ts';
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
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveHeartUpBuffState = Readonly<{
  effects: readonly LiveAdditionalSkillBuff[];
}>;

export function createLiveHeartUpBuffState(): LiveHeartUpBuffState {
  return { effects: [] };
}

export function activateLiveHeartUpBuff(
  state: LiveHeartUpBuffState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): LiveHeartUpBuffState {
  if (effect.actionType !== 16 || !Number.isSafeInteger(input.currentMoodValue)) {
    throw new Error('Live Heart Up input is invalid');
  }
  validateLiveSkillEffectPower(input.power, 'Heart Up');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'HEART_UP_CALC_TYPE',
      'HEART_UP_NUM_BASE',
      'HEART_UP_NUM_BONUS_MOOD',
      'HEART_UP_DISPLAY_TIME_TYPE',
      'HEART_UP_DISPLAY_TIME',
      'HEART_UP_DISABLED_TYPE',
      'HEART_UP_DISABLED',
      'HEART_UP_TARGET_TYPE',
      'HEART_UP_TARGET_ID',
    ],
    'Heart Up',
  );
  if (requireValue(details, 'HEART_UP_CALC_TYPE') !== 1) {
    throw new Error('Live Heart Up calculation type differs');
  }
  const bonusMood = details.get('HEART_UP_NUM_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live Heart Up bonus mood is absent');
  }
  const disabledType = requireValue(details, 'HEART_UP_DISABLED_TYPE');
  const disabledCount = requireValue(details, 'HEART_UP_DISABLED');
  if ((disabledType !== 0 && disabledType !== 1) || (disabledType === 1 && disabledCount < 1)) {
    throw new Error('Live Heart Up disabled condition differs');
  }
  const baseValue = Math.fround(requireValue(details, 'HEART_UP_NUM_BASE') / 10_000);
  const moodValue = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    bonusMood.effectValue / 10_000,
  );
  const poweredValue = Math.ceil(
    Math.fround(
      Math.fround(Math.fround(moodValue + baseValue) + input.power.addValue) *
        input.power.multiplyFactor,
    ),
  );
  const percent = Math.ceil(input.applySkillBoost(poweredValue));
  return {
    effects: [
      ...state.effects,
      {
        effectId: effect.id,
        calculation: { kind: 'percent', value: percent },
        target: resolveLiveAdditionalBuffTarget(
          requireValue(details, 'HEART_UP_TARGET_TYPE'),
          requireValue(details, 'HEART_UP_TARGET_ID'),
          'Heart Up',
        ),
        skillTokenCardSeriesIds: [],
        remainingUses: disabledType === 1 ? disabledCount : null,
        duration: createLiveSkillEffectDuration(
          requireValue(details, 'HEART_UP_DISPLAY_TIME_TYPE'),
          requireValue(details, 'HEART_UP_DISPLAY_TIME'),
          input.currentTimeSeconds,
          'Heart Up',
        ),
      },
    ],
  };
}

export function advanceLiveHeartUpBuffState(
  state: LiveHeartUpBuffState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveHeartUpBuffState {
  return {
    effects: advanceLiveAdditionalSkillBuffs(state.effects, input),
  };
}

export function applyLiveHeartUpBuffs(
  state: LiveHeartUpBuffState,
  card: LiveAdditionalBuffCard,
  value: number,
): Readonly<{ state: LiveHeartUpBuffState; value: number }> {
  const applied = applyLiveAdditionalSkillBuffs(state.effects, card, value);
  return { state: { effects: applied.buffs }, value: applied.value };
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Heart Up');
}
