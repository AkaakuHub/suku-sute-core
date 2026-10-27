export type SkillCooldownDuration =
  | Readonly<{ kind: 'milliseconds'; value: number }>
  | Readonly<{ kind: 'sections'; value: bigint }>
  | Readonly<{ kind: 'stage'; value: number }>;

export type SkillCooldownEffect = Readonly<{
  id: number;
  num: number;
  deckUnderAdd: number;
  deckOverAdd: number;
  deckUnderLimit: number;
  deckOverLimit: number;
  deckCardMax: number | null;
  deckCardCountAtActivation: number;
  duration: SkillCooldownDuration;
  updatesWithDeckCount: boolean;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;

export type SkillCooldownEffectInput = Readonly<{
  kind: 'skill-cooldown';
  num: number;
  deckUnderAdd: number;
  deckOverAdd: number;
  deckUnderLimit: number;
  deckOverLimit: number;
  deckCardMax: number | null;
  duration: SkillCooldownDuration;
  invocationType?: number;
  deactivationKey?: string;
}>;

export function validateSkillCooldownEffect(effect: SkillCooldownEffectInput): void {
  if (
    !Number.isSafeInteger(effect.num) ||
    !Number.isSafeInteger(effect.deckUnderAdd) ||
    !Number.isSafeInteger(effect.deckOverAdd) ||
    !Number.isSafeInteger(effect.deckUnderLimit) ||
    !Number.isSafeInteger(effect.deckOverLimit) ||
    (effect.duration.kind === 'sections'
      ? effect.duration.value === 0n
      : !Number.isSafeInteger(effect.duration.value)) ||
    ((effect.deckUnderAdd !== 0 || effect.deckOverAdd !== 0) &&
      (effect.deckCardMax === null ||
        !Number.isSafeInteger(effect.deckCardMax) ||
        effect.deckCardMax < 1)) ||
    (effect.deckCardMax !== null &&
      (!Number.isSafeInteger(effect.deckCardMax) || effect.deckCardMax < 1)) ||
    (effect.invocationType !== undefined && !Number.isSafeInteger(effect.invocationType)) ||
    (effect.deactivationKey !== undefined && typeof effect.deactivationKey !== 'string')
  )
    throw new Error('スキルクールタイムの設定が正しくありません。');
}
