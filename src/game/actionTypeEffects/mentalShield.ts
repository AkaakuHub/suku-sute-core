import type { MentalShieldEffect } from '../mentalShieldTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; targetMood: number; value: bigint }>;
type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

const detailTypes = {
  durabilityType: 'MENTAL_SHIELD_DURABILITY_TYPE',
  durability: 'MENTAL_SHIELD_DURABILITY',
  moodModifier: 'MENTAL_SHIELD_DURABILITY_MOOD_MODIFYER',
  displayTimeType: 'MENTAL_SHIELD_DISPLAY_TIME_TYPE',
  displayTime: 'MENTAL_SHIELD_DISPLAY_TIME',
  applyCount: 'MENTAL_SHIELD_APPLY_COUNT',
} as const;

export function createMentalShieldEffect(input: Input): MentalShieldEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const mood = detail(input.details, detailTypes.moodModifier);
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('元気シールドの空模様対象が正しくありません。');
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const }
          : null;
  if (!duration) throw new Error('元気シールドの期限種別が正しくありません。');
  return {
    kind: 'mental-shield',
    durabilityType: detail(input.details, detailTypes.durabilityType)?.value ?? 1n,
    durability: detail(input.details, detailTypes.durability)?.value ?? 0n,
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: 0,
            perPointLong: mood?.value ?? 0n,
          },
        }
      : {}),
    duration,
    applyCount: detail(input.details, detailTypes.applyCount)?.value ?? 0n,
  };
}

function detail(details: readonly Detail[], type: string): Detail | undefined {
  const item = details.find((value) => value.detailType === type);
  if (item && (!isInt64(item.id) || !isInt64(item.value) || !Number.isSafeInteger(item.targetMood)))
    throw new Error('詳細値が正しくありません。');
  return item;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
