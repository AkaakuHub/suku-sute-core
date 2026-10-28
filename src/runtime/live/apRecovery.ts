import { floatToInt32 } from '../numeric.ts';
import type { LiveSkillEffectPower } from '../skills/skillEffectPower.ts';

export function calculateLiveApRecoveryValue(
  baseValue: number,
  power: LiveSkillEffectPower,
  applySkillBoost: (value: number) => number,
): number {
  const added = Math.fround(Math.fround(baseValue) + Math.fround(power.addValue));
  const multiplied = Math.fround(added * Math.fround(power.multiplyFactor));
  const powered = Math.fround(multiplied * Math.fround(power.effectPower));
  const boosted = Math.fround(applySkillBoost(powered));
  return boosted === Number.POSITIVE_INFINITY ? -2_147_483_648 : floatToInt32(boosted);
}
