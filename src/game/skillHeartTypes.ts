import type { MoodBonus } from './modelTypes.ts';

export type SkillHeartsEffect = Readonly<{
  kind: 'skill-hearts';
  skillEffectId: bigint;
  calculation: 'fixed' | 'ratio';
  amount: number;
  moodBonus?: MoodBonus;
  displayTime: Readonly<{ kind: 'milliseconds' | 'sections' | 'full-end'; value: number }>;
}>;

export function validateSkillHeartsEffect(effect: SkillHeartsEffect): void {
  if (
    effect.skillEffectId < -(1n << 63n) ||
    effect.skillEffectId >= 1n << 63n ||
    !['fixed', 'ratio'].includes(effect.calculation) ||
    !Number.isSafeInteger(effect.amount) ||
    (effect.moodBonus !== undefined &&
      (!Number.isFinite(effect.moodBonus.perPoint) ||
        ![1, 2, 3].includes(effect.moodBonus.target))) ||
    !['milliseconds', 'sections', 'full-end'].includes(effect.displayTime.kind) ||
    !Number.isSafeInteger(effect.displayTime.value) ||
    (effect.displayTime.kind === 'sections' && effect.displayTime.value === 0)
  )
    throw new Error('きらめき生成スキルの設定が正しくありません。');
}
