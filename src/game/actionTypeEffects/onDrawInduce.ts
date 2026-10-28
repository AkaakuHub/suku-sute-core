import type { LiveSkillEffect } from '../../runtime/skills/skillTypes.ts';
import { createLiveOnDrawInduceEffect } from '../../runtime/cards/onDrawInduceEffect.ts';
import { isInt64 } from '../../runtime/numeric.ts';
import type { ActionType902Record } from '../cards/actionType902Record.ts';

export function createOnDrawInduceEffect(input: ActionType902Record): LiveSkillEffect {
  if (!isInt64(input.skillEffectId)) throw new Error('スキル効果IDが正しくありません。');
  const value = (detailType: string) => {
    const details = input.details.filter((detail) => detail.detailType === detailType);
    const detail = details[0];
    if (details.length !== 1 || !detail || !isInt64(detail.id) || !isInt64(detail.value))
      throw new Error('ドロー確率の詳細値が正しくありません。');
    return Number(BigInt.asIntN(32, detail.value));
  };
  return createLiveOnDrawInduceEffect(String(input.skillEffectId), {
    probabilityType: value('ON_DRAW_INDUCE_PROBABILITY_TYPE'),
    probabilityValue: value('ON_DRAW_INDUCE_PROBABILITY_NUM'),
    conditionType: value('ON_DRAW_INDUCE_CONDITION_TYPE'),
    conditionNotFlag: value('ON_DRAW_INDUCE_CONDITION_NOT_FLAG'),
    conditionValue: value('ON_DRAW_INDUCE_CONDITION_VALUE'),
  });
}
