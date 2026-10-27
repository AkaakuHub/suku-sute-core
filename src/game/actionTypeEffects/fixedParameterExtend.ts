import type { FixedParameterExtendEffect } from '../fixedParameterExtendTypes.ts';
import { isInt64 } from '../numeric.ts';

type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[];
  deactivationKey?: string;
}>;

export function createFixedParameterExtendEffect(input: Input): FixedParameterExtendEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const targetType = int32(value(input, 'FIXED_PARAM_TARGET', 1n));
  const target =
    targetType === 1 ? 'ap' : targetType === 2 ? 'voltage' : targetType === 3 ? 'mental' : null;
  if (!target) throw new Error('固定パラメーター上限変更の対象が正しくありません。');
  const calculationType = int32(value(input, 'FIXED_PARAM_CALC_TYPE', 1n));
  const calculation =
    calculationType === 1
      ? 'add'
      : calculationType === 2
        ? 'multiply'
        : calculationType === 3
          ? 'fixed'
          : null;
  if (!calculation) throw new Error('固定パラメーター上限変更の計算種別が正しくありません。');
  const durationType = int32(value(input, 'FIXED_PARAM_DURATION_TYPE', 1n));
  const durationValue = value(input, 'FIXED_PARAM_DURATION_VALUE', 0n);
  const duration =
    durationType === 1
      ? { kind: 'milliseconds' as const, value: durationValue }
      : durationType === 2
        ? { kind: 'sections' as const, value: durationValue }
        : durationType === 3
          ? { kind: 'stage' as const }
          : null;
  if (!duration) throw new Error('固定パラメーター上限変更の期限種別が正しくありません。');
  return {
    kind: 'fixed-parameter-extend',
    target,
    calculation,
    value: value(input, 'FIXED_PARAM_VALUE', 0n),
    duration,
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function value(input: Input, type: string, fallback: bigint): bigint {
  const detail = input.details.find((item) => item.detailType === type);
  if (detail && (!isInt64(detail.id) || !isInt64(detail.value)))
    throw new Error('詳細値が正しくありません。');
  return detail?.value ?? fallback;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
