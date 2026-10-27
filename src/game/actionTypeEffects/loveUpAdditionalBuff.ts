import type { LoveUpAdditionalBuffEffect } from '../loveUpAdditionalBuffTypes.ts';
import type { MemberId, UnitId } from '../model.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

type Detail = Readonly<{
  id: bigint;
  detailType: string;
  targetMood: number;
  value: bigint;
}>;
type Input = Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;

const detailTypes = {
  calculation: 'LOVE_UP_ADDITIONAL_BUFF_CALC_TYPE',
  num: 'LOVE_UP_ADDITIONAL_BUFF_NUM',
  bonusMood: 'LOVE_UP_ADDITIONAL_BUFF_BONUS_MOOD',
  displayTimeType: 'LOVE_UP_ADDITIONAL_BUFF_DISPLAY_TIME_TYPE',
  displayTime: 'LOVE_UP_ADDITIONAL_BUFF_DISPLAY_TIME',
  disabledType: 'LOVE_UP_ADDITIONAL_BUFF_DISABLED_TYPE',
  disabledCount: 'LOVE_UP_ADDITIONAL_BUFF_DISABLED',
  targetType: 'LOVE_UP_ADDITIONAL_BUFF_TARGET_TYPE',
  targetId: 'LOVE_UP_ADDITIONAL_BUFF_TARGET_ID',
} as const;

export function createLoveUpAdditionalBuffEffect(input: Input): LoveUpAdditionalBuffEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, detailType]) => [
      key,
      findDetail(input.details, detailType),
    ]),
  );
  const moodDetail = details.bonusMood;
  const targetMood = moodDetail?.targetMood ?? 0;
  const moodBonus =
    targetMood === 0
      ? undefined
      : {
          target: moodTarget(targetMood),
          perPoint: Math.fround(int64ToFloat32(moodDetail?.value ?? 0n) / 10_000),
        };
  const targetType = int32(details.targetType?.value ?? 0n);
  const targetId = int32(details.targetId?.value ?? 0n);
  const target = targetFor(targetType, targetId);
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  return {
    kind: 'love-up-additional-buff',
    calculation: details.calculation?.value ?? 1n,
    num: details.num?.value ?? 0n,
    target,
    ...(moodBonus !== undefined ? { moodBonus } : {}),
    duration: duration(displayTimeType, details.displayTime?.value ?? 0n),
    disabledType: int32(details.disabledType?.value ?? 0n),
    disabledCount: details.disabledCount?.value ?? 0n,
  };
}

function targetFor(type: number, id: number): LoveUpAdditionalBuffEffect['target'] {
  if (type === 0) return { kind: 'all' };
  if (type === 1) return { kind: 'member', member: memberId(id) };
  if (type === 2) return { kind: 'unit', unit: unitId(id) };
  if (type === 3) return { kind: 'token-series', seriesId: id };
  throw new Error('STAR追加バフの対象種別が正しくありません。');
}

function moodTarget(value: number): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('空模様の補正対象が正しくありません。');
}

function duration(type: number, value: bigint): LoveUpAdditionalBuffEffect['duration'] {
  if (type === 1) return { kind: 'milliseconds', value };
  if (type === 2) return { kind: 'sections', value };
  if (type === 3) return { kind: 'stage', value };
  throw new Error('STAR追加バフの期限種別が正しくありません。');
}

function memberId(value: number): MemberId {
  if (
    value === 0 ||
    value === 1021 ||
    value === 1022 ||
    value === 1030 ||
    value === 1031 ||
    value === 1032 ||
    value === 1033 ||
    value === 1041 ||
    value === 1042 ||
    value === 1053
  )
    return value;
  throw new Error('STAR追加バフのメンバーが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('STAR追加バフのユニットが正しくありません。');
}

function findDetail(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
