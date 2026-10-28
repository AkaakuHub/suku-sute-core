import type { LiveSkillEffect } from '../skills/skillTypes.ts';

import type { LiveCardSearchEffect } from './deckActionTypes.ts';
import type { LiveChangeApConditionType } from './deckActionTypes.ts';

export function requireDetails(
  effect: LiveSkillEffect,
  actionType: number,
  names: readonly string[],
  label: string,
  optionalNames: readonly string[] = [],
  paramNames: readonly string[] = [],
  optionalParamNames: readonly string[] = [],
): ReadonlyMap<string, LiveSkillEffect['details'][number]> {
  if (effect.actionType !== actionType) {
    throw new Error(`Live ${label} action type is invalid`);
  }
  const allowedNames = new Set([...names, ...optionalNames]);
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    !names.every((name) => details.has(name)) ||
    details.size !== effect.details.length ||
    effect.details.some(
      (detail) =>
        !allowedNames.has(detail.detailType) ||
        detail.targetMood !== 0 ||
        !Number.isSafeInteger(detail.effectValue) ||
        !validateDetailParams(
          detail,
          paramNames.includes(detail.detailType),
          optionalParamNames.includes(detail.detailType),
        ),
    )
  ) {
    throw new Error(`Live ${label} skill effect details differ`);
  }
  return details;
}

function validateDetailParams(
  detail: LiveSkillEffect['details'][number],
  requiresParam: boolean,
  optionalParam: boolean,
): boolean {
  if (!requiresParam && !optionalParam) return detail.params.length === 0;
  if (optionalParam && detail.params.length === 0) return true;
  if (optionalParam && !requiresParam) {
    return detail.params.every(
      (param) => param.paramType.length > 0 && /^[1-9]\d*$/.test(param.paramValue),
    );
  }
  const param = detail.params[0];
  return (
    detail.params.length === 1 &&
    param !== undefined &&
    param.paramType === detail.detailType &&
    /^[1-9]\d*$/.test(param.paramValue)
  );
}

export function resolveTokenCardSeriesIds(
  seriesDetail: LiveSkillEffect['details'][number] | undefined,
  resourceDetail: LiveSkillEffect['details'][number] | undefined,
): readonly number[] {
  if (seriesDetail === undefined || resourceDetail === undefined) {
    throw new Error('Live TokenCard series details are absent');
  }
  const seriesParams = resourceDetail.params.map((param) => {
    if (param.paramType !== 'TOKEN_CARD_SERIES_ID' || !/^[1-9]\d*$/.test(param.paramValue)) {
      throw new Error('Live TokenCard series parameter is invalid');
    }
    const seriesId = Number(param.paramValue);
    if (!Number.isSafeInteger(seriesId)) {
      throw new Error('Live TokenCard series parameter is invalid');
    }
    return seriesId;
  });
  if (seriesParams.length > 0) {
    const resourceId = Number(resourceDetail.id);
    if (!Number.isSafeInteger(resourceId) || seriesDetail.effectValue !== resourceId) {
      throw new Error('Live TokenCard series detail reference is invalid');
    }
    return seriesParams;
  }
  return [requirePositiveInteger(seriesDetail.effectValue, 'TokenCard series ID')];
}

export function requireEnum<Value>(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  allowed: readonly number[],
  label: string,
  resolve: (value: number) => Value,
  optional = false,
): Value {
  const detail = details.get(name);
  if (detail === undefined) {
    if (optional) return resolve(0);
    throw new Error(`Live ${label} is absent`);
  }
  if (!allowed.includes(detail.effectValue)) throw new Error(`Live ${label} is invalid`);
  return resolve(detail.effectValue);
}

export function requireSafeInteger(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isSafeInteger(value))
    throw new Error(`Live ${label} is invalid`);
  return value;
}

export function requireChangeApValue(value: number | undefined, label: string): number {
  const scaledValue = requireSafeInteger(value, label);
  if (scaledValue % 10_000 !== 0) {
    throw new Error(`Live ${label} has unsupported precision`);
  }
  return scaledValue / 10_000;
}

export function requirePositiveInteger(value: number | undefined, label: string): number {
  const result = requireSafeInteger(value, label);
  if (result < 1) throw new Error(`Live ${label} is invalid`);
  return result;
}

export function requirePositiveDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): number {
  return requirePositiveInteger(details.get(name)?.effectValue, label);
}

export function requireNonnegativeDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
  label: string,
): number {
  const value = requireSafeInteger(details.get(name)?.effectValue, label);
  if (value < 0) throw new Error(`Live ${label} is invalid`);
  return value;
}

export function requirePositiveParam(
  detail: LiveSkillEffect['details'][number] | undefined,
  paramType: string,
  label: string,
): number {
  const param = detail?.params[0];
  if (
    detail === undefined ||
    detail.params.length !== 1 ||
    param === undefined ||
    param.paramType !== paramType ||
    !/^[1-9]\d*$/.test(param.paramValue)
  ) {
    throw new Error(`Live ${label} is invalid`);
  }
  const result = Number(param.paramValue);
  if (!Number.isSafeInteger(result)) throw new Error(`Live ${label} is invalid`);
  return result;
}

export function resolveCardSearchType(value: number): LiveCardSearchEffect['searchType'] {
  switch (value) {
    case 1:
      return 'skill-main-effect';
    case 2:
      return 'character-id';
    case 3:
      return 'unit-id';
    case 4:
      return 'token-card-series';
    default:
      throw new Error('Live CardSearch type is invalid');
  }
}

export function resolveChangeApConditionType(value: number): LiveChangeApConditionType {
  switch (value) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15:
      return value;
    default:
      throw new Error('Live ChangeAP condition type is invalid');
  }
}
