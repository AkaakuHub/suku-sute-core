import type { Effect, MemberId, UnitId } from '../model.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  calculation: 'BOOST_TOKEN_CARD_CALC_TYPE',
  num: 'BOOST_TOKEN_CARD_NUM',
  displayTimeType: 'BOOST_TOKEN_CARD_DISPLAY_TIME_TYPE',
  displayTime: 'BOOST_TOKEN_CARD_DISPLAY_TIME',
  disabledType: 'BOOST_TOKEN_CARD_DISABLED_TYPE',
  disabledCount: 'BOOST_TOKEN_CARD_DISABLED',
  targetType: 'BOOST_TOKEN_CARD_TARGET_TYPE',
  targetId: 'BOOST_TOKEN_CARD_TARGET_ID',
  seriesId: 'BOOST_TOKEN_CARD_TOKEN_CARD_SERIES_ID',
} as const;

export function createTokenBoostEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calcType = int32(detail(input.details, detailTypes.calculation)?.value ?? 2n);
  const calculation = calcType === 1 ? 'multiply-percent' : calcType === 2 ? 'add' : null;
  if (!calculation) throw new Error('追加カード数補正の計算種別が正しくありません。');
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: displayTime }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : undefined;
  const disabledType = int32(detail(input.details, detailTypes.disabledType)?.value ?? 0n);
  const disabledCount = detail(input.details, detailTypes.disabledCount)?.value ?? 0n;
  const target = targetFor(
    int32(detail(input.details, detailTypes.targetType)?.value ?? 0n),
    int32(detail(input.details, detailTypes.targetId)?.value ?? 0n),
  );
  const seriesDetail = detail(input.details, detailTypes.seriesId);
  const seriesIds = seriesDetail?.paramValues?.map((value) => {
    if (!isInt64(value)) throw new Error('詳細値が正しくありません。');
    return value;
  });
  return {
    kind: 'token-boost',
    calculation,
    num: detail(input.details, detailTypes.num)?.value ?? 0n,
    target,
    ...(seriesIds && seriesIds.length > 0 ? { seriesIds } : {}),
    ...(disabledType === 1 ? { uses: disabledCount } : {}),
    ...(duration !== undefined ? { duration } : {}),
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function targetFor(type: number, id: number): Extract<Effect, { kind: 'token-boost' }>['target'] {
  if (type === 0) return { kind: 'all' };
  if (type === 1) return { kind: 'member', member: memberId(id) };
  if (type === 2) return { kind: 'unit', unit: unitId(id) };
  if (type === 3) return { kind: 'card-series', seriesId: id };
  throw new Error('追加カード数補正の対象種別が正しくありません。');
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
  throw new Error('追加カード数補正のメンバーが正しくありません。');
}

function unitId(value: number): UnitId {
  if (value === 1 || value === 2 || value === 3) return value;
  throw new Error('追加カード数補正のユニットが正しくありません。');
}

function detail(
  details: readonly ActionTypeDetail[],
  detailType: string,
): ActionTypeDetail | undefined {
  const item = details.find((value) => value.detailType === detailType);
  if (item) checked(item);
  return item;
}

function checked(item: ActionTypeDetail): void {
  if (!isInt64(item.id) || !isInt64(item.value)) throw new Error('詳細値が正しくありません。');
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
