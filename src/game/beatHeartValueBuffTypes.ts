export type BeatHeartValueBuffEffect = Readonly<{
  kind: 'beat-heart-value-buff';
  calculation: 'add' | 'multiply' | 'fixed';
  amount: bigint;
  addValue?: number;
  multiplier?: number;
  moodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number; perPointLong?: bigint }>;
  duration?: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateBeatHeartValueBuff(effect: BeatHeartValueBuffEffect): void {
  if (
    !['add', 'multiply', 'fixed'].includes(effect.calculation) ||
    !isInt64(effect.amount) ||
    (effect.addValue !== undefined && !Number.isFinite(effect.addValue)) ||
    (effect.multiplier !== undefined && !Number.isFinite(effect.multiplier)) ||
    (effect.moodBonus !== undefined &&
      (!Number.isFinite(effect.moodBonus.perPoint) ||
        (effect.moodBonus.perPointLong !== undefined &&
          !isInt64(effect.moodBonus.perPointLong)))) ||
    (effect.duration !== undefined &&
      (!['milliseconds', 'sections', 'stage'].includes(effect.duration.kind) ||
        !isInt64(effect.duration.value) ||
        effect.duration.value < (effect.duration.kind === 'sections' ? 1n : 0n))) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('ビートハート値変更の設定が正しくありません。');
}

function isInt64(value: bigint): boolean {
  return value >= -(1n << 63n) && value < 1n << 63n;
}
