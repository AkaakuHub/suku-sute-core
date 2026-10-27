import type { MoodBonus } from './modelTypes.ts';

export type AddVoltageSkillEffect = Readonly<{
  kind: 'add-voltage-skill';
  amount: number;
  numberType: number;
  moodBonus?: MoodBonus;
}>;

export function validateAddVoltageSkillEffect(effect: AddVoltageSkillEffect): void {
  if (!Number.isSafeInteger(effect.amount) || !Number.isSafeInteger(effect.numberType))
    throw new Error('熱気加算スキルの設定が正しくありません。');
}
