import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveGenesisEffect = Readonly<{
  effectId: string;
  effectValue: number;
  duration: LiveSkillEffectDuration;
}>;

export type LiveGenesisRollback = Readonly<{
  skillPoint: number;
  mental: number;
  voltagePoint: bigint;
  voltageLevel: number;
}>;

export type LiveGenesisState = Readonly<{
  effects: readonly LiveGenesisEffect[];
  currentGauge: number;
  rollback: LiveGenesisRollback | null;
}>;

export type LiveGenesisAdvanceResult = Readonly<{
  state: LiveGenesisState;
  finishedRollback: LiveGenesisRollback | null;
}>;

export function createLiveGenesisState(): LiveGenesisState {
  return { effects: [], currentGauge: 0, rollback: null };
}

export function activateLiveGenesisEffect(
  state: LiveGenesisState,
  effect: LiveGenesisEffect,
  rollback: LiveGenesisRollback,
): LiveGenesisState {
  validateGenesisState(state);
  validateRollback(rollback);
  const first = state.effects.length === 0;
  return {
    effects: [...state.effects, effect].sort((left, right) => right.effectValue - left.effectValue),
    currentGauge: first
      ? calculateLiveInitialGenesisGauge({
          currentAp: rollback.skillPoint,
          currentMental: rollback.mental,
          currentVoltageLevel: rollback.voltageLevel,
        })
      : state.currentGauge,
    rollback: first ? rollback : state.rollback,
  };
}

export function advanceLiveGenesisState(
  state: LiveGenesisState,
  input: {
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  },
): LiveGenesisAdvanceResult {
  validateGenesisState(state);
  if (
    !Number.isFinite(input.currentTimeSeconds) ||
    input.currentTimeSeconds < 0 ||
    !Number.isSafeInteger(input.sectionChangeCount) ||
    input.sectionChangeCount < 0
  ) {
    throw new Error('Live Genesis clock input is invalid');
  }
  const effects = state.effects.flatMap((effect) => {
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
  if (effects.length > 0) {
    return {
      state: { ...state, effects },
      finishedRollback: null,
    };
  }
  return {
    state: createLiveGenesisState(),
    finishedRollback: state.effects.length === 0 ? null : state.rollback,
  };
}

export function addLiveGenesisGauge(
  state: LiveGenesisState,
  input: {
    actionType: number;
    gaugeType: 0 | 1 | 2 | 3;
    effectValue: number;
  },
): LiveGenesisState {
  validateGenesisState(state);
  const current = state.effects[0];
  if (current === undefined) return state;
  const delta = calculateLiveGenesisGaugeDelta({
    ...input,
    currentGenesisEffectValue: current.effectValue,
  });
  if (delta === null) return state;
  return {
    ...state,
    currentGauge: Math.max(0, state.currentGauge + delta),
  };
}

export function createLiveGenesisEffect(
  effect: LiveSkillEffect,
  currentTimeSeconds: number,
  applySkillBoost: (value: number) => number,
): LiveGenesisEffect {
  if (effect.actionType !== 51 || !Number.isFinite(currentTimeSeconds)) {
    throw new Error('Live Genesis skill input is invalid');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['GENESIS_EFFECT_BASE_NUM', 'GENESIS_DISPLAY_TIME_TYPE', 'GENESIS_DISPLAY_TIME'],
    'Genesis',
  );
  const baseValue = Math.fround(
    requireLiveSkillEffectDetailValue(details, 'GENESIS_EFFECT_BASE_NUM', 'Genesis') / 10_000,
  );
  const effectValue = Math.fround(applySkillBoost(baseValue));
  if (!Number.isFinite(effectValue)) {
    throw new Error('Live Genesis skill effect value is invalid');
  }
  return {
    effectId: effect.id,
    effectValue,
    duration: createLiveSkillEffectDuration(
      requireLiveSkillEffectDetailValue(details, 'GENESIS_DISPLAY_TIME_TYPE', 'Genesis'),
      requireLiveSkillEffectDetailValue(details, 'GENESIS_DISPLAY_TIME', 'Genesis'),
      currentTimeSeconds,
      'Genesis',
    ),
  };
}

export function calculateLiveInitialGenesisGauge(input: {
  currentAp: number;
  currentMental: number;
  currentVoltageLevel: number;
}): number {
  if (
    !Number.isSafeInteger(input.currentAp) ||
    input.currentAp < 0 ||
    !Number.isSafeInteger(input.currentMental) ||
    input.currentMental < 0 ||
    !Number.isSafeInteger(input.currentVoltageLevel) ||
    input.currentVoltageLevel < 0
  ) {
    throw new Error('Live initial Genesis gauge input is invalid');
  }
  return Math.ceil(
    Math.fround(
      Math.fround(input.currentMental * 0.25) +
        Math.fround((input.currentVoltageLevel + input.currentAp) * 5),
    ),
  );
}

export function calculateLiveGenesisGaugeDelta(input: {
  actionType: number;
  gaugeType: 0 | 1 | 2 | 3;
  effectValue: number;
  currentGenesisEffectValue: number;
}): number | null {
  if (
    !Number.isSafeInteger(input.actionType) ||
    !Number.isFinite(input.effectValue) ||
    !Number.isFinite(input.currentGenesisEffectValue)
  ) {
    throw new Error('Live Genesis gauge input is invalid');
  }
  if (input.effectValue === 0) return null;
  const sign = input.effectValue < 0 ? -1 : 1;
  const magnitude = Math.abs(Math.fround(input.effectValue));
  if (input.actionType === 39) {
    return Math.trunc(input.effectValue) * sign;
  }
  const scale = genesisGaugeScale(input.gaugeType);
  if (scale === null) return 0;
  const denominator = Math.fround(Math.sqrt(Math.fround(magnitude * Math.fround(scale))));
  const delta = Math.fround(
    Math.fround(magnitude / denominator) * Math.fround(input.currentGenesisEffectValue),
  );
  return Math.ceil(delta) * sign;
}

function genesisGaugeScale(gaugeType: 0 | 1 | 2 | 3): number | null {
  switch (gaugeType) {
    case 0:
      return null;
    case 1:
      return 1;
    case 2:
      return 0.25;
    case 3:
      return 0.02;
  }
}

function validateGenesisState(state: LiveGenesisState): void {
  if (
    !Number.isSafeInteger(state.currentGauge) ||
    state.currentGauge < 0 ||
    (state.effects.length === 0) !== (state.rollback === null) ||
    state.effects.some(
      (effect, index) =>
        !Number.isFinite(effect.effectValue) ||
        (index > 0 &&
          (state.effects[index - 1]?.effectValue ?? effect.effectValue) < effect.effectValue),
    )
  ) {
    throw new Error('Live Genesis state is invalid');
  }
}

function validateRollback(rollback: LiveGenesisRollback): void {
  if (
    !Number.isSafeInteger(rollback.skillPoint) ||
    rollback.skillPoint < 0 ||
    !Number.isSafeInteger(rollback.mental) ||
    rollback.mental < 0 ||
    rollback.voltagePoint < 0n ||
    !Number.isSafeInteger(rollback.voltageLevel) ||
    rollback.voltageLevel < 0
  ) {
    throw new Error('Live Genesis rollback is invalid');
  }
}
