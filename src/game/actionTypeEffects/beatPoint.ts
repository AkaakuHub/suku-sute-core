import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

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

export function createBeatPointEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const mood = detail(input.details, 'BP_UP_NUM_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('BeatPoint上昇の空模様対象が正しくありません。');
  const displayTimeType = int32(detail(input.details, 'BP_UP_DISPLAY_TIME_TYPE')?.value ?? 1n);
  const displayTime = int32(detail(input.details, 'BP_UP_DISPLAY_TIME')?.value ?? 0n);
  const duration =
    displayTimeType === 2
      ? { kind: 'sections' as const, value: displayTime }
      : { kind: 'stage' as const };
  if (duration.kind === 'sections' && duration.value === 0)
    throw new Error('BeatPoint上昇のパート期限は0にできません。');
  return {
    kind: 'beat-point-buff',
    amount: int64ToFloat32(detail(input.details, 'BP_UP_NUM_BASE')?.value ?? 0n),
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
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
