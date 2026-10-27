import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveParamValueBuff = Readonly<{
  cardInstanceId: number;
  sourceEffectId: string;
  targetDetailId: string;
  factor: number;
}>;

export type LiveParamValueBuffState = readonly LiveParamValueBuff[];

export function activateLiveChangeParamValueAbility(
  state: LiveParamValueBuffState,
  cardInstanceId: number,
  effect: LiveSkillEffect,
  input: Readonly<{
    skillLevel: number;
    memberFanLevels: readonly Readonly<{
      characterId: number;
      memberFanLevel: number;
    }>[];
  }>,
): LiveParamValueBuffState {
  if (!Number.isSafeInteger(cardInstanceId) || cardInstanceId <= 0) {
    throw new Error('Live ChangeParamValue card instance ID is invalid');
  }
  if (!Number.isSafeInteger(input.skillLevel) || input.skillLevel <= 0) {
    throw new Error('Live ChangeParamValue skill level is invalid');
  }
  const resolved = resolveLiveChangeParamValueAbility(effect, input);
  const targetKey = normalizeLiveParamDetailId(resolved.targetDetailId);
  return [
    ...state.filter(
      (buff) =>
        buff.cardInstanceId !== cardInstanceId ||
        normalizeLiveParamDetailId(buff.targetDetailId) !== targetKey,
    ),
    {
      cardInstanceId,
      sourceEffectId: effect.id,
      targetDetailId: resolved.targetDetailId,
      factor: resolved.factor,
    },
  ];
}

export function deactivateLiveChangeParamValueAbility(
  state: LiveParamValueBuffState,
  cardInstanceId: number,
  sourceEffectId: string,
): LiveParamValueBuffState {
  return state.filter(
    (buff) => buff.cardInstanceId !== cardInstanceId || buff.sourceEffectId !== sourceEffectId,
  );
}

export function applyLiveParamValueBuffs(
  effects: readonly LiveSkillEffect[],
  state: LiveParamValueBuffState,
  cardInstanceId: number,
): readonly LiveSkillEffect[] {
  const buffs = new Map(
    state
      .filter((buff) => buff.cardInstanceId === cardInstanceId)
      .map((buff) => [normalizeLiveParamDetailId(buff.targetDetailId), buff.factor]),
  );
  if (buffs.size === 0) return effects;
  return effects.map((effect) => ({
    ...effect,
    details: effect.details.map((detail) => {
      const factor = buffs.get(normalizeLiveParamDetailId(detail.id));
      return factor === undefined
        ? detail
        : { ...detail, effectValue: Math.ceil(detail.effectValue * factor) };
    }),
  }));
}

export function resolveLiveChangeParamValueAbility(
  effect: LiveSkillEffect,
  input: Readonly<{
    skillLevel: number;
    memberFanLevels: readonly Readonly<{
      characterId: number;
      memberFanLevel: number;
    }>[];
  }>,
): Readonly<{ targetDetailId: string; factor: number }> {
  if (effect.actionType !== 18) {
    throw new Error('Live ChangeParamValue action type is invalid');
  }
  const names = [
    'CHANGE_PARAM_VALUE_CALC_TYPE',
    'CHANGE_PARAM_VALUE_BASE_NUM',
    'CHANGE_PARAM_VALUE_ADD_NUM',
    'CHANGE_PARAM_VALUE_MULTIPLY_PARAMS_ID',
    'CHANGE_PARAM_VALUE_ACTION_ID',
  ] as const;
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    details.size !== names.length ||
    effect.details.length !== names.length ||
    names.some((name) => !details.has(name)) ||
    effect.details.some(
      (detail) => detail.targetMood !== 0 || !Number.isSafeInteger(detail.effectValue),
    )
  ) {
    throw new Error('Live ChangeParamValue skill effect details differ');
  }
  const calcType = requireDetail(details, names[0]).effectValue;
  const baseValue = requireDetail(details, names[1]).effectValue;
  const addValue = requireDetail(details, names[2]).effectValue;
  const multiplyParams = requireDetail(details, names[3]);
  const actionId = requireDetail(details, names[4]);
  for (const detail of [
    requireDetail(details, names[0]),
    requireDetail(details, names[1]),
    requireDetail(details, names[2]),
    actionId,
  ]) {
    if (detail.params.length !== 0) {
      throw new Error('Live ChangeParamValue detail params differ');
    }
  }
  if (!Number.isSafeInteger(actionId.effectValue) || actionId.effectValue <= 0) {
    throw new Error('Live ChangeParamValue action ID is invalid');
  }
  const factor = (() => {
    switch (calcType) {
      case 1:
        if (multiplyParams.effectValue !== 0 || multiplyParams.params.length !== 0) {
          throw new Error('Live ChangeParamValue ADD params differ');
        }
        return addFactor(baseValue, addValue, input.skillLevel);
      case 2:
        return multiplyFactor(multiplyParams, input.skillLevel);
      case 3:
        return fanLevelFactor(baseValue, addValue, multiplyParams, input.memberFanLevels);
      default:
        throw new Error('Live ChangeParamValue calculation type is invalid');
    }
  })();
  return { targetDetailId: String(actionId.effectValue), factor };
}

