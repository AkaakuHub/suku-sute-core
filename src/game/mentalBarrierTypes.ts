export type MentalBarrier = Readonly<{
  kind: 'endurance' | 'attenuation';
  endurance: number;
  currentEndurance: number;
  attenuation: number;
  remainingSeconds: number | null;
  remainingSections: number | null;
  deactivationKey?: string | null;
}>;

export type MentalBarrierEffect = Readonly<{
  kind: 'mental-barrier';
  barrier: 'endurance' | 'attenuation';
  enduranceType: 'ratio' | 'fixed' | 'infinite';
  endurance: number;
  enduranceMoodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
  attenuation: number;
  attenuationMoodBonus?: Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
  deactivationKey?: string;
  invocationType?: number;
  duration:
    | Readonly<{ kind: 'milliseconds' | 'sections'; value: number }>
    | Readonly<{ kind: 'stage' }>;
}>;

export function validateMentalBarrierEffect(effect: MentalBarrierEffect): void {
  if (
    !Number.isFinite(effect.endurance) ||
    !Number.isFinite(effect.attenuation) ||
    (effect.enduranceMoodBonus !== undefined &&
      (!Number.isFinite(effect.enduranceMoodBonus.perPoint) ||
        ![1, 2, 3].includes(effect.enduranceMoodBonus.target))) ||
    (effect.attenuationMoodBonus !== undefined &&
      (!Number.isFinite(effect.attenuationMoodBonus.perPoint) ||
        ![1, 2, 3].includes(effect.attenuationMoodBonus.target)))
  )
    throw new Error('元気バリアの効果量が正しくありません。');
}
