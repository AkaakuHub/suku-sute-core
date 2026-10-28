import type { Effect, HeartBoostTarget } from '../modelTypes.ts';
import type { MemberId, UnitId } from '../model.ts';
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

export function createHeartUpEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  if (int32(detail(input.details, 'HEART_UP_CALC_TYPE')?.value ?? 1n) !== 1)
    throw new Error('きらめき増幅の計算種別が正しくありません。');
  const mood = detail(input.details, 'HEART_UP_NUM_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('きらめき増幅の空模様対象が正しくありません。');
  const displayType = int32(detail(input.details, 'HEART_UP_DISPLAY_TIME_TYPE')?.value ?? 1n);
  const displayTime = int32(detail(input.details, 'HEART_UP_DISPLAY_TIME')?.value ?? 0n);
  const duration =
    displayType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayType === 3
          ? { kind: 'stage' as const }
          : null;
  if (!duration) throw new Error('きらめき増幅の期限種別が正しくありません。');
  if (duration.kind === 'sections' && duration.value === 0)
    throw new Error('きらめき増幅のパート期限は0にできません。');
  const target = targetFor(
    int32(detail(input.details, 'HEART_UP_TARGET_TYPE')?.value ?? 0n),
    int32(detail(input.details, 'HEART_UP_TARGET_ID')?.value ?? 0n),
  );
  const disabledType = int32(detail(input.details, 'HEART_UP_DISABLED_TYPE')?.value ?? 0n);
  const disabledCount = detail(input.details, 'HEART_UP_DISABLED')?.value ?? 0n;
  return {
    kind: 'heart-boost',
    percent: Math.fround(
      int64ToFloat32(detail(input.details, 'HEART_UP_NUM_BASE')?.value ?? 0n) / 10_000,
    ),
    uses: disabledType === 1 ? disabledCount : null,
    target,
    duration,
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
    skillEffectId: input.skillEffectId,
  };
}

function targetFor(type: number, id: number): HeartBoostTarget {
  if (type === 0) return { kind: 'all' };
  if (type === 1) return { kind: 'member', member: memberId(id) };
  if (type === 2) return { kind: 'unit', unit: unitId(id) };
  if (type === 3) return { kind: 'card-series', seriesId: id };
  throw new Error('きらめき増幅の対象種別が正しくありません。');
}

function memberId(value: number): MemberId {
  if ([0, 1021, 1022, 1030, 1031, 1032, 1033, 1041, 1042, 1053].includes(value))
    return value as MemberId;
  throw new Error('きらめき増幅のメンバーIDが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('きらめき増幅のUnitIdが正しくありません。');
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
