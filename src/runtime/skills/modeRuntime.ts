import type { LiveSkillEffect } from './skillTypes.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveModeState = ReadonlyMap<number, boolean>;

export type LiveModeChangeInduce = Readonly<{
  effectId: string;
  sourceCardInstanceId: number;
  targetModeId: number;
  induceCount: number;
  countParams: readonly number[];
  embeddedEffects: readonly LiveSkillEffect[];
  buffNum: number;
}>;

export type LiveModeChangeInduceState = readonly LiveModeChangeInduce[];

export type LiveModeChangeInduceApplication = Readonly<{
  induceEffectId: string;
  sourceCardInstanceId: number;
  effect: LiveSkillEffect;
  power: LiveSkillEffectPower;
}>;

export function createLiveModeState(effects: readonly LiveSkillEffect[]): LiveModeState {
  const modeIds = effects.flatMap((effect) => {
    if (effect.actionType === 35) return [requireChangeModeDetails(effect).modeId];
    if (effect.actionType === 36) return [requireLiveModeSkillChange(effect).modeId];
    if (effect.actionType === 45) return [requireModeChangeInduceDetails(effect).targetModeId];
    return [];
  });
  return new Map([...new Set(modeIds)].map((modeId) => [modeId, false]));
}

export function changeLiveMode(
  state: LiveModeState,
  effect: LiveSkillEffect,
): Readonly<{ state: LiveModeState; changedModeId: number | null }> {
  if (effect.actionType !== 35) {
    throw new Error('Live Change Mode action type differs');
  }
  const { modeId, changeType } = requireChangeModeDetails(effect);
  const current = state.get(modeId);
  if (current === undefined) {
    throw new Error(`Live Change Mode target is absent:${String(modeId)}`);
  }
  const next = changeType === 1 ? false : changeType === 2 ? true : !current;
  if (next === current) return { state, changedModeId: null };
  const modes = new Map(state);
  modes.set(modeId, next);
  return { state: modes, changedModeId: modeId };
}

export function createLiveModeChangeInduceState(): LiveModeChangeInduceState {
  return [];
}

export function liveModeChangeInduceEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  return new Set(
    effects
      .filter((effect) => effect.actionType === 45)
      .flatMap((effect) => requireModeChangeInduceDetails(effect).effectIds),
  );
}

export function activateLiveModeChangeInduce(
  state: LiveModeChangeInduceState,
  effect: LiveSkillEffect,
  allEffects: readonly LiveSkillEffect[],
  sourceCardInstanceId: number,
): LiveModeChangeInduceState {
  if (effect.actionType !== 45) {
    throw new Error('Live Mode Change Induce action type differs');
  }
  const details = requireModeChangeInduceDetails(effect);
  if (details.countParams.length !== details.effectIds.length) {
    throw new Error('Live Mode Change Induce params length differs');
  }
  const embeddedEffects = details.effectIds.map((effectId) => {
    const matches = allEffects.filter((candidate) => candidate.id === effectId);
    const embedded = matches[0];
    if (matches.length !== 1 || embedded === undefined) {
      throw new Error(`Live Mode Change Induce embedded effect must resolve once:${effectId}`);
    }
    return embedded;
  });
  return [
    ...state,
    {
      effectId: effect.id,
      sourceCardInstanceId,
      targetModeId: details.targetModeId,
      induceCount: 0,
      countParams: details.countParams,
      embeddedEffects,
      buffNum: details.buffNum,
    },
  ];
}

export function notifyLiveModeChanged(
  state: LiveModeChangeInduceState,
  modes: LiveModeState,
  modeId: number,
): Readonly<{
  state: LiveModeChangeInduceState;
  applications: readonly LiveModeChangeInduceApplication[];
}> {
  if (modes.get(modeId) !== true) return { state, applications: [] };
  const applications: LiveModeChangeInduceApplication[] = [];
  const next = state.map((induce) => {
    if (induce.targetModeId !== modeId) return induce;
    const induceCount = induce.induceCount + 1;
    for (let index = 0; index < induce.countParams.length; index += 1) {
      const countParam = induce.countParams[index];
      const embeddedEffect = induce.embeddedEffects[index];
      if (
        countParam === undefined ||
        embeddedEffect === undefined ||
        induceCount % countParam !== 0
      ) {
        continue;
      }
      const scalesWithCount = [1, 2, 5, 10].includes(embeddedEffect.actionType);
      applications.push({
        induceEffectId: induce.effectId,
        sourceCardInstanceId: induce.sourceCardInstanceId,
        effect: embeddedEffect,
        power: {
          addValue: 0,
          multiplyFactor: 1,
          effectPower: scalesWithCount
            ? Math.ceil(
                Math.fround(Math.fround(induce.buffNum * induceCount) / Math.fround(10_000)),
              )
            : 1,
        },
      });
    }
    return { ...induce, induceCount };
  });
  return { state: next, applications };
}

