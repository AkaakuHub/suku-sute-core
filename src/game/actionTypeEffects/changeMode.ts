import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

export function createChangeModeEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const changeType = int32(detail(input.details, 'CHANGE_MODE_TYPE')?.value ?? 1n);
  const modeId = int32(detail(input.details, 'CHANGE_MODE_ID')?.value ?? 0n);
  const change = changes[changeType];
  if (!change) throw new Error('モード切替種別が正しくありません。');
  return { kind: 'mode', modeId: BigInt(modeId), change };
}

const changes: Readonly<Record<number, 'off' | 'on' | 'alternate'>> = {
  1: 'off',
  2: 'on',
  3: 'alternate',
};

function detail(details: readonly Detail[], detailType: string): Detail | undefined {
  const item = details.find((value) => value.detailType === detailType);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
