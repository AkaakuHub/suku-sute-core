import type { Card } from './model.ts';
import { validateSkillHeartsEffect, type SkillHeartsEffect } from './skillHeartTypes.ts';
import { isInt64 } from '../runtime/numeric.ts';

export type AdditionalHeartInduceCondition =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; member: bigint }>
  | Readonly<{ kind: 'main-effect'; actionType: bigint }>
  | Readonly<{ kind: 'unit'; unit: number }>;

export type AdditionalHeartInduceEffect = Readonly<{
  kind: 'additional-heart-induce';
  condition: AdditionalHeartInduceCondition;
  apPower: bigint;
  heartEffect: SkillHeartsEffect;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: bigint }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

export type AdditionalHeartInducer = Readonly<{
  id: number;
  sourceCardId: string;
  condition: AdditionalHeartInduceCondition;
  apPower: bigint;
  heartEffect: SkillHeartsEffect;
  addValue: number;
  multiplier: number;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;

export function validateAdditionalHeartInduceEffect(effect: AdditionalHeartInduceEffect): void {
  validateSkillHeartsEffect(effect.heartEffect);
  if (
    !isInt64(effect.apPower) ||
    !['all', 'member', 'main-effect', 'unit'].includes(effect.condition.kind) ||
    (effect.condition.kind === 'member' && !isInt64(effect.condition.member)) ||
    (effect.condition.kind === 'main-effect' && !isInt64(effect.condition.actionType)) ||
    (effect.condition.kind === 'unit' &&
      (!Number.isInteger(effect.condition.unit) ||
        effect.condition.unit < -2_147_483_648 ||
        effect.condition.unit > 2_147_483_647)) ||
    !['milliseconds', 'sections', 'stage'].includes(effect.duration.kind) ||
    !isInt64(effect.duration.value) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('追加きらめき誘発の設定が正しくありません。');
}

export function matchesAdditionalHeartCondition(
  condition: AdditionalHeartInduceCondition,
  card: Card,
): boolean {
  switch (condition.kind) {
    case 'all':
      return true;
    case 'member':
      return BigInt(card.charactersId) === condition.member;
    case 'main-effect':
      return card.mainEffect !== undefined && BigInt(card.mainEffect) === condition.actionType;
    case 'unit':
      return card.unitIds.includes(condition.unit);
  }
}
