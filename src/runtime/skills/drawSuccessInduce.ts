import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveDrawSuccessInduce = Readonly<{
  effectId: string;
  branchType: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  branchValue: number;
  trueEffect: LiveSkillEffect | null;
  falseEffect: LiveSkillEffect | null;
  disabledType: 0 | 1;
}>;

export type LiveDrawSuccessInduceInput = Readonly<{
  genesisActive: boolean;
  mentalRatio: number;
  moodValue: number | null;
  voltageLevel: number;
  currentSection: number;
  feverSection: number;
}>;

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
      ? branchType === 3
        ? 1
        : 0
      : requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_DISABLED_TYPE');
  if (disabledValue !== 0 && disabledValue !== 1) {
    throw new Error('Live DrawSuccessInduce disabled type differs');
  }
  return {
    effectId: effect.id,
    branchType,
    branchValue: requireDetailValue(details, 'DRAW_SUCCESS_INDUCE_BRANCH_VALUE'),
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
  input: LiveDrawSuccessInduceInput,
): LiveSkillEffect | null {
  validateInput(input);
  const condition = (() => {
    switch (induce.branchType) {
      case 1:
      case 3:
        return true;
      case 2:
        return (
          input.genesisActive ||
          Math.fround(input.mentalRatio) <= Math.fround(induce.branchValue / 1_000_000)
        );
      case 4:
        return requireMoodValue(input.moodValue) <= induce.branchValue;
      case 5:
        return input.genesisActive || input.voltageLevel <= induce.branchValue / 10_000;
      case 6:
        return input.currentSection + 1 <= induce.branchValue;
      case 7:
        return resolveSectionNumber(input) === induce.branchValue;
    }
  })();
  return condition ? induce.trueEffect : induce.falseEffect;
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
  return value as LiveDrawSuccessInduce['branchType'];
}

function resolveSectionNumber(
  input: Pick<LiveDrawSuccessInduceInput, 'currentSection' | 'feverSection'>,
): number {
  if (input.currentSection === input.feverSection) return 99;
  return input.currentSection - (input.currentSection > input.feverSection ? 1 : 0) + 1;
}

function requireMoodValue(value: number | null): number {
  if (value === null) {
    throw new Error('Live DrawSuccessInduce mood is unresolved');
  }
  return value;
}

function validateInput(input: LiveDrawSuccessInduceInput): void {
  if (
    !Number.isFinite(input.mentalRatio) ||
    input.mentalRatio < 0 ||
    !Number.isSafeInteger(input.voltageLevel) ||
    input.voltageLevel < 0 ||
    !Number.isSafeInteger(input.currentSection) ||
    input.currentSection < 0 ||
    !Number.isSafeInteger(input.feverSection) ||
    input.feverSection < 0 ||
    (input.moodValue !== null && !Number.isSafeInteger(input.moodValue))
  ) {
    throw new Error('Live DrawSuccessInduce input differs');
  }
}
