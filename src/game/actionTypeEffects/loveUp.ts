import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood?: number;
  value: bigint;
}>;

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

export function createLoveUpEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calculation = int32(find(input.details, 'LOVE_UP_CALC_TYPE')?.value ?? 1n);
  const mood = find(input.details, 'LOVE_UP_NUM_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('STAR上昇の空模様対象が正しくありません。');
  const displayTimeType = int32(find(input.details, 'LOVE_DISPLAY_TIME_TYPE')?.value ?? 1n);
  const displayTime = int32(find(input.details, 'LOVE_DISPLAY_TIME')?.value ?? 10_000n);
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'full-end' as const, value: 0 }
          : null;
  if (!duration) throw new Error('STAR上昇の期限種別が正しくありません。');
  if (displayTimeType === 2 && displayTime === 0)
    throw new Error('STAR上昇のパート期限は0にできません。');
  const disabledType = int32(find(input.details, 'LOVE_UP_DISABLED_TYPE')?.value ?? 0n);
  return {
    kind: 'skill-score-up',
    calculation,
    amount: int64ToFloat32(find(input.details, 'LOVE_UP_NUM_BASE')?.value ?? 0n),
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
    duration,
    disabledType,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    skillEffectId: input.skillEffectId,
  };
}

function find(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
