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

type LiveAdditionalHeartInduceCondition =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; value: number }>
  | Readonly<{ kind: 'skill-main-effect'; value: number }>
  | Readonly<{ kind: 'unit'; value: number }>;

export type LiveAdditionalHeartInduceEffect = Readonly<{
  effectId: string;
  sourceCardInstanceId: number;
  embeddedEffect: LiveSkillEffect;
  condition: LiveAdditionalHeartInduceCondition;
  apPower: number;
  power: LiveSkillEffectPower;
  duration: LiveSkillEffectDuration;
  parentControlsLifetime: boolean;
}>;

export type LiveAdditionalHeartInduceState = readonly LiveAdditionalHeartInduceEffect[];

export type LiveAdditionalHeartInduceApplication = Readonly<{
  induceEffectId: string;
  sourceCardInstanceId: number;
  effect: LiveSkillEffect;
  power: LiveSkillEffectPower;
}>;

export function createLiveAdditionalHeartInduceState(): LiveAdditionalHeartInduceState {
  return [];
}

export function liveAdditionalHeartEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  return new Set(
    effects
      .filter((effect) => effect.actionType === 27)
      .map((effect) => String(requireAdditionalHeartDetails(effect).effectId)),
  );
}

export function activateLiveAdditionalHeartInduce(
  state: LiveAdditionalHeartInduceState,
  effect: LiveSkillEffect,
  allEffects: readonly LiveSkillEffect[],
  input: Readonly<{
    currentTimeSeconds: number;
    power: LiveSkillEffectPower;
    parentControlsLifetime: boolean;
    sourceCardInstanceId: number;
  }>,
): LiveAdditionalHeartInduceState {
  if (effect.actionType !== 27) {
    throw new Error('Live Additional Heart action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Additional Heart');
  const values = requireAdditionalHeartDetails(effect);
  const embeddedEffectId = String(values.effectId);
  const matches = allEffects.filter((candidate) => candidate.id === embeddedEffectId);
  const embeddedEffect = matches[0];
  if (matches.length !== 1 || embeddedEffect === undefined || embeddedEffect.actionType !== 1) {
    throw new Error(`Live Additional Heart embedded effect must resolve once:${embeddedEffectId}`);
  }
  return [
    ...state,
    {
      effectId: effect.id,
      sourceCardInstanceId: input.sourceCardInstanceId,
      embeddedEffect,
      condition: resolveCondition(values.induceType, values.induceValue),
      apPower: values.apPower,
      power: input.power,
      duration: createLiveSkillEffectDuration(
        values.displayTimeType,
        values.displayTime,
        input.currentTimeSeconds,
        'Additional Heart',
      ),
      parentControlsLifetime: input.parentControlsLifetime,
    },
  ];
}

export function notifyLiveAdditionalHeartSkillActivation(
  state: LiveAdditionalHeartInduceState,
  input: Readonly<{
    charactersId: number;
    skillMainEffect: number;
    unitIds: readonly number[];
    consumeAp: number;
  }>,
): readonly LiveAdditionalHeartInduceApplication[] {
  if (!Number.isSafeInteger(input.consumeAp) || input.consumeAp < 0) {
    throw new Error('Live Additional Heart consumed AP is invalid');
  }
  return state.flatMap((induce) => {
    if (!matchesCondition(induce.condition, input)) return [];
    const product = induce.apPower * input.consumeAp;
    if (!Number.isSafeInteger(product)) {
      throw new Error('Live Additional Heart AP product is invalid');
    }
    return [
      {
        induceEffectId: induce.effectId,
        sourceCardInstanceId: induce.sourceCardInstanceId,
        effect: induce.embeddedEffect,
        power: {
          addValue: induce.power.addValue,
          multiplyFactor: induce.power.multiplyFactor,
          effectPower: Math.fround(1 + Math.fround(Math.fround(product) / Math.fround(10_000))),
        },
      },
    ];
  });
}

export function advanceLiveAdditionalHeartInduceState(
  state: LiveAdditionalHeartInduceState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveAdditionalHeartInduceState {
  return state.flatMap((effect) => {
    if (effect.parentControlsLifetime) return [effect];
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

export function deactivateLiveAdditionalHeartInduce(
  state: LiveAdditionalHeartInduceState,
  effectId: string,
  sourceCardInstanceId: number,
): LiveAdditionalHeartInduceState {
  return state.filter(
    (effect) =>
      effect.effectId !== effectId || effect.sourceCardInstanceId !== sourceCardInstanceId,
  );
}

function requireAdditionalHeartDetails(effect: LiveSkillEffect) {
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'GET_ADDITIONAL_HEART_INDUCE_TYPE',
      'GET_ADDITIONAL_HEART_INDUCE_VALUE',
      'GET_ADDITIONAL_HEART_EFFECT_ID',
      'GET_ADDITIONAL_HEART_AP_POWER',
      'GET_ADDITIONAL_HEART_DISPLAY_TIME_TYPE',
      'GET_ADDITIONAL_HEART_DISPLAY_TIME',
    ],
    'Additional Heart',
  );
  const value = (name: string) =>
    requireLiveSkillEffectDetailValue(details, name, 'Additional Heart');
  const result = {
    induceType: value('GET_ADDITIONAL_HEART_INDUCE_TYPE'),
    induceValue: value('GET_ADDITIONAL_HEART_INDUCE_VALUE'),
    effectId: value('GET_ADDITIONAL_HEART_EFFECT_ID'),
    apPower: value('GET_ADDITIONAL_HEART_AP_POWER'),
    displayTimeType: value('GET_ADDITIONAL_HEART_DISPLAY_TIME_TYPE'),
    displayTime: value('GET_ADDITIONAL_HEART_DISPLAY_TIME'),
  };
  if (result.effectId <= 0 || result.apPower < 0) {
    throw new Error('Live Additional Heart detail value differs');
  }
  return result;
}

function resolveCondition(type: number, value: number): LiveAdditionalHeartInduceCondition {
  if (type === 0 && value === 0) return { kind: 'all' };
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Live Additional Heart induce value differs');
  }
  if (type === 1) return { kind: 'member', value };
  if (type === 2) return { kind: 'skill-main-effect', value };
  if (type === 3) return { kind: 'unit', value };
  throw new Error('Live Additional Heart induce type differs');
}

function matchesCondition(
  condition: LiveAdditionalHeartInduceCondition,
  card: Readonly<{
    charactersId: number;
    skillMainEffect: number;
    unitIds: readonly number[];
  }>,
): boolean {
  switch (condition.kind) {
    case 'all':
      return true;
    case 'member':
      return card.charactersId === condition.value;
    case 'skill-main-effect':
      return card.skillMainEffect === condition.value;
    case 'unit':
      return card.unitIds.includes(condition.value);
  }
}
