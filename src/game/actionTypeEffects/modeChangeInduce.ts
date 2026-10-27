import type { Effect } from '../model.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  effects: readonly Effect[];
}>;

export function createModeChangeInduceEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const targetModeId = value(input.details, 'MODE_CHANGE_INDUCE_TARGET_MODE_ID', 0n);
  const buffNum = value(input.details, 'MODE_CHANGE_INDUCE_BUFF_NUM', 0n);
  const thresholdDetail = input.details.find(
    (detail) => detail.detailType === 'MODE_CHANGE_INDUCE_COUNT_PARAMS_ID',
  );
  const thresholds = thresholdDetail?.paramValues ?? [];
  for (const threshold of thresholds) {
    if (!isInt64(threshold)) throw new Error('モード切替誘発の回数が正しくありません。');
  }
  if (thresholds.length !== input.effects.length)
    throw new Error('モード切替誘発の回数と効果数が一致しません。');
  return {
    kind: 'mode-reaction',
    modeId: Number(BigInt.asIntN(32, targetModeId)),
    thresholds,
    effects: input.effects,
    buffNum,
  };
}

function value(details: Input['details'], detailType: string, fallback: bigint): bigint {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail?.value ?? fallback;
}
