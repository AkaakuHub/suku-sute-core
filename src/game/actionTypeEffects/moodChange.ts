import type { Effect } from '../model.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculation: 'CHANGE_MOOD_VALUE_CALC_TYPE',
  num: 'CHANGE_MOOD_VALUE_NUM',
  displayTimeType: 'CHANGE_MOOD_VALUE_DISPLAY_TIME_TYPE',
  displayTime: 'CHANGE_MOOD_VALUE_DISPLAY_TIME',
} as const;

export function createMoodChangeEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calculationType = int32(detail(input.details, detailTypes.calculation)?.value ?? 1n);
  if (![1, 2, 3, 4].includes(calculationType))
    throw new Error('空模様変更の計算種別が正しくありません。');
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0n }
          : null;
  if (duration === null) throw new Error('空模様変更の期限種別が正しくありません。');
  return {
    kind: 'mood-change-skill',
    calculationType: calculationType as 1 | 2 | 3 | 4,
    num: detail(input.details, detailTypes.num)?.value ?? 0n,
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function detail(details: readonly Detail[], type: string): Detail | undefined {
  const item = details.find((value) => value.detailType === type);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
