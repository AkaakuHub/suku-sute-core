import type { DisableMentalDownEffect } from '../disableMentalDownTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

export function createDisableMentalDownEffect(input: Input): DisableMentalDownEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const type = detail(input.details, 'DISABLE_MENTAL_DOWN_DISPLAY_TIME_TYPE')?.value ?? 1n;
  const value = detail(input.details, 'DISABLE_MENTAL_DOWN_DISPLAY_TIME')?.value ?? 0n;
  const displayType = Number(BigInt.asIntN(32, type));
  const duration =
    displayType === 1
      ? { kind: 'milliseconds' as const, value }
      : displayType === 2
        ? { kind: 'sections' as const, value }
        : displayType === 3
          ? { kind: 'stage' as const, value }
          : null;
  if (!duration) throw new Error('休憩回避効果の期限種別が正しくありません。');
  return {
    kind: 'disable-mental-down',
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function detail(details: readonly Detail[], detailType: string): Detail | undefined {
  const item = details.find((detail) => detail.detailType === detailType);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item;
}
