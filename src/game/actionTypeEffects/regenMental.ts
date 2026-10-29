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

export function createMentalRegenerationEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const mood = detail(input.details, 'REGEN_MENTAL_NUM_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('元気継続回復の空模様対象が正しくありません。');
  const intervalType = int32(detail(input.details, 'REGEN_MENTAL_INTERVAL_TYPE')?.value ?? 1n);
  if (intervalType !== 1 && intervalType !== 2)
    throw new Error('元気継続回復の間隔種別が正しくありません。');
  const displayTimeType = int32(
    detail(input.details, 'REGEN_MENTAL_DISPLAY_TIME_TYPE')?.value ?? 1n,
  );
  const displayTime = detail(input.details, 'REGEN_MENTAL_DISPLAY_TIME')?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: int64ToFloat32(displayTime) }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: int32(displayTime) }
        : null;
  if (!duration) throw new Error('元気継続回復の期限種別が正しくありません。');
  const interval = detail(input.details, 'REGEN_MENTAL_INTERVAL_NUM')?.value ?? 0n;
  return {
    kind: 'gauge-regeneration',
    gauge: 'mental',
    calculationType: int32(detail(input.details, 'REGEN_MENTAL_TYPE')?.value ?? 1n),
    amount: Math.fround(
      int64ToFloat32(detail(input.details, 'REGEN_MENTAL_NUM_BASE')?.value ?? 0n) / 10_000,
    ),
    amountBasis: 'maximum-gauge',
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
    intervalType,
    intervalValue: int64ToFloat32(interval),
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    skillEffectId: input.skillEffectId,
  };
}

function detail(details: readonly Detail[], type: string): Detail | undefined {
  const found = details.find((item) => item.detailType === type);
  if (found && (!isInt64(found.id) || !isInt64(found.value)))
    throw new Error('詳細値が正しくありません。');
  return found;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
