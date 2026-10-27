export type LiveSkillEffectPower = Readonly<{
  addValue: number;
  multiplyFactor: number;
  effectPower: number;
}>;

export function validateLiveSkillEffectPower(power: LiveSkillEffectPower, label: string): void {
  if (
    label.length === 0 ||
    ![power.addValue, power.multiplyFactor, power.effectPower].every(Number.isFinite)
  ) {
    throw new Error(`Live ${label} power is invalid`);
  }
}
