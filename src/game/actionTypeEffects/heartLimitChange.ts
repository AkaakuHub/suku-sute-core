import type { Effect, ParameterDetailValue } from '../modelTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood: number;
  value: bigint;
}>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculationType: 'CHANGE_HEART_LIMIT_CALC_TYPE',
  num: 'CHANGE_HEART_LIMIT_NUM',
  bonusMoodValue: 'CHANGE_HEART_LIMIT_NUM_BONUS_MOOD',
  displayTimeType: 'CHANGE_HEART_LIMIT_DISPLAY_TIME_TYPE',
  displayTime: 'CHANGE_HEART_LIMIT_DISPLAY_TIME',
} as const;

export function createHeartLimitChangeEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, detailType]) => [
      key,
      findDetail(input.details, detailType),
    ]),
  );
  const calculationType = int32(details.calculationType?.value ?? 1n);
  if (calculationType !== 1 && calculationType !== 2)
    throw new Error('きらめき上限変更の計算種別が正しくありません。');
  const bonusMoodTarget = details.bonusMoodValue?.targetMood ?? 0;
  if (!Number.isSafeInteger(bonusMoodTarget) || bonusMoodTarget < 0 || bonusMoodTarget > 3)
    throw new Error('きらめき上限変更の空模様補正対象が正しくありません。');
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  const duration = toDuration(displayTimeType, details.displayTime?.value ?? 0n);
  const parameterDetails: Record<string, ParameterDetailValue> = {};
  for (const [key, detail] of Object.entries(details)) {
    if (!detail) continue;
    if (!isInt64(detail.id)) throw new Error('詳細値IDが正しくありません。');
    parameterDetails[key] = { id: detail.id, value: detail.value, unitsPerValue: 1 };
  }
  return {
    kind: 'heart-limit-change',
    calculationType,
    num: details.num?.value ?? 0n,
    bonusMoodTarget: bonusMoodTarget as 0 | 1 | 2 | 3,
    bonusMoodValue: details.bonusMoodValue?.value ?? 0n,
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    parameterDetails,
    skillEffectId: input.skillEffectId,
  };
}

function findDetail(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function toDuration(
  type: number,
  value: bigint,
): Extract<Effect, { kind: 'heart-limit-change' }>['duration'] {
  if (type === 1) return { kind: 'milliseconds', value };
  if (type === 2) return { kind: 'sections', value };
  if (type === 3) return { kind: 'stage' };
  throw new Error('きらめき上限変更の期限種別が正しくありません。');
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
