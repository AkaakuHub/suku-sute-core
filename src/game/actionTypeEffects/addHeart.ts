import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood?: number;
  value: bigint;
}>;

type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

const detailTypes = {
  calculation: 'HEART_CALC_TYPE',
  amount: 'HEART_NUM_BASE',
  moodBonus: 'HEART_NUM_BONUS_MOOD',
  displayTimeType: 'HEART_DISPLAY_TIME_TYPE',
  displayTime: 'HEART_DISPLAY_TIME',
} as const;

export function createAddHeartEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calculationType = int32(find(input.details, detailTypes.calculation)?.value ?? 1n);
  if (calculationType !== 1 && calculationType !== 2)
    throw new Error('ハート生成の計算種別が正しくありません。');
  const mood = find(input.details, detailTypes.moodBonus);
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('ハート生成の空模様対象が正しくありません。');
  const displayTimeType = int32(find(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = int32(find(input.details, detailTypes.displayTime)?.value ?? 1000n);
  const displayTimeValue =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'full-end' as const, value: 0 }
          : null;
  if (!displayTimeValue) throw new Error('ハート生成の期限種別が正しくありません。');
  if (displayTimeType === 2 && displayTime === 0)
    throw new Error('ハート生成のパート期限は0にできません。');
  return {
    kind: 'skill-hearts',
    skillEffectId: input.skillEffectId,
    calculation: calculationType === 1 ? 'ratio' : 'fixed',
    amount: int32(find(input.details, detailTypes.amount)?.value ?? 0n),
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
    displayTime: displayTimeValue,
  };
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
