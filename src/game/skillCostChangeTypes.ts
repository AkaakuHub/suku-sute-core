export type SkillCostConditionType =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type DeckSkillCostChangeEffect = Readonly<{
  kind: 'deck-skill-cost-change';
  num: number;
  targetRange: 1 | 2 | 3;
  target: 'all' | 'member' | 'main-effect' | 'unit' | 'token-series';
  targetId: number;
}>;

export function validateDeckSkillCostChange(effect: DeckSkillCostChangeEffect): undefined {
  if (
    !Number.isSafeInteger(effect.num) ||
    ![1, 2, 3].includes(effect.targetRange) ||
    !['all', 'member', 'main-effect', 'unit', 'token-series'].includes(effect.target) ||
    !Number.isSafeInteger(effect.targetId)
  )
    throw new Error('デッキカードのスキルコスト変更設定が正しくありません。');
  return undefined;
}

export type SkillCostChangeEffect = Readonly<{
  kind: 'skill-cost-change';
  amount: number;
  minimum: number;
  maximum: number;
  conditionType: SkillCostConditionType;
  conditionId?: number;
  addValue?: number;
  duration?: Readonly<{ sections: number }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateSkillCostChangeEffect(effect: SkillCostChangeEffect): void {
  if (
    !Number.isFinite(effect.amount) ||
    !Number.isFinite(effect.minimum) ||
    !Number.isFinite(effect.maximum) ||
    ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(effect.conditionType) ||
    (effect.conditionId !== undefined && !Number.isSafeInteger(effect.conditionId)) ||
    (effect.addValue !== undefined && !Number.isFinite(effect.addValue)) ||
    (effect.duration !== undefined &&
      (!Number.isSafeInteger(effect.duration.sections) || effect.duration.sections < 0)) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('スキルコスト変更の設定が正しくありません。');
}
