import type { Effect } from '../model.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
}>;

export function createUseAllHandEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const detail = input.details.find((item) => item.detailType === 'USE_ALL_HAND_SKILL_ADD_AP');
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return { kind: 'use-hand', addAp: Number(BigInt.asIntN(32, detail?.value ?? 0n)) };
}