export function deactivateLiveModeChangeInduce(
  state: LiveModeChangeInduceState,
  effectId: string,
  sourceCardInstanceId: number,
): LiveModeChangeInduceState {
  return state.filter(
    (effect) =>
      effect.effectId !== effectId || effect.sourceCardInstanceId !== sourceCardInstanceId,
  );
}

export function requireLiveModeSkillChange(effect: LiveSkillEffect) {
  if (effect.actionType !== 36) {
    throw new Error('Live Mode Skill Change action type differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'MODE_SKILL_CHANGE_MODE_ID',
      'MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_1',
      'MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_2',
    ],
    'Mode Skill Change',
  );
  const value = (name: string) =>
    requireLiveSkillEffectDetailValue(details, name, 'Mode Skill Change');
  const result = {
    modeId: value('MODE_SKILL_CHANGE_MODE_ID'),
    offSkillSeriesId: value('MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_1'),
    onSkillSeriesId: value('MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_2'),
  };
  if (Object.values(result).some((entry) => !Number.isSafeInteger(entry) || entry <= 0)) {
    throw new Error('Live Mode Skill Change detail value differs');
  }
  return result;
}

function requireChangeModeDetails(effect: LiveSkillEffect) {
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['CHANGE_MODE_TYPE', 'CHANGE_MODE_ID'],
    'Change Mode',
  );
  const value = (name: string) => requireLiveSkillEffectDetailValue(details, name, 'Change Mode');
  const result = {
    changeType: value('CHANGE_MODE_TYPE'),
    modeId: value('CHANGE_MODE_ID'),
  };
  if (
    ![1, 2, 3].includes(result.changeType) ||
    !Number.isSafeInteger(result.modeId) ||
    result.modeId <= 0
  ) {
    throw new Error('Live Change Mode detail value differs');
  }
  return result;
}

function requireModeChangeInduceDetails(effect: LiveSkillEffect) {
  const expectedTypes = new Set([
    'MODE_CHANGE_INDUCE_TARGET_MODE_ID',
    'MODE_CHANGE_INDUCE_COUNT_PARAMS_ID',
    'MODE_CHANGE_INDUCE_EFFECT_PARAMS_ID',
    'MODE_CHANGE_INDUCE_BUFF_NUM',
  ]);
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    effect.details.length !== expectedTypes.size ||
    details.size !== expectedTypes.size ||
    effect.details.some(
      (detail) =>
        !expectedTypes.has(detail.detailType) ||
        detail.targetMood !== 0 ||
        !Number.isSafeInteger(detail.effectValue) ||
        (detail.detailType.endsWith('_PARAMS_ID')
          ? detail.params.length !== 1
          : detail.params.length !== 0),
    )
  ) {
    throw new Error('Live Mode Change Induce skill effect details differ');
  }
  const value = (name: string) =>
    requireLiveSkillEffectDetailValue(details, name, 'Mode Change Induce');
  const result = {
    targetModeId: value('MODE_CHANGE_INDUCE_TARGET_MODE_ID'),
    countParams: requireIntegerParams(
      details.get('MODE_CHANGE_INDUCE_COUNT_PARAMS_ID'),
      'MODE_CHANGE_INDUCE_COUNT_PARAMS_ID',
    ),
    effectIds: requireIntegerParams(
      details.get('MODE_CHANGE_INDUCE_EFFECT_PARAMS_ID'),
      'MODE_CHANGE_INDUCE_EFFECT_PARAMS_ID',
    ).map(String),
    buffNum: value('MODE_CHANGE_INDUCE_BUFF_NUM'),
  };
  if (
    result.targetModeId <= 0 ||
    result.buffNum < 0 ||
    result.countParams.some((count) => count <= 0)
  ) {
    throw new Error('Live Mode Change Induce detail value differs');
  }
  return result;
}

function requireIntegerParams(
  detail: LiveSkillEffect['details'][number] | undefined,
  paramType: string,
): readonly number[] {
  const params = detail?.params.filter((param) => param.paramType === paramType);
  const param = params?.[0];
  if (params?.length !== 1 || param === undefined) {
    throw new Error(`Live Mode Change Induce param differs:${paramType}`);
  }
  const values = param.paramValue.split(',').map(Number);
  if (values.length === 0 || values.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error(`Live Mode Change Induce param value differs:${paramType}`);
  }
  return values;
}
