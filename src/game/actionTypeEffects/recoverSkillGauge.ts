import type { Effect } from '../modelTypes.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood?: number;
  value: bigint;
}>;

type Input = Readonly<{ details: readonly Detail[] }>;

export function createRecoverSkillGaugeEffect(input: Input): Effect {
  const base = find(input.details, 'RECOVER_AP_NUM_BASE');
  const mood = find(input.details, 'RECOVER_AP_NUM_BONUS_MOOD');
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('AP回復の空模様対象が正しくありません。');
  return {
    kind: 'ap',
    amount: Math.fround(int64ToFloat32(base?.value ?? 0n) / 10_000),
    ...(targetMood > 0
      ? {
          moodBonus: {
            target: targetMood as 1 | 2 | 3,
            perPoint: Math.fround(int64ToFloat32(mood?.value ?? 0n) / 10_000),
          },
        }
      : {}),
  };
}

function find(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}
