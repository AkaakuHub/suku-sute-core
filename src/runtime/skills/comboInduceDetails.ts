import type { LiveSkillEffect } from './skillTypes.ts';

export function requireComboInduceDetails(effect: LiveSkillEffect) {
  const names = [
    'COMBO_INDUCE_MEMBER_PARAMS',
    'COMBO_INDUCE_EFFECT_PARAMS',
    'COMBO_INDUCE_AP_POWER',
    'COMBO_INDUCE_DISPLAY_TIME_TYPE',
    'COMBO_INDUCE_DISPLAY_TIME',
    'COMBO_INDUCE_REPEAT_ACTION',
  ] as const;
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    effect.details.length !== names.length ||
    details.size !== names.length ||
    names.some((name) => !details.has(name)) ||
    effect.details.some((detail) => detail.targetMood !== 0)
  ) {
    throw new Error('Live Combo Induce skill effect details differ');
  }
  for (const detail of effect.details) {
    const usesParams =
      detail.detailType === 'COMBO_INDUCE_MEMBER_PARAMS' ||
      detail.detailType === 'COMBO_INDUCE_EFFECT_PARAMS';
    if (usesParams !== detail.params.length > 0) {
      throw new Error('Live Combo Induce skill effect details differ');
    }
    if (usesParams && (!Number.isSafeInteger(detail.effectValue) || detail.effectValue <= 0)) {
      throw new Error('Live Combo Induce skill effect details differ');
    }
  }
  return details;
}

export function requireIntegerValue(
  details: ReturnType<typeof requireComboInduceDetails>,
  name: string,
): number {
  const value = details.get(name)?.effectValue;
  if (value === undefined || !Number.isSafeInteger(value)) {
    throw new Error(`Live Combo Induce detail differs:${name}`);
  }
  return value;
}

export function requireCsvIds(
  detail: LiveSkillEffect['details'][number] | undefined,
  name: string,
): readonly string[] {
  const values = requireSingleParam(detail, name).split(',');
  if (values.some((value) => !/^[1-9]\d*$/u.test(value))) {
    throw new Error(`Live Combo Induce parameters differ:${name}`);
  }
  return values;
}

export function requireCsvIntegers(
  detail: LiveSkillEffect['details'][number] | undefined,
  name: string,
): readonly number[] {
  return requireCsvIds(detail, name).map((value) => {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      throw new Error(`Live Combo Induce parameters differ:${name}`);
    }
    return parsed;
  });
}

function requireSingleParam(
  detail: LiveSkillEffect['details'][number] | undefined,
  name: string,
): string {
  const param = detail?.params[0];
  if (
    detail === undefined ||
    detail.params.length !== 1 ||
    param === undefined ||
    param.paramType !== name ||
    param.paramValue.length === 0
  ) {
    throw new Error(`Live Combo Induce parameters differ:${name}`);
  }
  return param.paramValue;
}
