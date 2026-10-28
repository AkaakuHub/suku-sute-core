import type { Effect } from '../model.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
}>;

export function createGenesisSkillEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const effectBaseNum = detail(input, 'GENESIS_EFFECT_BASE_NUM') ?? 0n;
  const displayTimeType = int32(detail(input, 'GENESIS_DISPLAY_TIME_TYPE') ?? 1n);
  const displayTime = detail(input, 'GENESIS_DISPLAY_TIME') ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0n }
          : null;
  if (!duration) throw new Error('Genesisスキルの期限種別が正しくありません。');
  return { kind: 'genesis-skill', effectBaseNum, duration };
}

function detail(input: Input, type: string): bigint | undefined {
  const item = input.details.find((value) => value.detailType === type);
  if (item && (!isInt64(item.id) || !isInt64(item.value)))
    throw new Error('詳細値が正しくありません。');
  return item?.value;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
