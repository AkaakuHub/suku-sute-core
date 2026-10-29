import { calculateLiveRegenGaugeSkillValue } from './regenGaugeValue.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
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
  calculationType: number;
  value: number;
}>;

export type LiveRegenGaugeEffect<
  Application extends LiveRegenGaugeApplication = LiveRegenGaugeApplication,
> = Application &
  Readonly<{
    registrationId: number;
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
    registrationId: number;
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
): Readonly<{
  state: LiveRegenGaugeState;
  application: LiveRegenGaugeApplication;
}> {
  if (!Number.isSafeInteger(input.registrationId) || input.registrationId < 1)
    throw new Error('Live regen gauge registration is invalid');
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
  const baseDetail = details.get(contract.baseValue);
  const bonus = details.get(contract.bonusMood);
  if (!baseDetail || !bonus) throw new Error(`Live ${contract.label} values are absent`);
  const baseValue = Math.fround(Math.fround(baseDetail.effectValue) / 10_000);
  const bonusValue = Math.fround(Math.fround(bonus.effectValue) / 10_000);
  const moodCorrection = calculateLiveSkillMoodCorrection(
    bonus.targetMood,
    input.currentMoodValue,
    bonusValue,
  );
  const value = Math.fround(
    input.applySkillBoost(
      calculateLiveRegenGaugeSkillValue(Math.fround(baseValue + moodCorrection), input.power),
    ),
  );
  if (!Number.isFinite(value)) throw new Error(`Live ${contract.label} boosted value is invalid`);
  const application: LiveRegenGaugeApplication = {
    actionType: contract.actionType,
    gauge: contract.gauge,
    calculationType: requireDetailValue(details, contract.calculationType, contract.label),
    value,
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
        registrationId: input.registrationId,
        effectId: effect.id,
        ...timing,
      },
    ],
    application,
  };
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
