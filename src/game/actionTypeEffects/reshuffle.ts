import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

export function createReshuffleEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  return {
    kind: 'reshuffle-skill',
    recoveryType: value(input.details, 'RESHUFFLE_RECOVERY_TYPE') ?? 0n,
    stashType: value(input.details, 'RESHUFFLE_STASH_TYPE') ?? 0n,
    skillEffectId: input.skillEffectId,
  };
}

function value(details: readonly Detail[], type: string): bigint | undefined {
  const detail = details.find((item) => item.detailType === type);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail?.value;
}
