import type { HeartLimitBoostEffect } from '../heartLimitBoostTypes.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import type { MemberId, UnitId } from '../model.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculation: 'CHANGE_HEART_LIMIT_BOOST_CALC_TYPE',
  num: 'CHANGE_HEART_LIMIT_BOOST_PARAM',
  bonusMood: 'CHANGE_HEART_LIMIT_BOOST_NUM_BONUS_MOOD',
  displayTimeType: 'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_TYPE',
  displayTime: 'CHANGE_HEART_LIMIT_BOOST_DISPLAY_TIME_PARAM',
  disabledType: 'CHANGE_HEART_LIMIT_BOOST_DISABLED_TYPE',
  disabledCount: 'CHANGE_HEART_LIMIT_BOOST_DISABLED_PARAM',
  targetType: 'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE',
  targetId: 'CHANGE_HEART_LIMIT_BOOST_TARGET_TYPE_ID',
  seriesId: 'CHANGE_HEART_LIMIT_BOOST_TOKEN_CARD_SERIES_ID',
} as const;

export function createHeartLimitBoostEffect(input: Input): HeartLimitBoostEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, type]) => [key, find(input.details, type)]),
  );
  const calculationType = int32(details.calculation?.value ?? 2n);
  if (calculationType !== 1 && calculationType !== 2)
    throw new Error('きらめき上限追加バフの計算種別が正しくありません。');
  const moodTarget = details.bonusMood?.targetMood ?? 0;
  if (!Number.isSafeInteger(moodTarget) || moodTarget < 0 || moodTarget > 3)
    throw new Error('きらめき上限追加バフの空模様対象が正しくありません。');
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  const displayTime = details.displayTime?.value ?? 0n;
  const duration =
    displayTimeType === 0
      ? { kind: 'none' as const, value: 0n }
      : displayTimeType === 1
        ? { kind: 'milliseconds' as const, value: displayTime }
        : displayTimeType === 2
          ? { kind: 'sections' as const, value: displayTime }
          : displayTimeType === 3
            ? { kind: 'stage' as const, value: 0n }
            : null;
  if (!duration) throw new Error('きらめき上限追加バフの期限種別が正しくありません。');
  const target = targetFor(
    int32(details.targetType?.value ?? 0n),
    int32(details.targetId?.value ?? 0n),
  );
  const disabledType = int32(details.disabledType?.value ?? 0n);
  const seriesDetail = find(input.details, detailTypes.seriesId);
  const seriesIds = seriesDetail?.paramValues;
  return {
    kind: 'heart-limit-boost',
    calculationType,
    num: details.num?.value ?? 0n,
    bonusMoodTarget: moodTarget as 0 | 1 | 2 | 3,
    bonusMoodValue: details.bonusMood?.value ?? 0n,
    duration,
    disabledType,
    disabledCount: details.disabledCount?.value ?? 0n,
    target,
    ...(seriesIds && seriesIds.length > 0 ? { tokenCardSeriesIds: seriesIds } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function targetFor(type: number, id: number): HeartLimitBoostEffect['target'] {
  if (type === 0) return { kind: 'all' };
  if (type === 1) return { kind: 'member', member: memberId(id) };
  if (type === 2) return { kind: 'unit', unit: unitId(id) };
  if (type === 3) return { kind: 'card-series', seriesId: id };
  throw new Error('きらめき上限追加バフの対象種別が正しくありません。');
}

function memberId(value: number): MemberId {
  if ([0, 1021, 1022, 1030, 1031, 1032, 1033, 1041, 1042, 1053].includes(value))
    return value as MemberId;
  throw new Error('きらめき上限追加バフのメンバーが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('きらめき上限追加バフのユニットが正しくありません。');
}

function find(details: readonly ActionTypeDetail[], type: string): ActionTypeDetail | undefined {
  const detail = details.find((item) => item.detailType === type);
  if (detail) checked(detail);
  return detail;
}

function checked(detail: ActionTypeDetail): void {
  if (!isInt64(detail.id) || !isInt64(detail.value) || !Number.isSafeInteger(detail.targetMood))
    throw new Error('詳細値が正しくありません。');
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
