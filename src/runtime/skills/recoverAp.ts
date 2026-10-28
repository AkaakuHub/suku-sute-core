import {
  type LiveSkillEffectDetail,
  requireLiveSkillEffectDetails,
  requireLiveSkillEffectDetailValue,
} from './skillEffectValue.ts';
import { calculateLiveSkillMoodCorrection } from '../live/skillMood.ts';
import { calculateLiveApRecoveryValue } from '../live/apRecovery.ts';
import { int64ToFloat32 } from '../numeric.ts';
import type { LiveSkillEffectPower } from './skillEffectPower.ts';

export function calculateLiveRecoverApSkillValue(
  effect: Readonly<{
    id: string;
    actionType: number;
    details: readonly LiveSkillEffectDetail[];
  }>,
  input: Readonly<{
    currentMoodValue: number;
    power: LiveSkillEffectPower;
    applySkillBoost: (value: number) => number;
  }>,
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
  const base = Math.fround(
    int64ToFloat32(
      BigInt(requireLiveSkillEffectDetailValue(details, 'RECOVER_AP_NUM_BASE', 'AP recovery')),
    ) / 10000,
  );
  const mood = calculateLiveSkillMoodCorrection(
    bonusMood.targetMood,
    input.currentMoodValue,
    Math.fround(int64ToFloat32(BigInt(bonusMood.effectValue)) / 10000),
  );
  return calculateLiveApRecoveryValue(Math.fround(base + mood), input.power, input.applySkillBoost);
}
