import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { validateLiveSkillEffectPower } from './skillEffectPower.ts';

export type LiveInduceSkillEffectCondition = 'voltage-point' | 'mental-recover' | 'mental-barrier';

export type LiveInduceSkillEffectEntry = Readonly<{
  effectId: string;
  sourceCardInstanceId: number;
  condition: LiveInduceSkillEffectCondition;
  num: number;
  deckUnderAdd: number;
  deckOverAdd: number;
  deckUnderLimit: number;
  deckOverLimit: number;
  embeddedEffects: readonly LiveSkillEffect[];
  power: LiveSkillEffectPower;
  duration: LiveSkillEffectDuration;
  parentControlsLifetime: boolean;
}>;

export type LiveInduceSkillEffectState = readonly LiveInduceSkillEffectEntry[];

export type LiveInduceSkillEffectApplication = Readonly<{
  sourceCardInstanceId: number;
  effect: LiveSkillEffect;
  power: LiveSkillEffectPower;
  notify: false;
}>;

export function createLiveInduceSkillEffectState(): LiveInduceSkillEffectState {
  return [];
}

export function liveInduceSkillEmbeddedEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  return new Set(
    effects
      .filter((effect) => effect.actionType === 41)
      .flatMap((effect) => requireInduceSkillEffectDetails(effect).effectIds),
  );
}

