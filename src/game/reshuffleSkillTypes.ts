export type ReshuffleSkillEffect = Readonly<{
  kind: 'reshuffle-skill';
  recoveryType: bigint;
  stashType: bigint;
}>;

export function validateReshuffleSkillEffect(effect: ReshuffleSkillEffect): void {
  if (
    effect.recoveryType < -(1n << 63n) ||
    effect.recoveryType >= 1n << 63n ||
    effect.stashType < -(1n << 63n) ||
    effect.stashType >= 1n << 63n
  )
    throw new Error('引き直しスキルの設定が正しくありません。');
}
