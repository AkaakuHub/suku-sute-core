import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  whenTrue: readonly Effect[];
  whenFalse: readonly Effect[];
}>;

export function createDrawSuccessInduceEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const branchType = find(input.details, 'DRAW_SUCCESS_INDUCE_BRANCH_TYPE')?.value ?? 1n;
  const branchValue = find(input.details, 'DRAW_SUCCESS_INDUCE_BRANCH_VALUE')?.value ?? 0n;
  const disabled = input.details.find(
    (detail) => detail.detailType === 'DRAW_SUCCESS_INDUCE_DISABLED_TYPE',
  );
  if (disabled && (!isInt64(disabled.id) || !isInt64(disabled.value)))
    throw new Error('詳細値が正しくありません。');
  return {
    kind: 'draw-success-induce',
    sourceEffectId: input.skillEffectId.toString(),
    branchType,
    branchValue,
    ...(disabled ? { disabledType: disabled.value } : {}),
    whenTrue: input.whenTrue,
    whenFalse: input.whenFalse,
  };
}

function find(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}
