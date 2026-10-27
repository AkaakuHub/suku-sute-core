import type { TokenKind } from './model.ts';
import type { TokenCardSkillMasterData } from './cards/cardTypes.ts';

export type TokenTemplateReference =
  | Readonly<{ kind: 'token-kind'; token: TokenKind }>
  | Readonly<{ kind: 'action-token-card'; effect: TokenCardEffect }>;

export type TokenRequest = Readonly<{
  template: TokenTemplateReference;
  count: number;
  seriesIds?: readonly bigint[];
}>;

export type TokenCardEffect = Readonly<{
  kind: 'token-card';
  resourceId: number;
  count: bigint;
  style: number;
  mood: number;
  skillSeriesId: number;
  skillLevel: number;
  abilitySeriesId: number;
  abilityLevel: 1;
  sourceSkillType: number;
  sourceSkillLevel: number;
  sourceSpecialAppealSkillLevel: number;
  sourceSkillSkillLevel: number;
  skill?: TokenCardSkillMasterData;
  ability?: TokenCardSkillMasterData | null;
  seriesIds?: readonly bigint[];
  parameterDetails?: Readonly<Record<string, { id: bigint; value: bigint; unitsPerValue: number }>>;
}>;

export function validateTokenCardEffect(effect: TokenCardEffect): undefined {
  if (
    !isInt32(effect.resourceId) ||
    ![
      effect.style,
      effect.mood,
      effect.skillSeriesId,
      effect.skillLevel,
      effect.abilitySeriesId,
      effect.sourceSkillType,
      effect.sourceSkillLevel,
      effect.sourceSpecialAppealSkillLevel,
      effect.sourceSkillSkillLevel,
    ].every(isInt32) ||
    !effect.skill ||
    effect.skill.seriesId !== effect.skillSeriesId ||
    !isInt32(effect.skill.mainEffect) ||
    !isInt32(effect.skill.skillIcon) ||
    effect.ability === undefined ||
    (effect.abilitySeriesId === 0
      ? effect.ability !== null
      : effect.ability === null || effect.ability.seriesId !== effect.abilitySeriesId) ||
    (effect.ability !== null &&
      (!isInt32(effect.ability.mainEffect) || !isInt32(effect.ability.skillIcon))) ||
    effect.count < -(1n << 63n) ||
    effect.count >= 1n << 63n ||
    effect.seriesIds?.some((id) => id < -(1n << 63n) || id >= 1n << 63n) ||
    Object.values(effect.parameterDetails ?? {}).some(
      (detail) =>
        detail.id < -(1n << 63n) ||
        detail.id >= 1n << 63n ||
        detail.value < -(1n << 63n) ||
        detail.value >= 1n << 63n ||
        detail.unitsPerValue !== 1,
    )
  )
    throw new Error('追加カードデータの設定が正しくありません。');
  return undefined;
}

function isInt32(value: number): boolean {
  return Number.isInteger(value) && value >= -2_147_483_648 && value <= 2_147_483_647;
}
