import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

export function createVoltageLevelEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const detail = input.details.find((item) => item.detailType === 'CHANGE_VOLTAGE_NUM');
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('熱気レベル変更の詳細値が正しくありません。');
  return { kind: 'voltage-set', amount: int64ToFloat32(detail?.value ?? 0n) };
}
