import { resolveLiveGaugeSkillEffectAmount } from './gaugeSkillEffectValue.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  createLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { requireLiveSkillEffectDetails } from './skillEffectValue.ts';

export type LiveRegenGaugeApplication = Readonly<{
  actionType: 6 | 11;
  gauge: 'mental' | 'voltage';
  amount: number;
}>;

type LiveRegenGaugeInterval =
  | Readonly<{
      kind: 'milliseconds';
      seconds: number;
      elapsedSeconds: number;
    }>
  | Readonly<{
      kind: 'skill-created-heart';
      count: number;
      progress: number;
    }>;

export type LiveRegenGaugeEffect = LiveRegenGaugeApplication &
  Readonly<{
    effectId: string;
    interval: LiveRegenGaugeInterval;
    duration: LiveSkillEffectDuration;
  }>;

export type LiveRegenGaugeState = readonly LiveRegenGaugeEffect[];

export function createLiveRegenGaugeState(): LiveRegenGaugeState {
  return [];
}

export function activateLiveRegenGaugeEffect(
  state: LiveRegenGaugeState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{
  state: LiveRegenGaugeState;
  application: LiveRegenGaugeApplication;
}> {
  const contract = resolveContract(effect.actionType);
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      contract.calculationType,
      contract.baseValue,
      contract.bonusMood,
      contract.intervalType,
      contract.intervalValue,
      contract.displayTimeType,
      contract.displayTime,
    ],
    contract.label,
  );
  const amount = input.applySkillBoost(
    resolveLiveGaugeSkillEffectAmount(effect, input, {
      ...contract,
      additionalDetailTypes: [
        contract.intervalType,
        contract.intervalValue,
        contract.displayTimeType,
        contract.displayTime,
      ],
    }),
  );
  if (!Number.isFinite(amount)) {
    throw new Error(`Live ${contract.label} boosted amount is invalid`);
  }
  const application: LiveRegenGaugeApplication = {
    actionType: contract.actionType,
    gauge: contract.gauge,
    amount: Math.trunc(amount),
  };
  const intervalType = requireDetailValue(details, contract.intervalType, contract.label);
  const intervalValue = requirePositiveDetailValue(details, contract.intervalValue, contract.label);
  const interval: LiveRegenGaugeInterval =
    intervalType === 1
      ? {
          kind: 'milliseconds',
          seconds: intervalValue / 1_000,
          elapsedSeconds: 0,
        }
      : intervalType === 2
        ? {
            kind: 'skill-created-heart',
            count: intervalValue,
            progress: 0,
          }
        : invalidIntervalType(contract.label);
  return {
    state: [
      ...state,
      {
        ...application,
        effectId: effect.id,
        interval,
        duration: createLiveSkillEffectDuration(
          requireDetailValue(details, contract.displayTimeType, contract.label),
          requireDetailValue(details, contract.displayTime, contract.label),
          contract.label,
        ),
      },
    ],
    application,
  };
}

export function advanceLiveRegenGaugeClock(
  state: LiveRegenGaugeState,
  input: Readonly<{
    currentTimeSeconds: number;
    deltaTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): Readonly<{
  state: LiveRegenGaugeState;
  applications: readonly LiveRegenGaugeApplication[];
}> {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('Live regen gauge delta time is invalid');
  }
  const applications: LiveRegenGaugeApplication[] = [];
  const effects = state.flatMap((effect) => {
    let interval = effect.interval;
    if (interval.kind === 'milliseconds') {
      const elapsedSeconds = interval.elapsedSeconds + input.deltaTimeSeconds;
      if (elapsedSeconds >= interval.seconds) {
        applications.push(toApplication(effect));
      }
      interval = {
        ...interval,
        elapsedSeconds:
          elapsedSeconds >= interval.seconds ? elapsedSeconds - interval.seconds : elapsedSeconds,
      };
    }
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, interval, duration }];
  });
  return { state: effects, applications };
}

export function notifyLiveRegenGaugeSkillHeartCreated(state: LiveRegenGaugeState): Readonly<{
  state: LiveRegenGaugeState;
  applications: readonly LiveRegenGaugeApplication[];
}> {
  const applications: LiveRegenGaugeApplication[] = [];
  const effects = state.map((effect) => {
    if (effect.interval.kind !== 'skill-created-heart') return effect;
    const progress = effect.interval.progress + 1;
    if (progress < effect.interval.count) {
      return {
        ...effect,
        interval: { ...effect.interval, progress },
      };
    }
    applications.push(toApplication(effect));
    return {
      ...effect,
      interval: { ...effect.interval, progress: 0 },
    };
  });
  return { state: effects, applications };
}

function toApplication(effect: LiveRegenGaugeEffect): LiveRegenGaugeApplication {
  return {
    actionType: effect.actionType,
    gauge: effect.gauge,
    amount: effect.amount,
  };
}

function requireDetailValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): number {
  const detail = details.get(name);
  if (detail === undefined) {
    throw new Error(`Live ${label} detail is absent:${name}`);
  }
  return detail.effectValue;
}

function requirePositiveDetailValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): number {
  const value = requireDetailValue(details, name, label);
  if (value < 1) {
    throw new Error(`Live ${label} interval is invalid`);
  }
  return value;
}

function invalidIntervalType(label: string): never {
  throw new Error(`Live ${label} interval type is invalid`);
}

function resolveContract(actionType: number): Readonly<{
  actionType: 6 | 11;
  gauge: LiveRegenGaugeApplication['gauge'];
  label: string;
  calculationType: string;
  baseValue: string;
  bonusMood: string;
  intervalType: string;
  intervalValue: string;
  displayTimeType: string;
  displayTime: string;
}> {
  if (actionType === 6) {
    return {
      actionType,
      gauge: 'mental',
      label: 'Mental regeneration',
      calculationType: 'REGEN_MENTAL_TYPE',
      baseValue: 'REGEN_MENTAL_NUM_BASE',
      bonusMood: 'REGEN_MENTAL_NUM_BONUS_MOOD',
      intervalType: 'REGEN_MENTAL_INTERVAL_TYPE',
      intervalValue: 'REGEN_MENTAL_INTERVAL_NUM',
      displayTimeType: 'REGEN_MENTAL_DISPLAY_TIME_TYPE',
      displayTime: 'REGEN_MENTAL_DISPLAY_TIME',
    };
  }
  if (actionType === 11) {
    return {
      actionType,
      gauge: 'voltage',
      label: 'Voltage regeneration',
      calculationType: 'REGEN_VOLTAGE_TYPE',
      baseValue: 'REGEN_VOLTAGE_NUM_BASE',
      bonusMood: 'REGEN_VOLTAGE_NUM_BONUS_MOOD',
      intervalType: 'REGEN_VOLTAGE_INTERVAL_TYPE',
      intervalValue: 'REGEN_VOLTAGE_INTERVAL_NUM',
      displayTimeType: 'REGEN_VOLTAGE_DISPLAY_TIME_TYPE',
      displayTime: 'REGEN_VOLTAGE_DISPLAY_TIME',
    };
  }
  throw new Error('Live regen gauge action type differs');
}
