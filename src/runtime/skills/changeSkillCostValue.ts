import type { LiveChangeApConditionType } from '../cards/deckActionTypes.ts';

export type LiveChangeSkillCostValue = Readonly<{
  amount: number;
  minimum: number;
  maximum: number;
  conditionType: LiveChangeApConditionType;
}>;

export function calculateLiveChangeSkillCostValue(
  effect: LiveChangeSkillCostValue,
  conditionValue: number,
): number {
  const amount = Math.fround(effect.amount);
  if (effect.conditionType === 1) return amount;
  const value = Math.fround(Math.fround(conditionValue) * amount);
  return Math.ceil(
    Math.max(Math.fround(effect.minimum), Math.min(Math.fround(effect.maximum), value)),
  );
}

export function liveSkillCostMoodValue(moodValue: number | null, conditionId: number): number {
  if (moodValue === null) throw new Error('Live ChangeSkillCost mood is unresolved');
  switch (conditionId) {
    case 0:
      return Math.abs(moodValue);
    case 1:
      return Math.max(moodValue, 0);
    case 2:
      return Math.max(-moodValue, 0);
    default:
      throw new Error('Live ChangeSkillCost mood condition ID is invalid');
  }
}
