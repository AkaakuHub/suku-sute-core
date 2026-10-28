import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood?: number;
  value: bigint;
}>;

type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

export function createAddVoltageEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const mood = detail(input.details, 'ADD_VOLTAGE_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('熱気加算の空模様対象が正しくありません。');
  return {
    kind: 'add-voltage-skill',
    amount: int32(detail(input.details, 'ADD_VOLTAGE_NUM')?.value ?? 0n),
    numberType: int32(detail(input.details, 'ADD_VOLTAGE_NUM_TYPE')?.value ?? 1n),
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
    skillEffectId: input.skillEffectId,
  };
}

function detail(details: readonly Detail[], type: string): Detail | undefined {
  const found = details.find((item) => item.detailType === type);
  if (found && (!isInt64(found.id) || !isInt64(found.value)))
    throw new Error('詳細値が正しくありません。');
  return found;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
