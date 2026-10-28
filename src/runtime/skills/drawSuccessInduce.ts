import type { LiveConditionContext } from '../live/conditionContext.ts';
import {
  isLiveDrawSuccessConditionSatisfied,
  type LiveDrawSuccessCondition,
} from './drawSuccessCondition.ts';
import type { LiveGenesisState } from './genesisSkill.ts';
import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveDrawSuccessInduce = Readonly<
  LiveDrawSuccessCondition & {
    effectId: string;
    trueEffect: LiveSkillEffect | null;
    falseEffect: LiveSkillEffect | null;
    disabledType: 0 | 1;
  }
>;

const requiredDetailTypes = [
  'DRAW_SUCCESS_INDUCE_BRANCH_TYPE',
  'DRAW_SUCCESS_INDUCE_BRANCH_VALUE',
  'DRAW_SUCCESS_INDUCE_EFFECT_ID1',
  'DRAW_SUCCESS_INDUCE_EFFECT_ID2',
] as const;

export function createLiveDrawSuccessInduce(
  effect: LiveSkillEffect,
  effects: readonly LiveSkillEffect[],
): LiveDrawSuccessInduce {
  if (effect.actionType !== 901) {
    throw new Error('Live DrawSuccessInduce action type differs');
  }
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  const disabledDetail = details.get('DRAW_SUCCESS_INDUCE_DISABLED_TYPE');
  if (
    details.size !== effect.details.length ||
    requiredDetailTypes.some((detailType) => !details.has(detailType)) ||
    effect.details.length !== requiredDetailTypes.length + (disabledDetail ? 1 : 0)
  ) {
    throw new Error('Live DrawSuccessInduce details differ');
  }
  const branchType = requireBranchType(
    requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_BRANCH_TYPE'),
  );
  const disabledValue =
    disabledDetail === undefined
      ? branchType === 3n
        ? 1
        : 0
      : requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_DISABLED_TYPE');
  if (disabledValue !== 0 && disabledValue !== 1) {
    throw new Error('Live DrawSuccessInduce disabled type differs');
  }
  return {
    effectId: effect.id,
    branchType,
    branchValue: BigInt(requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_BRANCH_VALUE')),
    trueEffect: resolveEmbeddedEffect(
      requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_EFFECT_ID1'),
      effects,
    ),
    falseEffect: resolveEmbeddedEffect(
      requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_EFFECT_ID2'),
      effects,
    ),
    disabledType: disabledValue,
  };
}

export function resolveLiveDrawSuccessInduceEffect(
  induce: LiveDrawSuccessInduce,
  input: LiveConditionContext,
  genesis: LiveGenesisState,
): LiveSkillEffect | null {
  return isLiveDrawSuccessConditionSatisfied(induce, input, genesis)
    ? induce.trueEffect
    : induce.falseEffect;
}

export function liveDrawSuccessEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  return new Set(
    effects
      .filter((effect) => effect.actionType === 901)
      .flatMap((effect) => {
        const induce = createLiveDrawSuccessInduce(effect, effects);
        return [induce.trueEffect?.id, induce.falseEffect?.id].filter(
          (effectId): effectId is string => effectId !== undefined,
        );
      }),
  );
}

function requireDetailValue(
  details: ReadonlyMap<string, LiveSkillEffect['details'][number]>,
  detailType: string,
): number {
  const detail = details.get(detailType);
  if (
    detail === undefined ||
    detail.targetMood !== 0 ||
    detail.params.length !== 0 ||
    !Number.isSafeInteger(detail.effectValue)
  ) {
    throw new Error(`Live DrawSuccessInduce ${detailType} differs`);
  }
  return detail.effectValue;
}

function resolveEmbeddedEffect(
  effectId: number,
  effects: readonly LiveSkillEffect[],
): LiveSkillEffect | null {
  if (effectId === 0) return null;
  if (effectId < 0) {
    throw new Error('Live DrawSuccessInduce embedded effect ID differs');
  }
  const matches = effects.filter((effect) => effect.id === String(effectId));
  const effect = matches[0];
  if (matches.length !== 1 || effect === undefined) {
    throw new Error(`Live DrawSuccessInduce embedded effect must resolve once:${String(effectId)}`);
  }
  return effect;
}

function requireBranchType(value: number): LiveDrawSuccessInduce['branchType'] {
  if (value < 1 || value > 7) {
    throw new Error('Live DrawSuccessInduce branch type differs');
  }
  return BigInt(value);
}
