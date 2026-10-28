import type { Effect } from '../modelTypes.ts';
import { isInt64 } from '../numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  convertType: 'CONVERT_VOLTAGE_UP_CONVERT_TYPE',
  num: 'CONVERT_VOLTAGE_UP_NUM',
  convertDisplayTimeType: 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME_TYPE',
  convertDisplayTime: 'CONVERT_VOLTAGE_UP_CONVERT_DISPLAY_TIME',
  convertDisabledType: 'CONVERT_VOLTAGE_UP_CONVERT_DISABLED_TYPE',
  displayTimeType: 'CONVERT_VOLTAGE_UP_DISPLAY_TIME_TYPE',
  displayTime: 'CONVERT_VOLTAGE_UP_DISPLAY_TIME',
  disabledType: 'CONVERT_VOLTAGE_UP_DISABLED_TYPE',
  disabled: 'CONVERT_VOLTAGE_UP_DISABLED',
} as const;

export function createVoltageConvertEffect(input: Input): Effect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, detailType]) => [
      key,
      findDetail(input.details, detailType),
    ]),
  );
  const convertType = int32(details.convertType?.value ?? 1n);
  const convertDisplayTimeType = int32(details.convertDisplayTimeType?.value ?? 1n);
  const convertDisplayTime = int32(details.convertDisplayTime?.value ?? 0n);
  const convertDisabledType = int32(details.convertDisabledType?.value ?? 0n);
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  const displayTime = int32(details.displayTime?.value ?? 0n);
  const disabledType = disabledTypeFor(int32(details.disabledType?.value ?? 0n));
  const disabledValue = details.disabled?.value ?? 0n;
  const destination = destinationFor(convertType);
  if (![0, 1, 2].includes(convertDisabledType))
    throw new Error('変換後の解除種別が正しくありません。');
  const effect = {
    kind: 'voltage-convert' as const,
    destination,
    num: int32(details.num?.value ?? 0n),
    outputDuration: duration(convertDisplayTimeType, convertDisplayTime),
    convertDisabledType: convertDisabledType as 0 | 1 | 2,
    displayDuration: duration(displayTimeType, displayTime),
    disabledType,
    disabledValue,
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
  return effect;
}

function destinationFor(
  value: number,
): Extract<Effect, { kind: 'voltage-convert' }>['destination'] {
  switch (value) {
    case 1:
      return 'hearts';
    case 2:
      return 'love';
    case 3:
      return 'mental';
    case 4:
      return 'mental-barrier';
    default:
      throw new Error('熱気変換先が正しくありません。');
  }
}

function disabledTypeFor(value: number): 0 | 1 {
  if (value !== 0 && value !== 1) throw new Error('熱気変換の解除種別が正しくありません。');
  return value;
}

function duration(
  type: number,
  value: number,
): Extract<Effect, { kind: 'voltage-convert' }>['displayDuration'] {
  if (type === 1) return { kind: 'milliseconds', value };
  if (type === 2) return { kind: 'sections', value };
  if (type === 3) return { kind: 'stage', value };
  throw new Error('熱気変換の期限種別が正しくありません。');
}

function findDetail(details: readonly Detail[], detailType: string): Detail | undefined {
  const detail = details.find((item) => item.detailType === detailType);
  if (!detail) return undefined;
  if (!isInt64(detail.id) || !isInt64(detail.value)) throw new Error('詳細値が正しくありません。');
  return detail;
}

function int32(value: bigint): number {
  return Number(BigInt.asIntN(32, value));
}
