import type { Action52BuffEffect } from '../skillBoostTypes.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import type { MemberId, UnitId } from '../model.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculation: 'SKILL_BOOST_TYPE',
  num: 'SKILL_BOOST_NUM',
  bonusMood: 'SKILL_BOOST_BONUS_MOOD',
  displayTimeType: 'SKILL_BOOST_DISPLAY_TIME_TYPE',
  displayTime: 'SKILL_BOOST_DISPLAY_TIME_VALUE',
  expireType: 'SKILL_BOOST_EXPIRE_TYPE',
  expireValue: 'SKILL_BOOST_EXPIRE_VALUE',
  targetType: 'SKILL_BOOST_TARGET_TYPE',
  targetId: 'SKILL_BOOST_TARGET_ID',
  seriesId: 'SKILL_BOOST_TOKEN_CARD_SERIES_ID',
} as const;

export function createSkillBoostEffect(input: Input): Action52BuffEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, type]) => [key, find(input.details, type)]),
  );
  if (int32(details.calculation?.value ?? 1n) !== 1)
    throw new Error('ActionType52の計算種別が正しくありません。');
  const moodDetail = details.bonusMood;
  const targetMood = moodDetail?.targetMood ?? 0;
  if (!Number.isSafeInteger(targetMood) || targetMood < 0 || targetMood > 3)
    throw new Error('ActionType52の空模様対象が正しくありません。');
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  const displayTime = details.displayTime?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0n }
          : null;
  if (!duration) throw new Error('ActionType52の期限種別が正しくありません。');
  const target = targetFor(
    int32(details.targetType?.value ?? 0n),
    int32(details.targetId?.value ?? 0n),
  );
  const seriesIds = find(input.details, detailTypes.seriesId)?.paramValues;
  const expireType = int32(details.expireType?.value ?? 0n);
  if (expireType !== 0 && expireType !== 1)
    throw new Error('ActionType52の解除条件が正しくありません。');
  const moodBonus =
    targetMood === 0
      ? undefined
      : {
          target: targetMood as 1 | 2 | 3,
          perPoint: Math.fround(Math.fround(int32(moodDetail?.value ?? 0n)) / Math.fround(10_000)),
        };
  return {
    kind: 'skill-boost',
    num: int32(details.num?.value ?? 0n),
    target,
    ...(moodBonus !== undefined ? { moodBonus } : {}),
    duration,
    uses: expireType === 1 ? (details.expireValue?.value ?? 0n) : null,
    ...(seriesIds && seriesIds.length > 0 ? { skillTokenSeriesIds: seriesIds } : {}),
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function targetFor(type: number, id: number): Action52BuffEffect['target'] {
  if (type === 0) return { kind: 'all' };
  if (type === 1) return { kind: 'member', member: memberId(id) };
  if (type === 2) return { kind: 'unit', unit: unitId(id) };
  if (type === 3) return { kind: 'token-series', seriesId: id };
  throw new Error('ActionType52の対象種別が正しくありません。');
}

function memberId(value: number): MemberId {
  if ([0, 1021, 1022, 1030, 1031, 1032, 1033, 1041, 1042, 1053].includes(value))
    return value as MemberId;
  throw new Error('ActionType52のメンバーが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('ActionType52のユニットが正しくありません。');
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