export function activateLiveInduceSkillEffect(
  state: LiveInduceSkillEffectState,
  effect: LiveSkillEffect,
  allEffects: readonly LiveSkillEffect[],
  input: Readonly<{
    currentTimeSeconds: number;
    power: LiveSkillEffectPower;
    parentControlsLifetime: boolean;
    sourceCardInstanceId: number;
  }>,
): LiveInduceSkillEffectState {
  if (effect.actionType !== 41) {
    throw new Error('Live Induce Skill Effect action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Induce Skill Effect');
  if (!Number.isSafeInteger(input.sourceCardInstanceId) || input.sourceCardInstanceId <= 0) {
    throw new Error('Live Induce Skill Effect source card differs');
  }
  const details = requireInduceSkillEffectDetails(effect);
  const embeddedEffects = details.effectIds.map((effectId) => {
    const matches = allEffects.filter((candidate) => candidate.id === effectId);
    const embedded = matches[0];
    if (matches.length !== 1 || embedded === undefined) {
      throw new Error(`Live Induce Skill Effect embedded effect must resolve once:${effectId}`);
    }
    return embedded;
  });
  return [
    ...state,
    {
      effectId: effect.id,
      sourceCardInstanceId: input.sourceCardInstanceId,
      condition: conditions[details.conditionType - 1] ?? requireCondition(),
      num: details.num,
      deckUnderAdd: details.deckUnderAdd,
      deckOverAdd: details.deckOverAdd,
      deckUnderLimit: details.deckUnderLimit,
      deckOverLimit: details.deckOverLimit,
      embeddedEffects,
      power: input.power,
      duration: createLiveSkillEffectDuration(
        details.displayTimeType,
        details.displayTime,
        'Induce Skill Effect',
      ),
      parentControlsLifetime: input.parentControlsLifetime,
    },
  ];
}

export function notifyLiveInduceSkillEffect(
  state: LiveInduceSkillEffectState,
  input: Readonly<{
    condition: LiveInduceSkillEffectCondition;
    value: number;
    allDeckCardCount: number;
    deckCardMax: number;
  }>,
): readonly LiveInduceSkillEffectApplication[] {
  if (
    !Number.isFinite(input.value) ||
    !Number.isSafeInteger(input.allDeckCardCount) ||
    input.allDeckCardCount < 0 ||
    !Number.isSafeInteger(input.deckCardMax) ||
    input.deckCardMax <= 0
  ) {
    throw new Error('Live Induce Skill Effect notification differs');
  }
  if (input.value < 0) return [];
  return state.flatMap((induce) => {
    if (induce.condition !== input.condition) return [];
    const deckDifference = input.allDeckCardCount - input.deckCardMax;
    const count = Math.min(
      Math.abs(deckDifference),
      deckDifference < 0 ? induce.deckUnderLimit : induce.deckOverLimit,
    );
    const add = deckDifference < 0 ? induce.deckUnderAdd : induce.deckOverAdd;
    const basePower = numToValue(Math.fround(induce.num) * input.value);
    const deckPower = Math.fround(1 + Math.fround(numToValue(add) * Math.fround(count)));
    const effectPower = Math.fround(basePower * deckPower);
    return induce.embeddedEffects.map((effect) => ({
      sourceCardInstanceId: induce.sourceCardInstanceId,
      effect,
      notify: false as const,
      power: {
        addValue: induce.power.addValue,
        multiplyFactor: induce.power.multiplyFactor,
        effectPower: [1, 2, 14].includes(effect.actionType) ? effectPower : 1,
      },
    }));
  });
}

export function advanceLiveInduceSkillEffectState(
  state: LiveInduceSkillEffectState,
  input: LiveSkillEffectClock,
): LiveInduceSkillEffectState {
  return state.flatMap((effect) => {
    if (effect.parentControlsLifetime) return [effect];
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

export function deactivateLiveInduceSkillEffect(
  state: LiveInduceSkillEffectState,
  effectId: string,
  sourceCardInstanceId: number,
): LiveInduceSkillEffectState {
  return state.filter(
    (effect) =>
      effect.effectId !== effectId || effect.sourceCardInstanceId !== sourceCardInstanceId,
  );
}

const conditions: readonly LiveInduceSkillEffectCondition[] = [
  'voltage-point',
  'mental-recover',
  'mental-barrier',
];

function requireCondition(): never {
  throw new Error('Live Induce Skill Effect condition differs');
}

function numToValue(value: number): number {
  return Math.fround(Math.fround(value) / Math.fround(10_000));
}

function requireInduceSkillEffectDetails(effect: LiveSkillEffect) {
  const expectedTypes = new Set([
    'INDUCE_SKILL_EFFECT_CONDITION_TYPE',
    'INDUCE_SKILL_EFFECT_PARAMS_ID',
    'INDUCE_SKILL_EFFECT_NUM',
    'INDUCE_SKILL_EFFECT_DECK_UNDER_ADD',
    'INDUCE_SKILL_EFFECT_DECK_OVER_ADD',
    'INDUCE_SKILL_EFFECT_DECK_UNDER_LIMIT',
    'INDUCE_SKILL_EFFECT_DECK_OVER_LIMIT',
    'INDUCE_SKILL_EFFECT_DISPLAY_TIME_TYPE',
    'INDUCE_SKILL_EFFECT_DISPLAY_TIME',
  ]);
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    effect.details.length !== expectedTypes.size ||
    details.size !== expectedTypes.size ||
    effect.details.some(
      (detail) =>
        !expectedTypes.has(detail.detailType) ||
        detail.targetMood !== 0 ||
        !Number.isSafeInteger(detail.effectValue) ||
        (detail.detailType === 'INDUCE_SKILL_EFFECT_PARAMS_ID'
          ? detail.params.length !== 1
          : detail.params.length !== 0),
    )
  ) {
    throw new Error('Live Induce Skill Effect details differ');
  }
  const value = (name: string) => {
    const detail = details.get(name);
    if (detail === undefined) {
      throw new Error(`Live Induce Skill Effect detail is absent:${name}`);
    }
    return detail.effectValue;
  };
  const paramsDetail = details.get('INDUCE_SKILL_EFFECT_PARAMS_ID');
  const param = paramsDetail?.params[0];
  if (param === undefined || param.paramType !== 'INDUCE_SKILL_EFFECT_PARAMS_ID') {
    throw new Error('Live Induce Skill Effect params differ');
  }
  const effectIds = param.paramValue.split(',');
  if (
    effectIds.length === 0 ||
    effectIds.some((id) => !/^[1-9]\d*$/.test(id)) ||
    new Set(effectIds).size !== effectIds.length
  ) {
    throw new Error('Live Induce Skill Effect effect IDs differ');
  }
  const result = {
    conditionType: value('INDUCE_SKILL_EFFECT_CONDITION_TYPE'),
    num: value('INDUCE_SKILL_EFFECT_NUM'),
    deckUnderAdd: value('INDUCE_SKILL_EFFECT_DECK_UNDER_ADD'),
    deckOverAdd: value('INDUCE_SKILL_EFFECT_DECK_OVER_ADD'),
    deckUnderLimit: value('INDUCE_SKILL_EFFECT_DECK_UNDER_LIMIT'),
    deckOverLimit: value('INDUCE_SKILL_EFFECT_DECK_OVER_LIMIT'),
    displayTimeType: value('INDUCE_SKILL_EFFECT_DISPLAY_TIME_TYPE'),
    displayTime: value('INDUCE_SKILL_EFFECT_DISPLAY_TIME'),
    effectIds,
  };
  if (
    !conditions[result.conditionType - 1] ||
    result.num < 0 ||
    result.deckUnderLimit < 0 ||
    result.deckOverLimit < 0
  ) {
    throw new Error('Live Induce Skill Effect detail value differs');
  }
  return result;
}
