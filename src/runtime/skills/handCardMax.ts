import { liveMaximumHandCardCount } from './handCardCount.ts';
import type { LiveSkillEffect } from './skillTypes.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

const handCardMaxDetailTypes = [
  'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE',
  'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME',
] as const;

export type LiveHandCardMaxEffect = Readonly<{
  effectId: string;
  displayTimeType: 'full-end';
  displayTime: 0;
}>;

export function createLiveHandCardMaxEffect(effect: LiveSkillEffect): LiveHandCardMaxEffect {
  if (effect.actionType !== 54) {
    throw new Error('Live hand card max action type is invalid');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    handCardMaxDetailTypes,
    'HandCardMax',
  );
  const displayTimeType = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME_TYPE',
    'HandCardMax',
  );
  if (displayTimeType !== 3) {
    throw new Error('Live hand card max display time type is invalid');
  }
  const displayTime = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_HAND_CARD_TO_MAX_SKILL_DISPLAY_TIME',
    'HandCardMax',
  );
  if (displayTime !== 0) {
    throw new Error('Live hand card max display time is invalid');
  }
  return {
    effectId: effect.id,
    displayTimeType: 'full-end',
    displayTime: 0,
  };
}

export function resolveLiveHandCardMaxActivation(
  currentHandCount: number,
): Readonly<{ addCount: number; targetHandCount: 8 }> {
  if (
    !Number.isSafeInteger(currentHandCount) ||
    currentHandCount < 0 ||
    currentHandCount > liveMaximumHandCardCount
  ) {
    throw new Error('Live hand card count is invalid');
  }
  return {
    addCount: liveMaximumHandCardCount - currentHandCount,
    targetHandCount: liveMaximumHandCardCount,
  };
}
