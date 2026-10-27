import type { HandInducer, HandUseTrigger } from '../cards/handInducer.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  effects: HandInducer['effects'];
}>;

export function createHandInducer(input: Input): HandInducer {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const conditionType = int32(find(input.details, 'HAND_INDUCE_TYPE')?.value ?? 2n);
  const conditionValue = int32(find(input.details, 'HAND_INDUCE_TYPE_VALUE')?.value ?? 0n);
  const limit = find(input.details, 'HAND_INDUCE_LIMIT_NUM')?.value ?? 0n;
  const memoryType = int32(find(input.details, 'HAND_INDUCE_LIMIT_MEMOLY_TYPE')?.value ?? 1n);
  if (memoryType !== 1 && memoryType !== 2)
    throw new Error('手札誘発の回数記憶設定が正しくありません。');
  return {
    sourceEffectId: input.skillEffectId.toString(),
    trigger: triggerFor(conditionType, conditionValue),
    effects: input.effects,
    limit,
    limitMemory: memoryType === 2 ? 'retain' : 'reset',
  };
}

function triggerFor(type: number, value: number): HandUseTrigger {
  switch (type) {
    case 1:
      return { kind: 'member', member: BigInt(value) };
    case 2:
      return { kind: 'skill-icon', icon: BigInt(value) };
    case 3:
      return { kind: 'voltage-increase' };
    case 4:
      return { kind: 'section-change' };
    case 5:
      return { kind: 'heart-quantity-count', count: BigInt(value) };
    case 6:
      return { kind: 'same-card' };
    case 7:
      return { kind: 'unit', unit: BigInt(value) };
    case 8:
      return { kind: 'any-skill' };
    default:
      throw new Error('手札誘発条件が正しくありません。');
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
