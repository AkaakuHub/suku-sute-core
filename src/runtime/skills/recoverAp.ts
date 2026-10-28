import {
  calculateLiveSkillEffectValue,
  type LiveSkillEffectDetail,
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';

export function calculateLiveRecoverApSkillValue(
  effect: Readonly<{
    id: string;
    actionType: number;
    details: readonly LiveSkillEffectDetail[];
  }>,
  currentMoodValue: number,
): number {
  if (!/^[1-9]\d*$/.test(effect.id) || effect.actionType !== 14) {
    throw new Error('Live AP recovery skill effect contract differs');
  }
  const details = requireLiveSkillEffectDetails(
    effect.details,
    ['RECOVER_AP_NUM_BASE', 'RECOVER_AP_NUM_BONUS_MOOD'],
    'AP recovery',
  );
  const bonusMood = details.get('RECOVER_AP_NUM_BONUS_MOOD');
  if (bonusMood === undefined) {
    throw new Error('Live AP recovery bonus mood detail is absent');
  }
  return Math.trunc(
    calculateLiveSkillEffectValue(
      requireLiveSkillEffectDetailValue(details, 'RECOVER_AP_NUM_BASE', 'AP recovery'),
      bonusMood,
      currentMoodValue,
    ),
  );
}
