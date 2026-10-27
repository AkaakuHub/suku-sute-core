import type { Effect } from '../model.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  displayTimeType: 'STOP_VOLTAGE_INCREASE_DISPLAY_TIME_TYPE',
  displayTime: 'STOP_VOLTAGE_INCREASE_DISPLAY_TIME',
} as const;

export function createStopVoltageIncreaseEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const displayTimeType = int32(
    findDetail(input.details, detailTypes.displayTimeType)?.value ?? 1n,
  );
  const displayTime = findDetail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: int64ToFloat32(displayTime) }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : { kind: 'milliseconds' as const, value: 0 };
  return {
    kind: 'stop-voltage-increase',
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    skillEffectId: input.skillEffectId,
  };
}

function findDetail(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
