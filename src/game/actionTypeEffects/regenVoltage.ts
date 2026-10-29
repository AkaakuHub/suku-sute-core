import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood?: number;
  value: bigint;
}>;

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

export function createVoltageRegenerationEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const mood = detail(input.details, 'REGEN_VOLTAGE_NUM_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('熱気継続回復の空模様対象が正しくありません。');
  const intervalType = int32(detail(input.details, 'REGEN_VOLTAGE_INTERVAL_TYPE')?.value ?? 1n);
  if (intervalType !== 1 && intervalType !== 2)
    throw new Error('熱気継続回復の間隔種別が正しくありません。');
  const displayType = int32(detail(input.details, 'REGEN_VOLTAGE_DISPLAY_TIME_TYPE')?.value ?? 1n);
  const displayTime = int32(detail(input.details, 'REGEN_VOLTAGE_DISPLAY_TIME')?.value ?? 0n);
  const duration =
    displayType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : null;
  if (!duration) throw new Error('熱気継続回復の期限種別が正しくありません。');
  if (duration.kind === 'sections' && duration.value === 0)
    throw new Error('熱気継続回復のパート期限は0にできません。');
  return {
    kind: 'gauge-regeneration',
    gauge: 'voltage',
    calculationType: int32(detail(input.details, 'REGEN_VOLTAGE_TYPE')?.value ?? 1n),
    amount: Math.fround(
      int64ToFloat32(detail(input.details, 'REGEN_VOLTAGE_NUM_BASE')?.value ?? 0n) / 10_000,
    ),
    amountBasis: 'skill-fixed',
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
    intervalType,
    intervalValue: int32(detail(input.details, 'REGEN_VOLTAGE_INTERVAL_NUM')?.value ?? 0n),
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
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
