import { floatToInt32 } from '../numeric.ts';

type LiveAllHandSkillCostCard = Readonly<
  { kind: 'source'; baseCost: number } | { kind: 'other'; skillCost: number }
>;

export function calculateLiveAllHandSkillCost(
  cards: readonly LiveAllHandSkillCostCard[],
  addAp: number,
  applySourceBuff: (total: number) => number,
): number {
  const total = cards.reduce((sum, card) => {
    const cost = card.kind === 'source' ? toInt32(card.baseCost) + (addAp | 0) : card.skillCost;
    return (sum + cost) | 0;
  }, 0);
  return Math.max(1, toInt32(applySourceBuff(total)));
}

function toInt32(value: number): number {
  return value === Number.POSITIVE_INFINITY ? -2_147_483_648 : floatToInt32(value);
}

export function resolveLiveUseAllHandCardInstanceIds(
  handCardInstanceIds: readonly number[],
  sourceCardInstanceId: number,
): readonly number[] {
  validateCardInstanceIds(handCardInstanceIds, sourceCardInstanceId);
  return handCardInstanceIds.filter((cardInstanceId) => cardInstanceId !== sourceCardInstanceId);
}

function validateCardInstanceIds(
  handCardInstanceIds: readonly number[],
  sourceCardInstanceId: number,
): void {
  if (
    !Number.isSafeInteger(sourceCardInstanceId) ||
    sourceCardInstanceId < 1 ||
    new Set(handCardInstanceIds).size !== handCardInstanceIds.length ||
    handCardInstanceIds.some(
      (cardInstanceId) => !Number.isSafeInteger(cardInstanceId) || cardInstanceId < 1,
    )
  ) {
    throw new Error('Live all-hand card instance IDs are invalid');
  }
}
