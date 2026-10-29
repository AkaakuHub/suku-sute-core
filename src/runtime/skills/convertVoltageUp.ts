import type { LiveSkillEffectClock } from './skillEffectDuration.ts';
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

export type LiveConvertVoltageUpEffect<Card = LiveAdditionalBuffCard> = Readonly<{
  effectId: string;
  destination: LiveConvertVoltageDestination;
  num: number;
  resultDuration: LiveSkillEffectDuration;
  resultDisabledType: 0 | 1 | 2;
  duration: LiveSkillEffectDuration;
  disabledOnConvertCount: bigint | null;
  conversions: number;
  card: Card;
  deactivationKey: string | null;
  parentControlsLifetime: boolean;
}>;

export type LiveConvertVoltageUpState<Card = LiveAdditionalBuffCard> =
  readonly LiveConvertVoltageUpEffect<Card>[];

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
  const num = calculateLiveConvertVoltageUpNum(
    requireValue(details, 'CONVERT_VOLTAGE_UP_NUM'),
    input.power.addValue,
    input.power.multiplyFactor,
    input.applySkillBoost,
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
      num,
      resultDuration: createLiveSkillEffectDuration(
        requireValue(details, 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME_TYPE'),
        requireValue(details, 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME'),
        'Convert Voltage Up result',
      ),
      resultDisabledType,
      duration: createLiveSkillEffectDuration(
        requireValue(details, 'CONVERT_VOLTAGE_UP_DISPLAY_TIME_TYPE'),
        requireValue(details, 'CONVERT_VOLTAGE_UP_DISPLAY_TIME'),
        'Convert Voltage Up',
      ),
      disabledOnConvertCount: disabledType === 1 ? BigInt(disabledCount) : null,
      conversions: 0,
      deactivationKey: null,
      card: input.card,
      parentControlsLifetime: input.parentControlsLifetime,
    },
  ];
}

export function calculateLiveConvertVoltageUpNum(
  num: number,
  addValue: number,
  multiplier: number,
  applySkillBoost: (value: number) => number,
): number {
  const base = Math.fround(
    Math.fround(Math.fround(int32(num)) + Math.fround(addValue)) * Math.fround(multiplier),
  );
  return int32(base > 0 ? applySkillBoost(base) : base);
}

function int32(value: number): number {
  return !Number.isFinite(value) || value < -2_147_483_648 || value > 2_147_483_647
    ? -2_147_483_648
    : Math.trunc(value);
}

export function convertLiveVoltageUp<Card>(
  state: LiveConvertVoltageUpState<Card>,
  voltageUp: number | bigint,
  currentTimeSeconds: number,
): Readonly<{
  state: LiveConvertVoltageUpState<Card>;
  conversion: (Omit<LiveVoltageConversion, 'card'> & { card: Card }) | null;
}> {
  if (
    (typeof voltageUp === 'number' && !Number.isSafeInteger(voltageUp)) ||
    !Number.isFinite(currentTimeSeconds)
  ) {
    throw new Error('Live Convert Voltage Up amount is invalid');
  }
  const selected = state.at(-1);
  if (voltageUp < 1 || selected === undefined) return { state, conversion: null };
  const product = BigInt.asIntN(32, BigInt(selected.num) * BigInt.asIntN(32, BigInt(voltageUp)));
  const raw = Math.fround(Math.fround(Number(product)) / Math.fround(10_000));
  const rounded = Math.fround(Math.ceil(Math.fround(raw * 10)) / 10);
  const amount =
    selected.destination === 'mental-barrier'
      ? rounded
      : Math.trunc(selected.destination === 'heart' ? rounded : raw);
  const conversions = Number(BigInt.asIntN(32, BigInt(selected.conversions + 1)));
  return {
    state:
      selected.disabledOnConvertCount === BigInt(conversions)
        ? state.slice(0, -1)
        : [...state.slice(0, -1), { ...selected, conversions }],
    conversion: {
      effectId: selected.effectId,
      destination: selected.destination,
      amount,
      resultDuration: selected.resultDuration,
      resultDisabledType: selected.resultDisabledType,
      card: selected.card,
    },
  };
}

export function advanceLiveConvertVoltageUpState<Card>(
  state: LiveConvertVoltageUpState<Card>,
  input: LiveSkillEffectClock,
): LiveConvertVoltageUpState<Card> {
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

function requireValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): number {
  return requireLiveSkillEffectDetailValue(details, name, 'Convert Voltage Up');
}
