import type { AdditionalHeartInduceEffect } from '../additionalHeartTypes.ts';
import { createAddHeartEffect } from './addHeart.ts';
import { isInt64 } from '../../runtime/numeric.ts';

type Detail = Readonly<{ id: bigint; detailType: string; value: bigint }>;
type Input = Readonly<{
  skillEffectId: bigint;
  details: readonly Detail[];
  heartAction: Readonly<{ skillEffectId: bigint; details: readonly Detail[] }>;
  invocationType?: number;
  deactivationKey?: string;
}>;

const detailTypes = {
  induceType: 'GET_ADDITIONAL_HEART_INDUCE_TYPE',
  induceValue: 'GET_ADDITIONAL_HEART_INDUCE_VALUE',
  effectId: 'GET_ADDITIONAL_HEART_EFFECT_ID',
  apPower: 'GET_ADDITIONAL_HEART_AP_POWER',
  displayTimeType: 'GET_ADDITIONAL_HEART_DISPLAY_TIME_TYPE',
  displayTime: 'GET_ADDITIONAL_HEART_DISPLAY_TIME',
} as const;

export function createAdditionalHeartInduceEffect(input: Input): AdditionalHeartInduceEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const details = Object.fromEntries(
    Object.entries(detailTypes).map(([key, detailType]) => [
      key,
      findDetail(input.details, detailType),
    ]),
  );
  const induceType = int32(details.induceType?.value ?? 0n);
  const induceValue = details.induceValue?.value ?? 0n;
  const effectId = details.effectId?.value ?? 0n;
  if (input.heartAction.skillEffectId !== effectId)
    throw new Error('追加きらめきの子ActionType1 IDが一致しません。');
  const displayTimeType = int32(details.displayTimeType?.value ?? 1n);
  const displayTime = details.displayTime?.value ?? 0n;
  if (details.effectId && !isInt64(details.effectId.value))
    throw new Error('追加きらめきの子効果IDが正しくありません。');
  const heartEffect = createAddHeartEffect(input.heartAction);
  if (heartEffect.kind !== 'skill-hearts')
    throw new Error('追加きらめきの子ActionType1効果が正しくありません。');
  return {
    kind: 'additional-heart-induce',
    condition: condition(induceType, induceValue),
    apPower: details.apPower?.value ?? 0n,
    heartEffect,
    duration: duration(displayTimeType, displayTime),
    ...(input.invocationType !== undefined ? { invocationType: input.invocationType } : {}),
    ...(input.deactivationKey !== undefined ? { deactivationKey: input.deactivationKey } : {}),
  };
}

function condition(type: number, value: bigint): AdditionalHeartInduceEffect['condition'] {
  if (type === 0) return { kind: 'all' };
  if (type === 1) return { kind: 'member', member: value };
  if (type === 2) return { kind: 'main-effect', actionType: value };
  if (type === 3) return { kind: 'unit', unit: int32(value) };
  throw new Error('追加きらめき誘発の条件種別が正しくありません。');
}

function duration(type: number, value: bigint): AdditionalHeartInduceEffect['duration'] {
  if (type === 1) return { kind: 'milliseconds', value };
  if (type === 2) return { kind: 'sections', value };
  if (type === 3) return { kind: 'stage', value };
  throw new Error('追加きらめき誘発の期限種別が正しくありません。');
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
