import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  actionType: 905 | 906;
  skillEffectId: bigint;
  details: readonly Detail[];
  childEffects: readonly Effect[];
}>;

export function createUseInduceEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const targetDetailType =
    input.actionType === 905 ? 'USE_INDUCE_EFFECT_ID1' : 'USE_COUNT_INDUCE_EFFECT_ID1';
  const limitDetailType =
    input.actionType === 905 ? 'USE_INDUCE_LIMIT_NUM' : 'USE_COUNT_INDUCE_LIMIT_NUM';
  const targetEffectId = find(input.details, targetDetailType)?.id ?? null;
  const childEffects = childFor(input.childEffects, targetEffectId);
  const limit = find(input.details, limitDetailType)?.value ?? 0n;
  if (!isInt64(limit)) throw new Error('使用誘発の回数上限が正しくありません。');
  const shared = {
    sourceEffectId: input.skillEffectId.toString(),
    targetEffectId,
    limit,
    effects: childEffects,
  };
  if (input.actionType === 905) return { kind: 'use-induce', ...shared };
  const requireCount = find(input.details, 'USE_COUNT_INDUCE_REQUIRE_COUNT')?.value ?? 0n;
  if (!isInt64(requireCount)) throw new Error('使用回数誘発の条件数が正しくありません。');
  return { kind: 'use-count-induce', ...shared, requireCount };
}

function childFor(effects: readonly Effect[], targetEffectId: bigint | null): readonly Effect[] {
  if (targetEffectId === null || targetEffectId === 0n) return [];
  const children = effects.filter((effect) => effect.skillEffectId === targetEffectId);
  if (children.length !== 1) throw new Error('使用誘発の子効果が正しくありません。');
  return children;
}

function find(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}
