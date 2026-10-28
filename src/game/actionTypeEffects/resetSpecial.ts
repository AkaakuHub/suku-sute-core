import type { Effect } from '../model.ts';
import type { MemberId, UnitId } from '../model.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
}>;

export function createResetSpecialEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const effectType = int32(value(input, 'RESET_SPECIAL_APPEAL_COUNT_EFFECT_TYPE', 1n));
  const scope =
    effectType === 1 ? 'normal' : effectType === 2 ? 'extra' : effectType === 3 ? 'all' : null;
  if (scope === null) throw new Error('必殺技回数リセットの効果対象が正しくありません。');
  const targetType = int32(value(input, 'RESET_SPECIAL_APPEAL_COUNT_TARGET_TYPE', 1n));
  const targetId = int32(value(input, 'RESET_SPECIAL_APPEAL_COUNT_TARGET_ID', 0n));
  const target =
    targetType === 1
      ? { kind: 'all' as const }
      : targetType === 2
        ? { kind: 'member' as const, member: memberId(targetId) }
        : targetType === 3
          ? { kind: 'unit' as const, unit: unitId(targetId) }
          : targetType === 4
            ? { kind: 'source' as const }
            : targetType === 5
              ? { kind: 'others' as const }
              : null;
  if (target === null) throw new Error('必殺技回数リセットの対象種別が正しくありません。');
  return { kind: 'reset-special', scope, target };
}

function memberId(value: number): MemberId {
  if ([0, 1021, 1022, 1030, 1031, 1032, 1033, 1041, 1042, 1053].includes(value))
    return value as MemberId;
  throw new Error('必殺技回数リセットのメンバーが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('必殺技回数リセットのユニットが正しくありません。');
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
