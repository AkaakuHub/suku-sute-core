import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveEffectInduceAbility = Readonly<{
  effectId: string;
  targetEffect: 1 | 2;
  thresholdType: 0 | 1 | 2;
  thresholdValue: number;
  inducedEffect: LiveSkillEffect;
}>;

export type LiveEffectInduceCondition = Readonly<{
  mentalBarrierActive: boolean;
  mentalBarrierRemainingEndurance: number;
  loveUpActive: boolean;
  loveUpBonusScoreValue: number;
}>;

export type LiveEffectInduceEntry = Readonly<{
  cardInstanceId: number;
  parentEffectId: string;
  inducedEffect: LiveSkillEffect;
  active: boolean;
}>;

export type LiveEffectInduceTransition = Readonly<{
  state: readonly LiveEffectInduceEntry[];
  activated: readonly LiveEffectInduceEntry[];
  deactivated: readonly LiveEffectInduceEntry[];
}>;

const detailTypes = [
  'EFFECT_INDUCE_TARGET_EFFECT',
  'EFFECT_INDUCE_THRESHOLD_TYPE',
  'EFFECT_INDUCE_THRESHOLD_NUM',
  'EFFECT_INDUCE_EFFECT_ID1',
] as const;

export function createLiveEffectInduceAbility(
  effect: LiveSkillEffect,
  effects: readonly LiveSkillEffect[],
): LiveEffectInduceAbility {
  if (effect.actionType !== 907) {
    throw new Error('Live EffectInduce action type differs');
  }
  const details = new Map(effect.details.map((detail) => [detail.detailType, detail]));
  if (
    effect.details.length !== detailTypes.length ||
    details.size !== detailTypes.length ||
    detailTypes.some((detailType) => !details.has(detailType))
  ) {
    throw new Error('Live EffectInduce details differ');
  }
  const targetEffect = requireEnum(
    requireDetailValue(details, 'EFFECT_INDUCE_TARGET_EFFECT'),
    [1, 2],
    'target effect',
  );
  const thresholdType = requireEnum(
    requireDetailValue(details, 'EFFECT_INDUCE_THRESHOLD_TYPE'),
    [0, 1, 2],
    'threshold type',
  );
  const inducedEffectId = requireDetailValue(details, 'EFFECT_INDUCE_EFFECT_ID1');
  if (inducedEffectId <= 0) {
    throw new Error('Live EffectInduce embedded effect ID differs');
  }
  const matches = effects.filter((candidate) => candidate.id === String(inducedEffectId));
  const inducedEffect = matches[0];
  if (matches.length !== 1 || inducedEffect === undefined) {
    throw new Error(
      `Live EffectInduce embedded effect must resolve once:${String(inducedEffectId)}`,
    );
  }
  return {
    effectId: effect.id,
    targetEffect,
    thresholdType,
    thresholdValue: Math.fround(
      requireDetailValue(details, 'EFFECT_INDUCE_THRESHOLD_NUM') / 10_000,
    ),
    inducedEffect,
  };
}

export function isLiveEffectInduceConditionActive(
  ability: LiveEffectInduceAbility,
  condition: LiveEffectInduceCondition,
): boolean {
  validateCondition(condition);
  if (ability.targetEffect === 1) {
    if (!condition.mentalBarrierActive) return false;
    if (condition.mentalBarrierRemainingEndurance < 0 && ability.thresholdType !== 2) {
      return false;
    }
    return checkThreshold(
      ability.thresholdType,
      ability.thresholdValue,
      condition.mentalBarrierRemainingEndurance,
    );
  }
  if (!condition.loveUpActive) return false;
  return checkThreshold(
    ability.thresholdType,
    ability.thresholdValue,
    condition.loveUpBonusScoreValue,
  );
}

export function liveEffectInduceEmbeddedSkillEffectIds(
  effects: readonly LiveSkillEffect[],
): ReadonlySet<string> {
  return new Set(
    effects
      .filter((effect) => effect.actionType === 907)
      .map((effect) => createLiveEffectInduceAbility(effect, effects).inducedEffect.id),
  );
}

export function advanceLiveEffectInduceState(
  state: readonly LiveEffectInduceEntry[],
  abilities: readonly Readonly<{
    cardInstanceId: number;
    effects: readonly LiveSkillEffect[];
  }>[],
  condition: LiveEffectInduceCondition,
): LiveEffectInduceTransition {
  const expected = abilities.flatMap((card) =>
    card.effects
      .filter((effect) => effect.actionType === 907)
      .map((effect) => {
        const ability = createLiveEffectInduceAbility(effect, card.effects);
        return {
          cardInstanceId: card.cardInstanceId,
          parentEffectId: effect.id,
          inducedEffect: ability.inducedEffect,
          active: isLiveEffectInduceConditionActive(ability, condition),
        };
      }),
  );
  const current = new Map(state.map((entry) => [entryKey(entry), entry]));
  if (current.size !== state.length) {
    throw new Error('Live EffectInduce state is duplicated');
  }
  const expectedKeys = new Set(expected.map(entryKey));
  if (expectedKeys.size !== expected.length) {
    throw new Error('Live EffectInduce abilities are duplicated');
  }
  return {
    state: expected,
    activated: expected.filter(
      (entry) => entry.active && current.get(entryKey(entry))?.active !== true,
    ),
    deactivated: state.filter(
      (entry) =>
        entry.active &&
        expected.find((candidate) => entryKey(candidate) === entryKey(entry))?.active !== true,
    ),
  };
}

function checkThreshold(type: 0 | 1 | 2, threshold: number, value: number): boolean {
  if (type === 0) return true;
  if (type === 1) return value >= threshold;
  return value <= threshold;
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
    throw new Error(`Live EffectInduce ${detailType} differs`);
  }
  return detail.effectValue;
}

function requireEnum<const Value extends number>(
  value: number,
  values: readonly Value[],
  label: string,
): Value {
  const resolved = values.find((candidate) => candidate === value);
  if (resolved === undefined) {
    throw new Error(`Live EffectInduce ${label} differs`);
  }
  return resolved;
}

function validateCondition(condition: LiveEffectInduceCondition): void {
  if (
    !Number.isFinite(condition.mentalBarrierRemainingEndurance) ||
    condition.mentalBarrierRemainingEndurance < -1 ||
    !Number.isFinite(condition.loveUpBonusScoreValue)
  ) {
    throw new Error('Live EffectInduce condition differs');
  }
}

function entryKey(entry: LiveEffectInduceEntry): string {
  return `${String(entry.cardInstanceId)}:${entry.parentEffectId}:${entry.inducedEffect.id}`;
}
