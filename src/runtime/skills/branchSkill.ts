import {
  type LiveConditionContext,
  liveConditionVoltageLevel,
  liveConditionMoodValue,
  liveConditionSectionNumber,
  liveConditionRatioThreshold,
  liveConditionMoodType,
} from '../live/conditionContext.ts';
import { liveMentalRatio } from '../live/mentalGauge.ts';
import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveBranchSkill = Readonly<{
  effectId: string;
  branchType: LiveBranchType;
  branchValue: number;
  targetParams: readonly number[];
  trueEffect: LiveSkillEffect | null;
  falseEffect: LiveSkillEffect | null;
}>;

type LiveBranchType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

const requiredDetailTypes = [
  'BRANCH_TYPE',
  'BRANCH_VALUE',
  'BRANCH_EFFECT_ID1',
  'BRANCH_EFFECT_ID2',
] as const;

export function createLiveBranchSkill(
  effect: LiveSkillEffect,
  effects: readonly LiveSkillEffect[],
): LiveBranchSkill {
  if (effect.actionType !== 12) {
    throw new Error('Live Branch action type differs');
  }
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  const targetDetails = effect.details.filter(
    (detail) => detail.detailType === 'BRANCH_TARGET_PARAMS',
  );
  if (
    details.size !== effect.details.length ||
    requiredDetailTypes.some((detailType) => !details.has(detailType)) ||
    effect.details.length !== requiredDetailTypes.length + targetDetails.length ||
    targetDetails.length > 1
  ) {
    throw new Error('Live Branch skill effect details differ');
  }
  const branchType = requireBranchType(requireIntegerDetail(details, 'BRANCH_TYPE'));
  const branchValue = requireIntegerDetail(details, 'BRANCH_VALUE');
  const targetParams = resolveTargetParams(targetDetails[0]);
  if ((branchType === 9 || branchType === 10) !== targetParams.length > 0) {
    throw new Error('Live Branch target parameters differ');
  }
  return {
    effectId: effect.id,
    branchType,
    branchValue,
    targetParams,
    trueEffect: resolveEmbeddedEffect(requireIntegerDetail(details, 'BRANCH_EFFECT_ID1'), effects),
    falseEffect: resolveEmbeddedEffect(requireIntegerDetail(details, 'BRANCH_EFFECT_ID2'), effects),
  };
}

export function resolveLiveBranchEffect(
  branch: LiveBranchSkill,
  input: LiveConditionContext,
): LiveSkillEffect | null {
  return isLiveBranchConditionSatisfied(branch, input) ? branch.trueEffect : branch.falseEffect;
}

export function resolveLiveBranchLeafEffect(
  effect: LiveSkillEffect,
  effects: readonly LiveSkillEffect[],
  input: LiveConditionContext,
): LiveSkillEffect | null {
  let current: LiveSkillEffect | null = effect;
  const visited = new Set<string>();
  while (current?.actionType === 12) {
    if (visited.has(current.id)) {
      throw new Error(`Live Branch effect cycle detected:${current.id}`);
    }
    visited.add(current.id);
    current = resolveLiveBranchEffect(createLiveBranchSkill(current, effects), input);
  }
  return current;
}

export function liveBranchEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  return new Set(
    effects
      .filter((effect) => effect.actionType === 12)
      .flatMap((effect) => {
        const branch = createLiveBranchSkill(effect, effects);
        return [branch.trueEffect?.id, branch.falseEffect?.id].filter(
          (effectId): effectId is string => effectId !== undefined,
        );
      }),
  );
}

export function isLiveBranchConditionSatisfied(
  branch: LiveBranchSkill,
  input: LiveConditionContext,
): boolean {
  validateInput(input);
  switch (branch.branchType) {
    case 1:
      return liveConditionVoltageLevel(input) >= branch.branchValue;
    case 2:
      return (
        liveMentalRatio(input.mental, input.maximumMental) >=
        liveConditionRatioThreshold(branch.branchValue)
      );
    case 3:
      return liveConditionMoodValue(input) >= branch.branchValue;
    case 4:
      return input.currentSection + 1 >= branch.branchValue;
    case 5:
      return liveConditionSectionNumber(input) === branch.branchValue;
    case 6:
      return input.cardTotal >= branch.branchValue;
    case 7:
      return input.deckCount >= branch.branchValue;
    case 8:
      return input.graveyardCount >= branch.branchValue;
    case 9:
      return input.tokenCardSeriesCount(branch.targetParams) >= branch.branchValue;
    case 10:
      return input.memberFanLevelTotal(branch.targetParams) >= branch.branchValue;
    case 11:
      return input.beatHeartValue >= branch.branchValue / 10_000;
    case 12:
      return liveConditionMoodType(input) === branch.branchValue;
    case 13:
      return input.exclusionCount >= branch.branchValue;
    default:
      throw new Error('Live Branch type is invalid');
  }
}

function requireBranchType(value: number): LiveBranchType {
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
      return value;
    default:
      throw new Error('Live Branch type is invalid');
  }
}

function requireIntegerDetail(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  detailType: string,
): number {
  const detail = details.get(detailType);
  if (
    detail === undefined ||
    !Number.isSafeInteger(detail.effectValue) ||
    detail.params.length !== 0
  ) {
    throw new Error(`Live Branch detail is invalid:${detailType}`);
  }
  return detail.effectValue;
}

function resolveTargetParams(
  detail: LiveSkillEffect['details'][number] | undefined,
): readonly number[] {
  if (detail === undefined) return [];
  if (detail.params.length !== 1) {
    throw new Error('Live Branch target parameters differ');
  }
  const param = detail.params[0];
  if (param === undefined || param.paramType !== 'BRANCH_TARGET_PARAMS') {
    throw new Error('Live Branch target parameter type differs');
  }
  const values = param.paramValue.split(',').map(Number);
  if (values.length === 0 || values.some((value) => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error('Live Branch target parameter is invalid');
  }
  return values;
}

function resolveEmbeddedEffect(
  effectId: number,
  effects: readonly LiveSkillEffect[],
): LiveSkillEffect | null {
  if (effectId === 0) return null;
  if (!Number.isSafeInteger(effectId) || effectId < 0) {
    throw new Error('Live Branch embedded effect ID is invalid');
  }
  const matches = effects.filter((effect) => effect.id === String(effectId));
  const effect = matches[0];
  if (matches.length !== 1 || effect === undefined) {
    throw new Error(`Live Branch embedded effect must resolve once:${String(effectId)}`);
  }
  return effect;
}

function validateInput(input: LiveConditionContext): void {
  for (const value of [
    input.maximumVoltageLevel,
    input.maximumMental,
    input.currentSection,
    ...(input.feverSection === null ? [] : [input.feverSection]),
    input.cardTotal,
    input.deckCount,
    input.graveyardCount,
    input.exclusionCount,
  ]) {
    if (!Number.isSafeInteger(value)) {
      throw new Error('Live Branch condition input is invalid');
    }
  }
  if (
    (input.moodValue !== null && !Number.isSafeInteger(input.moodValue)) ||
    !Number.isFinite(liveMentalRatio(input.mental, input.maximumMental)) ||
    liveMentalRatio(input.mental, input.maximumMental) < 0 ||
    !Number.isFinite(input.beatHeartValue) ||
    input.beatHeartValue < 0
  ) {
    throw new Error('Live Branch condition input is invalid');
  }
}
