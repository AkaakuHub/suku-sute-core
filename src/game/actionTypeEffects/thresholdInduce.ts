import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  actionType: 907 | 908;
  skillEffectId: bigint;
  details: readonly Detail[];
  childEffects: readonly Effect[];
  deactivationKey?: string;
}>;

export function createThresholdInduceEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const childDetailType =
    input.actionType === 907 ? 'EFFECT_INDUCE_EFFECT_ID1' : 'EFFECT_INDUCE_ACTION';
  const childId = find(input.details, childDetailType)?.id ?? null;
  const effects = childFor(input.childEffects, childId);
  const sourceEffectId = input.skillEffectId.toString();
  if (input.actionType === 908) {
    const timing = int32(find(input.details, 'EFFECT_INDUCE_TIMING')?.value ?? 1n);
    if (timing !== 1) throw new Error('カード移動誘発の発動時点が正しくありません。');
    const limit = find(input.details, 'EFFECT_INDUCE_LIMIT_NUM')?.value ?? 0n;
    const requireCount = find(input.details, 'EFFECT_INDUCE_REQUIRE_NUM')?.value ?? 0n;
    if (!isInt64(limit) || !isInt64(requireCount))
      throw new Error('カード移動誘発の回数設定が正しくありません。');
    return {
      kind: 'card-move-induce',
      sourceEffectId,
      targetEffectId: childId,
      timing: 'stage-to-graveyard',
      limit,
      requireCount,
      effects,
    };
  }
  const targetType = int32(find(input.details, 'EFFECT_INDUCE_TARGET_EFFECT')?.value ?? 1n);
  const thresholdType = int32(find(input.details, 'EFFECT_INDUCE_THRESHOLD_TYPE')?.value ?? 0n);
  const thresholdValue = int32(find(input.details, 'EFFECT_INDUCE_THRESHOLD_NUM')?.value ?? 0n);
  const target = targetFor(targetType);
  const threshold = thresholdFor(thresholdType, BigInt(thresholdValue));
  if (effects.length === 0) throw new Error('効果誘発の子効果がありません。');
  return {
    kind: 'effect-induce',
    sourceEffectId,
    target,
    threshold,
    effects,
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function childFor(effects: readonly Effect[], targetEffectId: bigint | null): readonly Effect[] {
  if (targetEffectId === null || targetEffectId === 0n) return [];
  const children = effects.filter((effect) => effect.skillEffectId === targetEffectId);
  if (children.length !== 1) throw new Error('誘発の子効果が正しくありません。');
  return children;
}

function targetFor(value: number): 'mental-barrier' | 'bonus-score' {
  if (value === 1) return 'mental-barrier';
  if (value === 2) return 'bonus-score';
  throw new Error('効果誘発の対象が正しくありません。');
}

function thresholdFor(
  type: number,
  value: bigint,
): Extract<Effect, { kind: 'effect-induce' }>['threshold'] {
  switch (type) {
    case 0:
      return { kind: 'none', value };
    case 1:
      return { kind: 'at-least', value };
    case 2:
      return { kind: 'at-most', value };
    default:
      throw new Error('効果誘発のしきい値種別が正しくありません。');
  }
}

function find(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
