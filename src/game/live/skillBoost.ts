import { applyPercentBuffs } from '../parameters/buffs.ts';

export function applyStarGatherSkillBoost(value: number, boostPercent: number): number {
  if (!Number.isFinite(value)) throw new Error('StarGather SkillBoost value is invalid');
  if (value <= 0) return value;
  return Math.fround(applyPercentBuffs(value, [boostPercent]));
}
