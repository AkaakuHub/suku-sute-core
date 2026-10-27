import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{ details: readonly Detail[]; childEffects: readonly Effect[] }>;

export function resolveHandPermanentEffects(input: Input): readonly Effect[] {
  const detail = input.details.find((item) => item.detailType === 'HAND_PERMANENT_EFFECT_ID1');
  if (!detail) return [];
  if (!isInt64(detail.id) || !isInt64(detail.value)) throw new Error('詳細値が正しくありません。');
  if (detail.id === 0n) return [];
  const effects = input.childEffects.filter((effect) => effect.skillEffectId === detail.id);
  if (effects.length !== 1) throw new Error('手札永続効果の子効果が正しくありません。');
  return effects;
}
