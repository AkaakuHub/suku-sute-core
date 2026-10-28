import type { Effect } from '../model.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import { int64ToFloat32, isInt64 } from '../../runtime/numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  seriesId: 'SWITCH_TOKEN_CARD_DECK_SERIES_ID',
  displayTimeType: 'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME_TYPE',
  displayTime: 'SWITCH_TOKEN_CARD_DECK_DISPLAY_TIME',
} as const;

export function createSwitchTokenDeckEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const seriesDetail = detail(input.details, detailTypes.seriesId);
  const seriesIds = seriesDetail?.paramValues?.map((value) => {
    if (!isInt64(value)) throw new Error('詳細値が正しくありません。');
    return value;
  });
  const displayTimeType = int32(detail(input.details, detailTypes.displayTimeType)?.value ?? 1n);
  const displayTime = detail(input.details, detailTypes.displayTime)?.value ?? 0n;
  const duration =
    displayTimeType === 1
      ? { kind: 'milliseconds' as const, value: int64ToFloat32(displayTime) }
      : displayTimeType === 2
        ? { kind: 'sections' as const, value: displayTime }
        : displayTimeType === 3
          ? { kind: 'stage' as const, value: 0 }
          : null;
  if (duration === null) throw new Error('トークンカードデッキ切替の期限種別が正しくありません。');
  return {
    kind: 'token-deck-split',
    seriesIds: seriesIds ?? null,
    duration,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function detail(details: readonly ActionTypeDetail[], type: string): ActionTypeDetail | undefined {
  const item = details.find((value) => value.detailType === type);
  if (item) checked(item);
  return item;
}

function checked(item: ActionTypeDetail): void {
  if (!isInt64(item.id) || !isInt64(item.value)) throw new Error('詳細値が正しくありません。');
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
