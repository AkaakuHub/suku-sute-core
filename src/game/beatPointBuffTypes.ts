export type BeatPointBuff = Readonly<{
  value: number;
  remainingSections: number | null;
  deactivationKey: string | null;
}>;

export type BeatPointBuffEffect = Readonly<{
  kind: 'beat-point-buff';
  amount: number;
  moodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
  duration: Readonly<{ kind: 'sections'; value: number }> | Readonly<{ kind: 'stage' }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateBeatPointBuffEffect(effect: BeatPointBuffEffect): void {
  if (
    !Number.isFinite(effect.amount) ||
    (effect.moodBonus !== undefined &&
      (!Number.isFinite(effect.moodBonus.perPoint) ||
        ![1, 2, 3].includes(effect.moodBonus.target))) ||
    !['sections', 'stage'].includes(effect.duration.kind) ||
    (effect.duration.kind === 'sections' && !Number.isSafeInteger(effect.duration.value)) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('BeatPoint上昇スキルの設定が正しくありません。');
}
