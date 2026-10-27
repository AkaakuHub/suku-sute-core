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

export function createMentalBarrierEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const barrierType = int32(detail(input.details, 'MENTAL_BARRIER_TYPE')?.value ?? 1n);
  if (barrierType !== 1 && barrierType !== 2) throw new Error('元気バリア種別が正しくありません。');
  const enduranceType = int32(detail(input.details, 'MENTAL_BARRIER_ENDURANCE_TYPE')?.value ?? 1n);
  const endurance =
    enduranceType === 1
      ? 'ratio'
      : enduranceType === 2
        ? 'fixed'
        : enduranceType === 3
          ? 'infinite'
          : null;
  if (!endurance) throw new Error('元気バリア耐久値種別が正しくありません。');
  const enduranceMood = detail(input.details, 'MENTAL_BARRIER_ENDURANCE_BONUS_MOOD');
  const attenuationMood = detail(input.details, 'MENTAL_BARRIER_ATTENUATION_BONUS_MOOD');
  const enduranceTarget = enduranceMood?.targetMood ?? 0;
  const attenuationTarget = attenuationMood?.targetMood ?? 0;
  if (
    [enduranceTarget, attenuationTarget].some(
      (value) => !Number.isSafeInteger(value) || value < 0 || value > 3,
    )
  )
    throw new Error('元気バリアの空模様対象が正しくありません。');
  const displayType = int32(detail(input.details, 'MENTAL_BARRIER_DISPLAY_TIME_TYPE')?.value ?? 1n);
  const displayValue = detail(input.details, 'MENTAL_BARRIER_DISPLAY_TIME')?.value ?? 0n;
  const duration =
    input.invocationType === 0x388 || input.invocationType === 0x38b
      ? { kind: 'stage' as const }
      : displayType === 1
        ? { kind: 'milliseconds' as const, value: int64ToFloat32(displayValue) }
        : displayType === 2
          ? { kind: 'sections' as const, value: int32(displayValue) }
          : displayType === 3
            ? { kind: 'stage' as const }
            : null;
  if (!duration) throw new Error('元気バリアの期限種別が正しくありません。');
  if (duration.kind === 'sections' && duration.value === 0)
    throw new Error('元気バリアのパート期限は0にできません。');
  const baseEndurance = detail(input.details, 'MENTAL_BARRIER_ENDURANCE_NUM')?.value ?? 0n;
  const baseAttenuation = detail(input.details, 'MENTAL_BARRIER_ATTENUATION_NUM')?.value ?? 0n;
  const optionalMood = (target: number, mood: Detail | undefined) =>
    target > 0
      ? {
          target: target as 1 | 2 | 3,
          perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
        }
      : undefined;
  const enduranceMoodBonus = optionalMood(enduranceTarget, enduranceMood);
  const attenuationMoodBonus = optionalMood(attenuationTarget, attenuationMood);
  return {
    kind: 'mental-barrier',
    barrier: barrierType === 1 ? 'endurance' : 'attenuation',
    enduranceType: endurance,
    endurance: Math.fround(int64ToFloat32(baseEndurance) / 10_000),
    ...(enduranceMoodBonus ? { enduranceMoodBonus } : {}),
    attenuation: Math.fround(int64ToFloat32(baseAttenuation) / 10_000),
    ...(attenuationMoodBonus ? { attenuationMoodBonus } : {}),
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
