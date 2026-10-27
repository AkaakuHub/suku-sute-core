import type { LiveAdditionalBuffCard } from './additionalBuffTarget.ts';
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

export type LiveConvertVoltageDestination =
  | 'heart'
  | 'love-up'
  | 'mental-recovery'
  | 'mental-barrier';

export type LiveConvertVoltageUpEffect = Readonly<{
  effectId: string;
  destination: LiveConvertVoltageDestination;
  unitValue: number;
  resultDisplayTimeType: 1 | 2 | 3;
  resultDisplayTime: number;
  resultDisabledType: 0 | 1 | 2;
  duration: LiveSkillEffectDuration;
  remainingConversions: number | null;
  card: LiveAdditionalBuffCard;
  parentControlsLifetime: boolean;
}>;

export type LiveConvertVoltageUpState = readonly LiveConvertVoltageUpEffect[];

export type LiveVoltageConversion = Readonly<{
  effectId: string;
  destination: LiveConvertVoltageDestination;
  amount: number;
  resultDuration: LiveSkillEffectDuration;
  resultDisabledType: 0 | 1 | 2;
  card: LiveAdditionalBuffCard;
}>;

export function createLiveConvertVoltageUpState(): LiveConvertVoltageUpState {
  return [];
}

export function activateLiveConvertVoltageUp(
  state: LiveConvertVoltageUpState,
  effect: LiveSkillEffect,
  input: Readonly<{
    currentTimeSeconds: number;
    power: LiveSkillEffectPower;
    card: LiveAdditionalBuffCard;
    parentControlsLifetime: boolean;
    applySkillBoost: (value: number) => number;
  }>,
): LiveConvertVoltageUpState {
  if (effect.actionType !== 22) {
    throw new Error('Live Convert Voltage Up action type differs');
  }
  validateLiveSkillEffectPower(input.power, 'Convert Voltage Up');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'CONVERT_VOLTAGE_UP_CONVERT_TYPE',
      'CONVERT_VOLTAGE_UP_NUM',
      'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME_TYPE',
      'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME',
      'CONVERT_VOLTAGE_UP_CONVERT_DISABLED_TYPE',
      'CONVERT_VOLTAGE_UP_DISPLAY_TIME_TYPE',
      'CONVERT_VOLTAGE_UP_DISPLAY_TIME',
      'CONVERT_VOLTAGE_UP_DISABLED_TYPE',
      'CONVERT_VOLTAGE_UP_DISABLED',
    ],
    'Convert Voltage Up',
  );
  const destination = resolveDestination(requireValue(details, 'CONVERT_VOLTAGE_UP_CONVERT_TYPE'));
  const poweredValue = Math.fround(
    Math.fround(
      Math.fround(requireValue(details, 'CONVERT_VOLTAGE_UP_NUM') / 10_000) + input.power.addValue,
    ) * input.power.multiplyFactor,
  );
  const unitValue = Math.ceil(
    poweredValue > 0 ? input.applySkillBoost(poweredValue) : poweredValue,
  );
  const resultDisabledType = requireValue(details, 'CONVERT_VOLTAGE_UP_CONVERT_DISABLED_TYPE');
  if (resultDisabledType !== 0 && resultDisabledType !== 1 && resultDisabledType !== 2) {
    throw new Error('Live Convert Voltage Up result disabled type differs');
  }
  const disabledType = requireValue(details, 'CONVERT_VOLTAGE_UP_DISABLED_TYPE');
  if (disabledType !== 0 && disabledType !== 1) {
    throw new Error('Live Convert Voltage Up disabled type differs');
  }
  const disabledCount = requireValue(details, 'CONVERT_VOLTAGE_UP_DISABLED');
  if (
    !Number.isSafeInteger(disabledCount) ||
    disabledCount < 0 ||
    (disabledType === 1 && disabledCount < 1)
  ) {
    throw new Error('Live Convert Voltage Up disabled count differs');
  }
  return [
    ...state,
    {
      effectId: effect.id,
      destination,
      unitValue,
      ...resolveResultDisplay(details, input.currentTimeSeconds),
      resultDisabledType,
      duration: createLiveSkillEffectDuration(
        requireValue(details, 'CONVERT_VOLTAGE_UP_DISPLAY_TIME_TYPE'),
        requireValue(details, 'CONVERT_VOLTAGE_UP_DISPLAY_TIME'),
        input.currentTimeSeconds,
        'Convert Voltage Up',
      ),
      remainingConversions: disabledType === 1 ? disabledCount : null,
      card: input.card,
      parentControlsLifetime: input.parentControlsLifetime,
    },
  ];
}

export function convertLiveVoltageUp(
  state: LiveConvertVoltageUpState,
  voltageUp: number,
  currentTimeSeconds: number,
): Readonly<{
  state: LiveConvertVoltageUpState;
  conversion: LiveVoltageConversion | null;
}> {
  if (!Number.isSafeInteger(voltageUp) || !Number.isFinite(currentTimeSeconds)) {
    throw new Error('Live Convert Voltage Up amount is invalid');
  }
  if (voltageUp < 1 || state.length === 0) {
    return { state, conversion: null };
  }
  const selected = state[0];
  if (selected === undefined) return { state, conversion: null };
  const amount = Math.ceil(Math.fround(selected.unitValue * voltageUp));
  const remainingConversions =
    selected.remainingConversions === null ? null : selected.remainingConversions - 1;
  return {
    state:
      remainingConversions === 0
        ? state.slice(1)
        : [{ ...selected, remainingConversions }, ...state.slice(1)],
    conversion: {
      effectId: selected.effectId,
      destination: selected.destination,
      amount,
      resultDuration: createLiveSkillEffectDuration(
        selected.resultDisplayTimeType,
        selected.resultDisplayTime,
        currentTimeSeconds,
        'Convert Voltage Up result',
      ),
      resultDisabledType: selected.resultDisabledType,
      card: selected.card,
    },
  };
}

export function advanceLiveConvertVoltageUpState(
  state: LiveConvertVoltageUpState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveConvertVoltageUpState {
  return state.flatMap((effect) => {
    if (effect.parentControlsLifetime) return [effect];
    const duration = advanceLiveSkillEffectDuration(effect.duration, input);
    return duration === null ? [] : [{ ...effect, duration }];
  });
}

export function deactivateLiveConvertVoltageUp(
  state: LiveConvertVoltageUpState,
  effectId: string,
): LiveConvertVoltageUpState {
  return state.filter((effect) => effect.effectId !== effectId);
}

function resolveDestination(value: number): LiveConvertVoltageDestination {
  switch (value) {
    case 1:
      return 'heart';
    case 2:
      return 'love-up';
    case 3:
      return 'mental-recovery';
    case 4:
      return 'mental-barrier';
    default:
      throw new Error('Live Convert Voltage Up destination differs');
  }
}

function resolveResultDisplay(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  currentTimeSeconds: number,
): Readonly<{
  resultDisplayTimeType: 1 | 2 | 3;
  resultDisplayTime: number;
}> {
  const displayTimeType = requireValue(details, 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME_TYPE');
  const displayTime = requireValue(details, 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME');
  createLiveSkillEffectDuration(
    displayTimeType,
    displayTime,
    currentTimeSeconds,
    'Convert Voltage Up result',
  );
  if (displayTimeType !== 1 && displayTimeType !== 2 && displayTimeType !== 3) {
    throw new Error('Live Convert Voltage Up result display type differs');
  }
  return {
    resultDisplayTimeType: displayTimeType,
    resultDisplayTime: displayTime,
  };
}

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Convert Voltage Up');
}
