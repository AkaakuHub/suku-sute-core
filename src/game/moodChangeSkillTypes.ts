export type MoodChangeSkillEffect = Readonly<{
  kind: 'mood-change-skill';
  calculationType: 1 | 2 | 3 | 4;
  num: bigint;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateMoodChangeSkillEffect(effect: MoodChangeSkillEffect): void {
  if (
    ![1, 2, 3, 4].includes(effect.calculationType) ||
    effect.num < -(1n << 63n) ||
    effect.num >= 1n << 63n ||
    !['milliseconds', 'sections', 'stage'].includes(effect.duration.kind) ||
    effect.duration.value < -(1n << 63n) ||
    effect.duration.value >= 1n << 63n ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0n) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('空模様変更スキルの設定が正しくありません。');
}
