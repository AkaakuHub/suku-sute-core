import type { LiveSkillEffect } from './skillTypes.ts';

const directReferenceDetailTypes = new Map<number, ReadonlySet<string>>([
  [12, new Set(['BRANCH_EFFECT_ID1', 'BRANCH_EFFECT_ID2'])],
  [27, new Set(['GET_ADDITIONAL_HEART_EFFECT_ID'])],
  [901, new Set(['DRAW_SUCCESS_INDUCE_EFFECT_ID1', 'DRAW_SUCCESS_INDUCE_EFFECT_ID2'])],
  [904, new Set(['HAND_PERMANENT_EFFECT_ID1'])],
  [907, new Set(['EFFECT_INDUCE_EFFECT_ID1'])],
]);

const parameterReferenceDetailTypes = new Map<number, ReadonlySet<string>>([
  [24, new Set(['COMBO_INDUCE_EFFECT_PARAMS'])],
  [41, new Set(['INDUCE_SKILL_EFFECT_PARAMS_ID'])],
  [45, new Set(['MODE_CHANGE_INDUCE_EFFECT_PARAMS_ID'])],
]);

export function liveEmbeddedSkillEffectReferenceIds(effect: LiveSkillEffect): ReadonlySet<string> {
  const references = new Set<string>();
  const directTypes = directReferenceDetailTypes.get(effect.actionType);
  const parameterTypes = parameterReferenceDetailTypes.get(effect.actionType);
  for (const detail of effect.details) {
    if (directTypes?.has(detail.detailType) === true) {
      if (!Number.isSafeInteger(detail.effectValue) || detail.effectValue < 0) {
        throw new Error('Live embedded effect reference differs');
      }
      if (detail.effectValue > 0) references.add(String(detail.effectValue));
    }
    if (parameterTypes?.has(detail.detailType) === true) {
      const parameter = detail.params[0];
      if (detail.params.length !== 1 || parameter?.paramType !== detail.detailType) {
        throw new Error('Live embedded effect reference params differ');
      }
      const ids = parameter.paramValue.split(',');
      if (
        ids.length === 0 ||
        ids.some((id) => !/^[1-9]\d*$/.test(id)) ||
        new Set(ids).size !== ids.length
      ) {
        throw new Error('Live embedded effect reference IDs differ');
      }
      for (const id of ids) references.add(id);
    }
  }
  return references;
}
