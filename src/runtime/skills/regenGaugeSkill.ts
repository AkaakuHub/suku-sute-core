import { resolveLiveGaugeSkillEffectAmount } from './gaugeSkillEffectValue.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  advanceLiveRegenGaugeDuration,
  createLiveRegenGaugeTiming,
  type LiveRegenGaugeInterval,
  type LiveRegenGaugeDuration,
} from './regenGaugeTiming.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import { requireLiveSkillEffectDetails } from './skillEffectValue.ts';

export type LiveRegenGaugeApplication = Readonly<{
  actionType: 6 | 11;
  gauge: 'mental' | 'voltage';
  amount: number;
}>;

export type LiveRegenGaugeEffect<
  Application extends LiveRegenGaugeApplication = LiveRegenGaugeApplication,
> = Application &
  Readonly<{
    effectId: string;
    interval: LiveRegenGaugeInterval;
    duration: LiveRegenGaugeDuration;
  }>;

export type LiveRegenGaugeState<
  Application extends LiveRegenGaugeApplication = LiveRegenGaugeApplication,
> = readonly LiveRegenGaugeEffect<Application>[];

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
  const timing = createLiveRegenGaugeTiming(
    requireDetailValue(details, contract.intervalType, contract.label),
    requireDetailValue(details, contract.intervalValue, contract.label),
    requireDetailValue(details, contract.displayTimeType, contract.label),
    requireDetailValue(details, contract.displayTime, contract.label),
  );
  return {
    state: [
      ...state,
      {
        ...application,
        effectId: effect.id,
        ...timing,
      },
    ],
    application,
  };
}

export function advanceLiveRegenGaugeClock<Effect extends LiveRegenGaugeEffect>(
  state: readonly Effect[],
  input: Readonly<{
    currentTimeSeconds: number;
    deltaTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): Readonly<{
  state: readonly Effect[];
  applications: readonly Omit<Effect, 'effectId' | 'interval' | 'duration'>[];
}> {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('Live regen gauge delta time is invalid');
  }
  const applications: Omit<Effect, 'effectId' | 'interval' | 'duration'>[] = [];
  const effects = state.flatMap((effect) => {
    let interval = effect.interval;
    if (interval.kind === 'milliseconds') {
      const elapsedSeconds = Math.fround(
        interval.elapsedSeconds + Math.fround(input.deltaTimeSeconds),
      );
      if (elapsedSeconds >= interval.seconds) {
        applications.push(toApplication(effect));
      }
      interval = {
        ...interval,
        elapsedSeconds:
          elapsedSeconds >= interval.seconds
            ? Math.fround(elapsedSeconds - interval.seconds)
            : elapsedSeconds,
      };
    }
    const duration = advanceLiveRegenGaugeDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, interval, duration }];
  });
  return { state: effects, applications };
}

export function notifyLiveRegenGaugeBeatHeartCreated<Effect extends LiveRegenGaugeEffect>(
  state: readonly Effect[],
): Readonly<{
  state: readonly Effect[];
  applications: readonly Omit<Effect, 'effectId' | 'interval' | 'duration'>[];
}> {
  const applications: Omit<Effect, 'effectId' | 'interval' | 'duration'>[] = [];
  const effects = state.map((effect) => {
    if (effect.interval.kind !== 'beat-heart') return effect;
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

export function advanceLiveRegenGaugeSections<Effect extends LiveRegenGaugeEffect>(
  state: readonly Effect[],
  sectionChangeCount: number,
): readonly Effect[] {
  return state.flatMap((effect) => {
    if (effect.duration.kind !== 'sections') return [effect];
    const duration = advanceLiveRegenGaugeDuration(effect.duration, {
      deltaTimeSeconds: 0,
      sectionChangeCount,
      musicEnded: false,
    });
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

function toApplication<Effect extends LiveRegenGaugeEffect>(
  effect: Effect,
): Omit<Effect, 'effectId' | 'interval' | 'duration'> {
  const { effectId: _effectId, interval: _interval, duration: _duration, ...application } = effect;
  return application;
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
