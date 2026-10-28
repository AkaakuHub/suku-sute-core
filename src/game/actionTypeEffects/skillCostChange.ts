import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

export function createSkillCostChangeEffect(input: Input): Effect {
  const conditionType = int32(find(input.details, 'CHANGE_AP_CONDITION_TYPE')?.value ?? 1n);
  if (conditionType < 1 || conditionType > 15)
    throw new Error('スキルコスト変更の条件種別が正しくありません。');
  const displayTimeType = int32(find(input.details, 'CHANGE_AP_DISPLAY_TIME_TYPE')?.value ?? 1n);
  const displayTime = find(input.details, 'CHANGE_AP_DISPLAY_TIME')?.value ?? 0n;
  return {
    kind: 'skill-cost-change',
    amount: numToValue(find(input.details, 'CHANGE_AP_NUM')?.value ?? 0n),
    maximum: numToValue(find(input.details, 'CHANGE_AP_MAX')?.value ?? 0n),
    minimum: numToValue(find(input.details, 'CHANGE_AP_MIN')?.value ?? 0n),
    conditionType: conditionType as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15,
    conditionId: int32(find(input.details, 'CHANGE_AP_CONDITION_ID')?.value ?? 0n),
    ...(displayTimeType === 2 ? { duration: { sections: int32(displayTime) } } : {}),
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function find(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function numToValue(value: bigint): number {
  return Math.fround(int64ToFloat32(value) / 10_000);
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
