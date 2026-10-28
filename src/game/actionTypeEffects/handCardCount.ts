import type { Effect, ParameterDetailValue } from '../modelTypes.ts';
import { int64ToInt32, isInt64 } from '../../runtime/numeric.ts';

type ActionType20Detail = Readonly<{
  id: bigint;
  detailType: string;
  value: bigint;
}>;

type ActionType20Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionType20Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

export function handCardCountEffect(
  amount: number,
  displayTimeType: number,
  displayTime: bigint,
  options: Readonly<{ invocationType?: number; deactivationKey?: string }> = {},
): Extract<Effect, { kind: 'hand-limit' }> {
  return {
    kind: 'hand-limit',
    calculationType: 1,
    amount,
    displayTimeType,
    displayTime,
    ...(options.invocationType !== undefined ? { invocationType: options.invocationType } : {}),
    ...(options.deactivationKey !== undefined ? { deactivationKey: options.deactivationKey } : {}),
  };
}

const detailTypes = {
  calculationType: 'CHANGE_HAND_CARD_COUNT_CALC_TYPE',
  amount: 'CHANGE_HAND_CARD_COUNT_NUM',
  displayTimeType: 'CHANGE_HAND_CARD_COUNT_DISPLAY_TIME_TYPE',
  displayTime: 'CHANGE_HAND_CARD_COUNT_DISPLAY_TIME',
} as const;

export function createHandCardCountEffect(input: ActionType20Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');

  const calculationTypeDetail = findDetail(input.details, detailTypes.calculationType);
  const amountDetail = findDetail(input.details, detailTypes.amount);
  const displayTimeTypeDetail = findDetail(input.details, detailTypes.displayTimeType);
  const displayTimeDetail = findDetail(input.details, detailTypes.displayTime);
  const calculationType = int64ToInt32(calculationTypeDetail?.value ?? 1n);

  const amountValue = amountDetail?.value ?? 0n;
  const displayTimeType = int64ToInt32(displayTimeTypeDetail?.value ?? 3n);
  const displayTime = displayTimeDetail?.value ?? 0n;
  if (!isInt64(amountValue) || !isInt64(displayTime))
    throw new Error('手札枚数変更の詳細値が正しくありません。');

  const parameterDetails: Record<string, ParameterDetailValue> = {};
  addParameterDetail(parameterDetails, 'calculationType', calculationTypeDetail);
  addParameterDetail(parameterDetails, 'amount', amountDetail);
  addParameterDetail(parameterDetails, 'displayTimeType', displayTimeTypeDetail);
  addParameterDetail(parameterDetails, 'displayTime', displayTimeDetail);

  const invocationType =
    input.invocationType === 0x388 || input.invocationType === 0x38b
      ? input.invocationType
      : undefined;
  return {
    kind: 'hand-limit',
    calculationType,
    amount: int64ToInt32(amountValue),
    displayTimeType,
    displayTime,
    ...(invocationType !== undefined ? { invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    parameterDetails,
    skillEffectId: input.skillEffectId,
  };
}

function findDetail(
  details: readonly ActionType20Detail[],
  detailType: string,
): ActionType20Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && !isInt64(detail.value)) throw new Error('詳細値が正しくありません。');
  return detail;
}

function addParameterDetail(
  target: Record<string, ParameterDetailValue>,
  key: string,
  detail: ActionType20Detail | undefined,
): void {
  if (!detail) return;
  if (!isInt64(detail.id)) throw new Error('詳細値IDが正しくありません。');
  target[key] = { id: detail.id, value: detail.value, unitsPerValue: 1 };
}

export function validateHandCardCountEffect(effect: Extract<Effect, { kind: 'hand-limit' }>): void {
  if (
    !Number.isSafeInteger(effect.amount) ||
    !Number.isSafeInteger(effect.calculationType) ||
    !Number.isSafeInteger(effect.displayTimeType) ||
    !isInt64(effect.displayTime) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('手札枚数変更の設定が正しくありません。');
}
