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
  gauge: 'INFINITY_GAUGE_TYPE',
  displayTimeType: 'INFINITY_GAUGE_DISPLAY_TIME_TYPE',
  displayTime: 'INFINITY_GAUGE_DISPLAY_TIME',
} as const;

export function createInfinityGaugeEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const gaugeType = int32(detail(input.details, detailTypes.gauge)?.value ?? 1n);
  const gauge =
    gaugeType === 1 ? 'ap' : gaugeType === 2 ? 'voltage' : gaugeType === 3 ? 'mental' : null;
  if (gauge === null) throw new Error('無限ゲージの種別が正しくありません。');
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: int64ToFloat32(displayTime) }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0 }
          : null;
  if (duration === null) throw new Error('無限ゲージの期限種別が正しくありません。');
  return {
    kind: 'infinity-gauge',
    gauge,
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function detail(details: readonly Detail[], detailType: string): Detail | undefined {
  const item = details.find((value) => value.detailType === detailType);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
