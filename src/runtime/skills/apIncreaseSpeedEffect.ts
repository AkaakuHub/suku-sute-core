import type { LiveSkillEffect } from './skillTypes.ts';
import {
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export type LiveApIncreaseSpeedChange = Readonly<{
  calculationType: 1 | 2;
  num: bigint;
  bonusMoodTarget: 0 | 1 | 2 | 3;
  bonusMoodValue: bigint;
  displayTimeType: bigint;
  displayTime: bigint;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function readLiveApIncreaseSpeedChange(effect: LiveSkillEffect): LiveApIncreaseSpeedChange {
  if (effect.actionType !== 21) throw new Error('Live AP increase speed action is invalid');
  const details = requireLiveSkillEffectDetails(
    effect.details,
    [
      'CHANGE_AP_INCREASE_SPEED_CALC_TYPE',
      'CHANGE_AP_INCREASE_SPEED_NUM',
      'CHANGE_AP_INCREASE_SPEED_NUM_BONUS_MOOD',
      'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME_TYPE',
      'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME',
    ],
    'AP increase speed',
  );
  const calculationType = requireLiveSkillEffectDetailValue(
    details,
    'CHANGE_AP_INCREASE_SPEED_CALC_TYPE',
    'AP increase speed',
  );
  const bonusMood = details.get('CHANGE_AP_INCREASE_SPEED_NUM_BONUS_MOOD');
  if (
    (calculationType !== 1 && calculationType !== 2) ||
    bonusMood === undefined ||
    (bonusMood.targetMood !== 0 &&
      bonusMood.targetMood !== 1 &&
      bonusMood.targetMood !== 2 &&
      bonusMood.targetMood !== 3)
  )
    throw new Error('Live AP increase speed details are invalid');
  return {
    calculationType,
    num: BigInt(
      requireLiveSkillEffectDetailValue(
        details,
        'CHANGE_AP_INCREASE_SPEED_NUM',
        'AP increase speed',
      ),
    ),
    bonusMoodTarget: bonusMood.targetMood,
    bonusMoodValue: BigInt(bonusMood.effectValue),
    displayTimeType: BigInt(
      requireLiveSkillEffectDetailValue(
        details,
        'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME_TYPE',
        'AP increase speed',
      ),
    ),
    displayTime: BigInt(
      requireLiveSkillEffectDetailValue(
        details,
        'CHANGE_AP_INCREASE_SPEED_DISPLAY_TIME',
        'AP increase speed',
      ),
    ),
  };
}
