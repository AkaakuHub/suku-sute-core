import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

const detailTypes = {
  num: 'CHANGE_DECK_AP_NUM',
  targetRange: 'CHANGE_DECK_AP_TARGET_RANGE',
  targetType: 'CHANGE_DECK_AP_TARGET_TYPE',
  targetId: 'CHANGE_DECK_AP_TARGET_TYPE_ID',
} as const;

export function createDeckSkillCostChangeEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const num = int32(detail(input.details, detailTypes.num)?.value ?? 0n);
  const targetRange = int32(detail(input.details, detailTypes.targetRange)?.value ?? 1n);
  if (targetRange !== 1 && targetRange !== 2 && targetRange !== 3)
    throw new Error('デッキカード対象範囲が正しくありません。');
  const targetType = int32(detail(input.details, detailTypes.targetType)?.value ?? 1n);
  const targetId = int32(detail(input.details, detailTypes.targetId)?.value ?? 0n);
  const target = targets[targetType];
  if (!target) throw new Error('デッキカード対象が正しくありません。');
  return { kind: 'deck-skill-cost-change', num, targetRange, target, targetId };
}

const targets: Readonly<
  Record<number, 'all' | 'member' | 'main-effect' | 'unit' | 'token-series'>
> = {
  1: 'all',
  2: 'member',
  3: 'main-effect',
  4: 'unit',
  5: 'token-series',
};

function detail(details: readonly Detail[], detailType: string): Detail | undefined {
  const found = details.find((item) => item.detailType === detailType);
  if (found && (!isInt64(found.id) || !isInt64(found.value)))
    throw new Error('詳細値が正しくありません。');
  return found;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
