import type { MoodBonus } from './modelTypes.ts';

export type SkillScoreUpEffect = Readonly<{
  kind: 'skill-score-up';
  calculation: number;
  amount: number;
  moodBonus?: MoodBonus;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'full-end'; value: number }>;
  disabledType: number;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateSkillScoreUpEffect(effect: SkillScoreUpEffect): void {
  if (
    !Number.isSafeInteger(effect.calculation) ||
    !Number.isFinite(effect.amount) ||
    (effect.moodBonus !== undefined &&
      (!Number.isFinite(effect.moodBonus.perPoint) ||
        ![1, 2, 3].includes(effect.moodBonus.target))) ||
    !['milliseconds', 'sections', 'full-end'].includes(effect.duration.kind) ||
    !Number.isSafeInteger(effect.duration.value) ||
    (effect.duration.kind === 'sections' && effect.duration.value === 0) ||
    !Number.isSafeInteger(effect.disabledType) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('STAR上昇スキルの設定が正しくありません。');
}
