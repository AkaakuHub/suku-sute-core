import type { MoodBonus } from './modelTypes.ts';

export type MentalShieldEffect = Readonly<{
  kind: 'mental-shield';
  durabilityType: bigint;
  durability: bigint;
  moodBonus?: MoodBonus & Readonly<{ perPointLong?: bigint }>;
  duration:
    | Readonly<{ kind: 'milliseconds' | 'sections'; value: bigint }>
    | Readonly<{ kind: 'stage' }>;
  applyCount: bigint;
}>;

export type MentalShield = Readonly<{
  durabilityType: number;
  durability: number;
  applyCount: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
}>;

export function validateMentalShieldEffect(effect: MentalShieldEffect): void {
  const isInt64 = (value: bigint) => value >= -(1n << 63n) && value < 1n << 63n;
  if (
    !isInt64(effect.durabilityType) ||
    !isInt64(effect.durability) ||
    !isInt64(effect.applyCount) ||
    (effect.duration.kind !== 'stage' && !isInt64(effect.duration.value)) ||
    (effect.moodBonus !== undefined &&
      (!Number.isFinite(effect.moodBonus.perPoint) ||
        (effect.moodBonus.perPointLong !== undefined && !isInt64(effect.moodBonus.perPointLong)) ||
        ![0, 1, 2, 3].includes(effect.moodBonus.target)))
  )
    throw new Error('元気シールドの設定が正しくありません。');
}
