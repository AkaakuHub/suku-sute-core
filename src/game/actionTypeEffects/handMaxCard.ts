import type { HandMaxCardEffect } from '../handMaxCardTypes.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
  invocationType?: 0x388 | 0x38b;
  deactivationKey?: string;
}>;

export function createHandMaxCardEffect(input: Input): HandMaxCardEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const timeType = int32(value(input, 'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE', 3n));
  const displayTime = value(input, 'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME', 0n);
  const duration =
    timeType === 0 || timeType === 3
      ? { kind: 'stage' as const }
      : timeType === 1
        ? { kind: 'milliseconds' as const, value: displayTime }
        : timeType === 2
          ? { kind: 'sections' as const, value: displayTime }
          : null;
  if (!duration) throw new Error('手札最大化の期限種別が正しくありません。');
  return {
    kind: 'hand-max-card',
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function value(input: Input, type: string, fallback: bigint): bigint {
  const detail = input.details.find((item) => item.detailType === type);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail?.value ?? fallback;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