function addFactor(baseValue: number, addValue: number, skillLevel: number): number {
  return Math.fround(
    Math.fround(baseValue / 10_000) + Math.fround(Math.fround(addValue / 10_000) * skillLevel),
  );
}

function multiplyFactor(detail: LiveSkillEffect['details'][number], skillLevel: number): number {
  const values = requireSingleParamValues(
    detail,
    'CHANGE_PARAM_VALUE_ACTION_ID',
    'Live ChangeParamValue MULTIPLY params differ',
  );
  const value = values[skillLevel - 1];
  if (value === undefined) {
    throw new Error('Live ChangeParamValue skill level params are absent');
  }
  return Math.fround(1 + Math.fround(Math.fround(value / 10_000) / 10_000));
}

function fanLevelFactor(
  baseValue: number,
  addValue: number,
  detail: LiveSkillEffect['details'][number],
  memberFanLevels: readonly Readonly<{
    characterId: number;
    memberFanLevel: number;
  }>[],
): number {
  const [characterId] = requireSingleParamValues(
    detail,
    'CHANGE_PARAM_VALUE_MULTIPLY_PARAMS_ID',
    'Live ChangeParamValue FAN_LV params differ',
  );
  if (characterId === undefined || characterId <= 0) {
    throw new Error('Live ChangeParamValue FAN_LV character ID is invalid');
  }
  const matches = memberFanLevels.filter((entry) => entry.characterId === characterId);
  const memberFanLevel = matches[0]?.memberFanLevel;
  if (
    matches.length !== 1 ||
    memberFanLevel === undefined ||
    !Number.isSafeInteger(memberFanLevel) ||
    memberFanLevel < 0
  ) {
    throw new Error(`Live member fan level must resolve once:${String(characterId)}`);
  }
  return Math.fround(
    Math.fround(baseValue / 10_000) + Math.fround(Math.fround(addValue / 10_000) * memberFanLevel),
  );
}

function requireSingleParamValues(
  detail: LiveSkillEffect['details'][number],
  paramType: string,
  message: string,
): readonly number[] {
  const param = detail.params[0];
  if (
    detail.params.length !== 1 ||
    param === undefined ||
    param.paramType !== paramType ||
    !/^-?\d+(?:,-?\d+)*$/u.test(param.paramValue)
  )
    throw new Error(message);
  const values = param.paramValue.split(',').map(Number);
  if (values.some((value) => !Number.isSafeInteger(value))) {
    throw new Error(message);
  }
  return values;
}

function requireDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  name: string,
): LiveSkillEffect['details'][number] {
  const detail = details.get(name);
  if (detail === undefined) {
    throw new Error(`Live ChangeParamValue detail is absent:${name}`);
  }
  return detail;
}

function normalizeLiveParamDetailId(detailId: string): string {
  if (!/^[1-9]\d{4,}$/u.test(detailId)) {
    throw new Error('Live parameter detail ID is invalid');
  }
  const value = BigInt(detailId);
  return String((value / 10_000n) * 10_000n + (value % 100n));
}
