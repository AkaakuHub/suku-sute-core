import type { LiveAddHeartOption } from './addHeartSkill.ts';
import type { LiveAdditionalBuffCard } from './additionalBuffTarget.ts';
import { liveCeilAtFirstDecimalPlace } from '../live/gaugeTiming.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveMentalHeartInduceEffect = Readonly<{
  effectId: string;
  unitValue: number;
  heartDisplayTimeType: 1 | 2 | 3;
  heartDisplayTime: number;
  duration: LiveSkillEffectDuration;
  remainingInductions: number | null;
  card: LiveAdditionalBuffCard;
  parentControlsLifetime: boolean;
}>;

export type LiveMentalHeartInduceState = readonly LiveMentalHeartInduceEffect[];

export function createLiveMentalHeartInduceState(): LiveMentalHeartInduceState {
  return [];
}

export function activateLiveMentalHeartInduce(
  state: LiveMentalHeartInduceState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    power: LiveSkillEffectPower;
    card: LiveAdditionalBuffCard;
    parentControlsLifetime: boolean;
  }>,
): LiveMentalHeartInduceState {
  if (effect.actionType !== 23) {
    throw new Error('Live Mental Heart Induce action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Mental Heart Induce');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'MENTAL_HEART_INDUCE_NUM',
      'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME_TYPE',
      'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME',
      'MENTAL_HEART_INDUCE_DISPLAY_TIME_TYPE',
      'MENTAL_HEART_INDUCE_DISPLAY_TIME',
      'MENTAL_HEART_INDUCE_DISABLED_TYPE',
      'MENTAL_HEART_INDUCE_DISABLED',
    ],
    'Mental Heart Induce',
  );
  const heartDisplayTimeType = requireValue(details, 'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME_TYPE');
  if (heartDisplayTimeType !== 1 && heartDisplayTimeType !== 2 && heartDisplayTimeType !== 3) {
    throw new Error('Live Mental Heart Induce Heart display type differs');
  }
  const heartDisplayTime = requireValue(details, 'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME');
  if (heartDisplayTime < 0 || (heartDisplayTimeType === 2 && heartDisplayTime < 1)) {
    throw new Error('Live Mental Heart Induce Heart display time differs');
  }
  const disabledType = requireValue(details, 'MENTAL_HEART_INDUCE_DISABLED_TYPE');
  if (disabledType !== 0 && disabledType !== 1) {
    throw new Error('Live Mental Heart Induce disabled type differs');
  }
  const disabledCount = requireValue(details, 'MENTAL_HEART_INDUCE_DISABLED');
  if (disabledCount < 0 || (disabledType === 1 && disabledCount < 1)) {
    throw new Error('Live Mental Heart Induce disabled count differs');
  }
  const unitValue = Math.ceil(
    Math.fround(
      Math.fround(requireValue(details, 'MENTAL_HEART_INDUCE_NUM') + input.power.addValue) *
        input.power.multiplyFactor,
    ),
  );
  if (!Number.isSafeInteger(unitValue)) {
    throw new Error('Live Mental Heart Induce value is invalid');
  }
  return [
    ...state,
    {
      effectId: effect.id,
      unitValue,
      heartDisplayTimeType,
      heartDisplayTime,
      duration: createLiveSkillEffectDuration(
        requireValue(details, 'MENTAL_HEART_INDUCE_DISPLAY_TIME_TYPE'),
        requireValue(details, 'MENTAL_HEART_INDUCE_DISPLAY_TIME'),
        input.currentTimeSeconds,
        'Mental Heart Induce',
      ),
      remainingInductions: disabledType === 1 ? disabledCount : null,
      card: input.card,
      parentControlsLifetime: input.parentControlsLifetime,
    },
  ];
}

export function induceLiveMentalRecoveryHearts(
  state: LiveMentalHeartInduceState,
  recoveredMental: number,
  ports: Readonly<{
    applyHeartUp: (card: LiveAdditionalBuffCard, value: number) => number;
    applySkillBoost: (card: LiveAdditionalBuffCard, value: number) => number;
  }>,
): Readonly<{
  state: LiveMentalHeartInduceState;
  heartOptions: readonly LiveAddHeartOption[];
}> {
  if (!Number.isSafeInteger(recoveredMental) || recoveredMental < 0) {
    throw new Error('Live Mental Heart Induce recovery is invalid');
  }
  if (recoveredMental === 0) return { state, heartOptions: [] };
  const heartOptions: LiveAddHeartOption[] = [];
  const nextState: LiveMentalHeartInduceEffect[] = [];
  for (const effect of state) {
    const product = effect.unitValue * recoveredMental;
    if (!Number.isSafeInteger(product)) {
      throw new Error('Live Mental Heart Induce product is invalid');
    }
    const roundedValue = liveCeilAtFirstDecimalPlace(
      Math.fround(Math.fround(product) / Math.fround(10_000)),
    );
    const heartUpValue = ports.applyHeartUp(effect.card, roundedValue);
    const boostedValue = ports.applySkillBoost(effect.card, heartUpValue);
    heartOptions.push({
      calculation: { kind: 'fixed', value: Math.ceil(boostedValue) },
      lifeTimeSeconds: effect.heartDisplayTimeType === 1 ? effect.heartDisplayTime / 1_000 : 9_999,
      effectPower: 1,
    });
    const remainingInductions =
      effect.remainingInductions === null ? null : effect.remainingInductions - 1;
    if (remainingInductions !== 0) {
      nextState.push({ ...effect, remainingInductions });
    }
  }
  return { state: nextState, heartOptions };
}

export function advanceLiveMentalHeartInduceState(
  state: LiveMentalHeartInduceState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveMentalHeartInduceState {
  return state.flatMap((effect) => {
    if (effect.parentControlsLifetime) return [effect];
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

export function deactivateLiveMentalHeartInduce(
  state: LiveMentalHeartInduceState,
  effectId: string,
): LiveMentalHeartInduceState {
  return state.filter((effect) => effect.effectId !== effectId);
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Mental Heart Induce');
}
