import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  num: 'MENTAL_HEART_INDUCE_NUM',
  heartDisplayTimeType: 'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME_TYPE',
  heartDisplayTime: 'MENTAL_HEART_INDUCE_HEART_DISPLAY_TIME',
  displayTimeType: 'MENTAL_HEART_INDUCE_DISPLAY_TIME_TYPE',
  displayTime: 'MENTAL_HEART_INDUCE_DISPLAY_TIME',
  disabledType: 'MENTAL_HEART_INDUCE_DISABLED_TYPE',
  disabled: 'MENTAL_HEART_INDUCE_DISABLED',
} as const;

export function createMentalHeartInduceEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, detailType]) => [
      key,
      findDetail(input.details, detailType),
    ]),
  );
  const heartTimeType = int32(details.heartDisplayTimeType?.value ?? 1n);
  const heartTime = int32(details.heartDisplayTime?.value ?? 0n);
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  const disabledType = int32(details.disabledType?.value ?? 0n);
  if (disabledType !== 0 && disabledType !== 1)
    throw new Error('精神力連動ハート生成の解除種別が正しくありません。');
  return {
    kind: 'mental-heart-induce',
    num: details.num?.value ?? 0n,
    heartDuration:
      heartTimeType === 1
        ? { kind: 'milliseconds', value: heartTime }
        : { kind: 'stage', value: 0 },
    duration: duration(displayTimeType, details.displayTime?.value ?? 0n),
    disabledType,
    disabledValue: details.disabled?.value ?? 0n,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function duration(
  type: number,
  value: bigint,
): Extract<Effect, { kind: 'mental-heart-induce' }>['duration'] {
  if (type === 1) return { kind: 'milliseconds', value };
  if (type === 2) return { kind: 'sections', value };
  if (type === 3) return { kind: 'stage', value };
  throw new Error('精神力連動ハート生成の期限種別が正しくありません。');
}

function findDetail(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (!detail) return undefined;
  if (!isInt64(detail.id) || !isInt64(detail.value)) throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
