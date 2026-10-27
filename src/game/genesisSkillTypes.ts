import { isInt64 } from './numeric.ts';

export type GenesisSkillEffect = Readonly<{
  kind: 'genesis-skill';
  effectBaseNum: bigint;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
}>;

export function validateGenesisSkill(effect: GenesisSkillEffect): void {
  if (
    !isInt64(effect.effectBaseNum) ||
    !['milliseconds', 'sections', 'stage'].includes(effect.duration.kind) ||
    !isInt64(effect.duration.value)
  )
    throw new Error('ジェネシススキルの設定が正しくありません。');
}
