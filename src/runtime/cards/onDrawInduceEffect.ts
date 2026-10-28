import type { LiveSkillEffect } from '../skills/skillTypes.ts';
import { resolveLiveOnDrawInduceValues, type LiveOnDrawInduceValues } from './cardDraw.ts';

export function createLiveOnDrawInduceEffect(
  id: string,
  values: LiveOnDrawInduceValues,
): LiveSkillEffect {
  const details = [
    ['ON_DRAW_INDUCE_PROBABILITY_TYPE', values.probabilityType],
    ['ON_DRAW_INDUCE_PROBABILITY_NUM', values.probabilityValue],
    ['ON_DRAW_INDUCE_CONDITION_TYPE', values.conditionType],
    ['ON_DRAW_INDUCE_CONDITION_NOT_FLAG', values.conditionNotFlag],
    ['ON_DRAW_INDUCE_CONDITION_VALUE', values.conditionValue],
  ] as const;
  const effect: LiveSkillEffect = {
    id,
    actionType: 902,
    orderId: 0,
    details: details.map(([detailType, effectValue], index) => ({
      id: `${id}:${index}`,
      detailType,
      effectValue,
      targetMood: 0,
      params: [],
    })),
  };
  resolveLiveOnDrawInduceValues(effect);
  return effect;
}
