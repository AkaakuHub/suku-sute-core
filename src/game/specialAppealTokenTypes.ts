import type { Card, MemberId } from './model.ts';

export type SpecialAppealTokenCardSet = Readonly<{
  id: number;
  tokenSetId: number;
  resourceId: number;
  targetParameter: MemberId;
  orderId: number;
  skillSeriesId: number;
  cardsBySkillLevel: readonly Readonly<{ skillLevel: number; card: Card }>[];
}>;

export type AddSpecialAppealTokenEffect = Readonly<{
  kind: 'special-appeal-token';
  tokenSetId: number;
  coolTime: number;
  targetType: number;
  levelType: number;
  musicGenerationsId: number;
  sourceSkillLevel: number;
  sourceSpecialAppealSkillLevel: number;
  memberOrder: readonly MemberId[];
  tokenCardSets: readonly SpecialAppealTokenCardSet[];
}>;

export type SpecialAppealToken = Readonly<{
  recordId: number;
  tokenSetId: number;
  targetMember: MemberId;
  card: Card;
  coolTime: number;
  remainingCoolTime: number;
}>;

export function validateSpecialAppealTokenEffect(effect: AddSpecialAppealTokenEffect): void {
  if (
    !Number.isSafeInteger(effect.tokenSetId) ||
    !Number.isSafeInteger(effect.coolTime) ||
    !Number.isSafeInteger(effect.targetType) ||
    !Number.isSafeInteger(effect.levelType) ||
    !Number.isSafeInteger(effect.musicGenerationsId) ||
    !Number.isSafeInteger(effect.sourceSkillLevel) ||
    !Number.isSafeInteger(effect.sourceSpecialAppealSkillLevel) ||
    effect.memberOrder.some((member) => !Number.isSafeInteger(member))
  )
    throw new Error('特別アピールトークンの設定が正しくありません。');

  for (const tokenCardSet of effect.tokenCardSets) {
    if (
      !Number.isSafeInteger(tokenCardSet.id) ||
      !Number.isSafeInteger(tokenCardSet.tokenSetId) ||
      !Number.isSafeInteger(tokenCardSet.resourceId) ||
      !Number.isSafeInteger(tokenCardSet.targetParameter) ||
      !Number.isSafeInteger(tokenCardSet.orderId) ||
      !Number.isSafeInteger(tokenCardSet.skillSeriesId) ||
      tokenCardSet.cardsBySkillLevel.some(
        ({ skillLevel, card }) =>
          !Number.isSafeInteger(skillLevel) ||
          skillLevel < 1 ||
          !card.special ||
          card.charactersId !== 0,
      )
    )
      throw new Error('特別アピールトークンのマスター記録が正しくありません。');
  }
}
