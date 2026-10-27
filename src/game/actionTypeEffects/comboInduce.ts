import type { Effect } from '../modelTypes.ts';
import type { MemberId } from '../model.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  effects: readonly Effect[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  members: 'COMBO_INDUCE_MEMBER_PARAMS',
  apPower: 'COMBO_INDUCE_AP_POWER',
  displayTimeType: 'COMBO_INDUCE_DISPLAY_TIME_TYPE',
  displayTime: 'COMBO_INDUCE_DISPLAY_TIME',
  repeatAction: 'COMBO_INDUCE_REPEAT_ACTION',
} as const;

export function createComboInduceEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const memberDetail = input.details.find((item) => item.detailType === detailTypes.members);
  const members = detailParams(memberDetail).map(memberId);
  const apPower = firstDetail(input.details, detailTypes.apPower)?.value ?? 10_000n;
  const displayTimeType = int32(
    firstDetail(input.details, detailTypes.displayTimeType)?.value ?? 3n,
  );
  const displayTime = int32(firstDetail(input.details, detailTypes.displayTime)?.value ?? 0n);
  const repeatAction = int32(firstDetail(input.details, detailTypes.repeatAction)?.value ?? 0n);
  if (repeatAction !== 0 && repeatAction !== 1 && repeatAction !== 2)
    throw new Error('コンボ誘発の重複時処理が正しくありません。');
  return {
    kind: 'combo-induce',
    members,
    apPower,
    repeatAction,
    duration: duration(displayTimeType, displayTime),
    effects: input.effects,
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function firstDetail(
  details: readonly ActionTypeDetail[],
  detailType: string,
): ActionTypeDetail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail) checkedValue(detail);
  return detail;
}

function checkedValue(detail: ActionTypeDetail): bigint {
  if (!isInt64(detail.id) || !isInt64(detail.value)) throw new Error('詳細値が正しくありません。');
  return detail.value;
}

function detailParams(detail: ActionTypeDetail | undefined): readonly bigint[] {
  if (!detail || !isInt64(detail.id) || !detail.paramValues)
    throw new Error('コンボ誘発の対象メンバー詳細値がありません。');
  if (detail.paramValues.some((value) => !isInt64(value)))
    throw new Error('コンボ誘発の対象メンバー詳細値が正しくありません。');
  return detail.paramValues;
}

function memberId(raw: bigint): MemberId {
  if (!isInt64(raw)) throw new Error('コンボ誘発の対象メンバー詳細値が正しくありません。');
  if (raw === 0n) return 0;
  if (raw === 1021n) return 1021;
  if (raw === 1022n) return 1022;
  if (raw === 1030n) return 1030;
  if (raw === 1031n) return 1031;
  if (raw === 1032n) return 1032;
  if (raw === 1033n) return 1033;
  if (raw === 1041n) return 1041;
  if (raw === 1042n) return 1042;
  if (raw === 1053n) return 1053;
  throw new Error('コンボ誘発の対象メンバーが正しくありません。');
}

function duration(
  type: number,
  value: number,
): Extract<Effect, { kind: 'combo-induce' }>['duration'] {
  if (type === 1) return { kind: 'milliseconds', value };
  if (type === 2) return { kind: 'sections', value };
  if (type === 3) return { kind: 'stage', value };
  throw new Error('コンボ誘発の期限種別が正しくありません。');
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
