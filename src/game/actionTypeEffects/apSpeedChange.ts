import type { Effect, ParameterDetailValue } from '../modelTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type ActionType21Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood: number;
  value: bigint;
}>;

type ActionType21Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionType21Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculationType: 'CHANGE_AP_INCREASE_SPEED_CALC_TYPE',
  num: 'CHANGE_AP_INCREASE_SPEED_NUM',
  bonusMoodValue: 'CHANGE_AP_INCREASE_SPEED_NUM_BONUS_MOOD',
  displayTimeType: 'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME_TYPE',
  displayTime: 'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME',
} as const;

export function createApSpeedChangeEffect(input: ActionType21Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calculationTypeDetail = findDetail(input.details, detailTypes.calculationType);
  const numDetail = findDetail(input.details, detailTypes.num);
  const bonusMoodDetail = findDetail(input.details, detailTypes.bonusMoodValue);
  const displayTimeTypeDetail = findDetail(input.details, detailTypes.displayTimeType);
  const displayTimeDetail = findDetail(input.details, detailTypes.displayTime);
  const calculationTypeValue = int32(calculationTypeDetail?.value ?? 1n);
  if (calculationTypeValue !== 1 && calculationTypeValue !== 2)
    throw new Error('AP回復速度変更の計算種別が正しくありません。');
  const calculationType: 1 | 2 = calculationTypeValue;
  const bonusMoodTarget = bonusMoodDetail?.targetMood ?? 0;
  if (!Number.isSafeInteger(bonusMoodTarget) || bonusMoodTarget < 0 || bonusMoodTarget > 3)
    throw new Error('空模様の補正対象が正しくありません。');

  const parameterDetails: Record<string, ParameterDetailValue> = {};
  addParameterDetail(parameterDetails, 'calculationType', calculationTypeDetail);
  addParameterDetail(parameterDetails, 'num', numDetail);
  addParameterDetail(parameterDetails, 'bonusMoodValue', bonusMoodDetail);
  addParameterDetail(parameterDetails, 'displayTimeType', displayTimeTypeDetail);
  addParameterDetail(parameterDetails, 'displayTime', displayTimeDetail);
  const effect = {
    kind: 'ap-speed-change' as const,
    calculationType,
    num: numDetail?.value ?? 0n,
    bonusMoodTarget: bonusMoodTarget as 0 | 1 | 2 | 3,
    bonusMoodValue: bonusMoodDetail?.value ?? 0n,
    displayTimeType: displayTimeTypeDetail?.value ?? 3n,
    displayTime: displayTimeDetail?.value ?? 0n,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    parameterDetails,
    skillEffectId: input.skillEffectId,
  };
  return effect;
}

function findDetail(
  details: readonly ActionType21Detail[],
  detailType: string,
): ActionType21Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && !isInt64(detail.value)) throw new Error('詳細値が正しくありません。');
  return detail;
}

function addParameterDetail(
  target: Record<string, ParameterDetailValue>,
  key: string,
  detail: ActionType21Detail | undefined,
): void {
  if (!detail) return;
  if (!isInt64(detail.id)) throw new Error('詳細値IDが正しくありません。');
  target[key] = { id: detail.id, value: detail.value, unitsPerValue: 1 };
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}

export function validateApSpeedChangeEffect(
  effect: Extract<Effect, { kind: 'ap-speed-change' }>,
): void {
  if (
    ![1, 2].includes(effect.calculationType) ||
    ![0, 1, 2, 3].includes(effect.bonusMoodTarget) ||
    !isInt64(effect.num) ||
    !isInt64(effect.bonusMoodValue) ||
    !isInt64(effect.displayTimeType) ||
    !isInt64(effect.displayTime) ||
    (effect.displayTimeType === 2n && effect.displayTime === 0n) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('AP回復速度変更の設定が正しくありません。');
}
