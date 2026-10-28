import type { DrawProbabilityRule } from '../cards/drawProbability.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{ details: readonly Detail[] }>;

export function createOnDrawInduceRule(input: Input): DrawProbabilityRule {
  const probabilityType = int32(
    find(input.details, 'ON_DRAW_INDUCE_PROBABILITY_TYPE')?.value ?? 3n,
  );
  const probabilityValue = int32(
    find(input.details, 'ON_DRAW_INDUCE_PROBABILITY_NUM')?.value ?? 50_000n,
  );
  const conditionType = int32(find(input.details, 'ON_DRAW_INDUCE_CONDITION_TYPE')?.value ?? 3n);
  const conditionFlag = int32(
    find(input.details, 'ON_DRAW_INDUCE_CONDITION_NOT_FLAG')?.value ?? 1n,
  );
  const conditionValue = int32(find(input.details, 'ON_DRAW_INDUCE_CONDITION_VALUE')?.value ?? 1n);
  const condition = conditionFor(conditionType, conditionValue);
  const weight =
    probabilityType === 1
      ? -1
      : probabilityType === 2
        ? 0
        : probabilityType === 3
          ? probabilityValue
          : null;
  if (weight === null) throw new Error('ドロー確率の種別が正しくありません。');
  if (conditionFlag !== 1 && conditionFlag !== 2)
    throw new Error('ドロー条件の反転設定が正しくありません。');
  return { condition, negated: conditionFlag === 2, weight };
}

function conditionFor(value: number, conditionValue: number): DrawProbabilityRule['condition'] {
  switch (value) {
    case 1:
      return { kind: 'member', value: conditionValue };
    case 2:
      return { kind: 'icon', value: conditionValue };
    case 3:
      return { kind: 'section', value: conditionValue };
    case 4:
      return { kind: 'initial' };
    case 5:
      return { kind: 'unit', value: conditionValue };
    default:
      throw new Error('ドロー条件の種別が正しくありません。');
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
