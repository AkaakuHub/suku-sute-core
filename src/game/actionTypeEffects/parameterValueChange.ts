import type { Effect, ParameterValueChangeEffect } from '../modelTypes.ts';
import type { ActionTypeDetail } from '../cards/actionTypeDetail.ts';
import type { MemberId } from '../model.ts';
import { int64ToFloat32, isInt64 } from '../numeric.ts';

type Input = Readonly<{ skillEffectId: bigint; details: readonly ActionTypeDetail[] }>;

export function createParameterValueChangeEffect(input: Input): Effect | null {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const calculationType = int32(find(input.details, 'CHANGE_PARAM_VALUE_CALC_TYPE')?.value ?? 1n);
  const targetDetailId = find(input.details, 'CHANGE_PARAM_VALUE_ACTION_ID')?.value ?? 0n;
  if (!isInt64(targetDetailId)) throw new Error('変更対象の詳細値IDが正しくありません。');
  const base = int64ToFloat32(find(input.details, 'CHANGE_PARAM_VALUE_BASE_NUM')?.value ?? 10_000n);
  const increment = int64ToFloat32(find(input.details, 'CHANGE_PARAM_VALUE_ADD_NUM')?.value ?? 0n);
  const calculation = calculationFor(calculationType);
  const params = input.details.find(
    (detail) => detail.detailType === 'CHANGE_PARAM_VALUE_MULTIPLY_PARAMS_ID',
  )?.paramValues;
  if (calculation !== 'add' && params === undefined) return null;
  const values =
    calculation === 'multiply'
      ? params?.map((value) => {
          if (!isInt64(value)) throw new Error('詳細値が正しくありません。');
          return int64ToFloat32(value);
        })
      : undefined;
  const members =
    calculation === 'fan-level'
      ? params?.map((value) => {
          if (!isInt64(value)) throw new Error('詳細値が正しくありません。');
          return memberId(int32(value));
        })
      : undefined;
  return {
    kind: 'parameter-value-change',
    sourceEffectId: input.skillEffectId.toString(),
    targetDetailId,
    calculation,
    base,
    increment,
    ...(members ? { members } : {}),
    ...(values ? { values } : {}),
  } satisfies ParameterValueChangeEffect;
}

function memberId(value: number): MemberId {
  if ([0, 1021, 1022, 1030, 1031, 1032, 1033, 1041, 1042, 1053].includes(value))
    return value as MemberId;
  throw new Error('詳細値変更のメンバーIDが正しくありません。');
}

function calculationFor(value: number): ParameterValueChangeEffect['calculation'] {
  switch (value) {
    case 1:
      return 'fan-level';
    case 2:
      return 'multiply';
    case 3:
      return 'add';
    default:
      throw new Error('詳細値変更の計算種別が正しくありません。');
  }
}

function find(
  details: readonly ActionTypeDetail[],
  detailType: string,
): ActionTypeDetail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
