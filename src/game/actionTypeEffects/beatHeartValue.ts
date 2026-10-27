import type { Effect } from '../model.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; targetMood: number; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculation: 'CHANGE_BEAT_HEART_VALUE_CALC_TYPE',
  num: 'CHANGE_BEAT_HEART_VALUE_NUM',
  moodBonus: 'CHANGE_BEAT_HEART_VALUE_BONUS_MOOD',
  displayTimeType: 'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME_TYPE',
  displayTime: 'CHANGE_BEAT_HEART_VALUE_DISPLAY_TIME',
} as const;

export function createBeatHeartValueEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calculationType = int32(find(input.details, detailTypes.calculation)?.value ?? 1n);
  const calculation =
    calculationType === 1
      ? 'add'
      : calculationType === 2
        ? 'multiply'
        : calculationType === 3
          ? 'fixed'
          : null;
  if (calculation === null) throw new Error('ビートハート値変更の計算種別が正しくありません。');
  const mood = find(input.details, detailTypes.moodBonus);
  const targetMood = mood?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('ビートハート値変更の空模様補正対象が正しくありません。');
  const displayTimeType = int32(find(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = find(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0n }
          : null;
  if (duration === null) throw new Error('ビートハート値変更の期限種別が正しくありません。');
  const moodBonus =
    targetMood === 0
      ? undefined
      : {
          target: targetMood as 1 | 2 | 3,
          perPoint: 0,
          perPointLong: mood?.value ?? 0n,
        };
  return {
    kind: 'beat-heart-value-buff',
    calculation,
    amount: find(input.details, detailTypes.num)?.value ?? 0n,
    ...(moodBonus !== undefined ? { moodBonus } : {}),
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function find(details: readonly Detail[], type: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === type);
  if (
    detail &&
    (!isInt64(detail.id) || !isInt64(detail.value) || !Number.isSafeInteger(detail.targetMood))
  )
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
