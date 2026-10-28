import type { LiveSkillEffect } from './skillTypes.ts';
import { ceilToInt32, floatToInt32, isInt64 } from '../numeric.ts';
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
  currentAp: number;
  currentMental: number;
  currentVoltage: bigint;
  currentVoltageLevel: number;
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
  if (effect.duration.kind !== 'full-end') return state;
  const first = state.effects.length === 0;
  return {
    effects: [...state.effects, effect].sort((left, right) => right.effectValue - left.effectValue),
    currentGauge: first
      ? calculateLiveInitialGenesisGauge({
          currentAp: rollback.currentAp,
          currentMental: rollback.currentMental,
          currentVoltageLevel: rollback.currentVoltageLevel,
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
    currentGauge: Number(BigInt.asIntN(32, BigInt(state.currentGauge) + BigInt(delta))),
  };
}

export function createLiveGenesisEffect(
  effect: LiveSkillEffect,
  currentTimeSeconds: number,
  applySkillBoost: (value: number) => number,
): LiveGenesisEffect | null {
  if (effect.actionType !== 51 || !Number.isFinite(currentTimeSeconds)) {
    throw new Error('Live Genesis skill input is invalid');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['GENESIS_EFFECT_BASE_NUM', 'GENESIS_DISPLAY_TIME_TYPE', 'GENESIS_DISPLAY_TIME'],
    'Genesis',
  );
  return createLiveGenesisEffectFromParameters(
    {
      effectId: effect.id,
      effectBaseNum: BigInt(
        requireLiveSkillEffectDetailValue(details, 'GENESIS_EFFECT_BASE_NUM', 'Genesis'),
      ),
      displayTimeType: BigInt(
        requireLiveSkillEffectDetailValue(details, 'GENESIS_DISPLAY_TIME_TYPE', 'Genesis'),
      ),
      displayTime: BigInt(
        requireLiveSkillEffectDetailValue(details, 'GENESIS_DISPLAY_TIME', 'Genesis'),
      ),
      currentTimeSeconds,
    },
    applySkillBoost,
  );
}

export function createLiveGenesisEffectFromParameters(
  input: Readonly<{
    effectId: string;
    effectBaseNum: bigint;
    displayTimeType: bigint;
    displayTime: bigint;
    currentTimeSeconds: number;
  }>,
  applySkillBoost: (value: number) => number,
): LiveGenesisEffect | null {
  if (
    !isInt64(input.effectBaseNum) ||
    !isInt64(input.displayTimeType) ||
    !isInt64(input.displayTime)
  )
    throw new Error('Live Genesis skill parameters are invalid');
  const displayTimeType = Number(BigInt.asIntN(32, input.displayTimeType));
  const displayTime = Number(BigInt.asIntN(32, input.displayTime));
  if (displayTimeType !== 3 && displayTime < 1) return null;
  const baseValue = Math.fround(
    Math.fround(Number(BigInt.asIntN(32, input.effectBaseNum))) / 10_000,
  );
  const effectValue = baseValue > 0 ? Math.fround(applySkillBoost(baseValue)) : baseValue;
  if (!Number.isFinite(effectValue)) {
    throw new Error('Live Genesis skill effect value is invalid');
  }
  return {
    effectId: input.effectId,
    effectValue,
    duration: createLiveSkillEffectDuration(
      displayTimeType === 1 || displayTimeType === 2 ? displayTimeType : 3,
      displayTimeType === 3 ? 0 : displayTime,
      input.currentTimeSeconds,
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
  return ceilToInt32(
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
  const effectValue = Math.fround(input.effectValue);
  if (effectValue === 0) return null;
  const sign = effectValue < 0 ? -1 : 1;
  const magnitude = Math.abs(effectValue);
  if (input.actionType === 39) {
    return Math.imul(floatToInt32(effectValue), sign);
  }
  const scale = genesisGaugeScale(input.gaugeType);
  if (scale === null) return 0;
  const denominator = Math.fround(Math.sqrt(Math.fround(magnitude * Math.fround(scale))));
  const delta = Math.fround(
    Math.fround(magnitude / denominator) * Math.fround(input.currentGenesisEffectValue),
  );
  return Math.imul(ceilToInt32(delta), sign);
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
    state.currentGauge < -2_147_483_648 ||
    state.currentGauge > 2_147_483_647 ||
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
    !Number.isSafeInteger(rollback.currentAp) ||
    rollback.currentAp < 0 ||
    !Number.isSafeInteger(rollback.currentMental) ||
    rollback.currentMental < 0 ||
    rollback.currentVoltage < 0n ||
    !Number.isSafeInteger(rollback.currentVoltageLevel) ||
    rollback.currentVoltageLevel < 0
  ) {
    throw new Error('Live Genesis rollback is invalid');
  }
}
