import type { Card } from './cardTypes.ts';
import type {
  CardSkillVariantMaster,
  ModeAbilityVariant,
  ModeSkillVariant,
  TokenCardSkillMasterData,
} from './cardSkillVariants.ts';
import type { Effect } from '../modelTypes.ts';
import { resolveActionEffect } from './resolveActionEffect.ts';
import { createDrawSuccessInduceEffect } from '../actionTypeEffects/drawSuccessInduce.ts';
import { createOnDrawInduceRule } from '../actionTypeEffects/onDrawInduce.ts';
import { createHandInducer } from '../actionTypeEffects/handInduce.ts';
import { resolveHandPermanentEffects } from '../actionTypeEffects/handPermanent.ts';
import { isInt64 } from '../../runtime/numeric.ts';

export function resolveActionEffects(
  card: Card,
  cardSkillVariants: readonly CardSkillVariantMaster[],
): Card {
  if (!card.actionEffects?.length) return card;
  const { actionEffects, ...resolved } = card;
  let effects = [...resolved.effects];
  let handPermanentEffects = [...(resolved.handPermanentEffects ?? [])];
  let ability893Effects = [...(resolved.ability893Effects ?? [])];
  let drawEffects = [...(resolved.drawEffects ?? [])];
  let drawRules = [...(resolved.drawRules ?? [])];
  let handInducers = [...(resolved.handInducers ?? [])];
  let modeIds = [...(resolved.modeIds ?? [])];
  let modeParameterChanges = resolved.modeParameterChanges;
  let modeSkillChanges = resolved.modeSkillChanges;
  let modeAbilityChanges = resolved.modeAbilityChanges;
  for (const actionEffect of actionEffects) {
    if (actionEffect.actionType === 36) {
      const modeId = detailInt32(actionEffect.details, 'MODE_SKILL_CHANGE_MODE_ID');
      const offSeriesId = detailInt32(
        actionEffect.details,
        'MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_1',
      );
      const onSeriesId = detailInt32(
        actionEffect.details,
        'MODE_SKILL_CHANGE_CARD_SKILL_SERIES_ID_2',
      );
      const off = resolveCardSkillVariant(
        cardSkillVariants,
        offSeriesId,
        actionEffect.skillType,
        actionEffect.skillLevel,
        actionEffect.specialAppealSkillLevel,
        actionEffect.skillSkillLevel,
      );
      const on = resolveCardSkillVariant(
        cardSkillVariants,
        onSeriesId,
        actionEffect.skillType,
        actionEffect.skillLevel,
        actionEffect.specialAppealSkillLevel,
        actionEffect.skillSkillLevel,
      );
      modeIds = [...modeIds, ...(actionEffect.modeIds ?? []), modeId];
      modeParameterChanges = actionEffect.modeParameterChanges ?? modeParameterChanges;
      if (actionEffect.skillType === 3) {
        modeAbilityChanges = {
          modeId,
          off: modeAbilityVariant(off.variant),
          on: modeAbilityVariant(on.variant),
        };
      } else {
        if (actionEffect.skillType !== 1 && actionEffect.skillType !== 2)
          throw new Error('モード切替スキル種別が正しくありません。');
        modeSkillChanges = {
          modeId,
          off: modeSkillVariant(off.variant),
          on: modeSkillVariant(on.variant),
        };
      }
      continue;
    }
    if (actionEffect.actionType === 901) {
      ability893Effects.push(createDrawSuccessInduceEffect(actionEffect));
      continue;
    }
    if (actionEffect.actionType === 902) {
      drawRules.push(createOnDrawInduceRule(actionEffect));
      continue;
    }
    if (actionEffect.actionType === 903) {
      handInducers.push(createHandInducer(actionEffect));
      continue;
    }
    if (actionEffect.actionType === 904) {
      handPermanentEffects.push(...resolveHandPermanentEffects(actionEffect));
      continue;
    }
    const resolvedEffect = resolveActionEffect(actionEffect);
    const effect =
      actionEffect.actionType === 28 && resolvedEffect?.kind === 'token-card'
        ? resolveTokenCardSkillData(resolvedEffect, cardSkillVariants)
        : resolvedEffect;
    if (effect === null) continue;
    if (actionEffect.destination === 'effects') effects.push(effect);
    else handPermanentEffects.push(effect);
  }
  return {
    ...resolved,
    effects,
    ...(modeIds.length > 0 ? { modeIds } : {}),
    ...(modeParameterChanges ? { modeParameterChanges } : {}),
    ...(modeSkillChanges ? { modeSkillChanges } : {}),
    ...(modeAbilityChanges ? { modeAbilityChanges } : {}),
    ...(handPermanentEffects.length > 0 ? { handPermanentEffects } : {}),
    ...(ability893Effects.length > 0 ? { ability893Effects } : {}),
    ...(drawEffects.length > 0 ? { drawEffects } : {}),
    ...(drawRules.length > 0 ? { drawRules } : {}),
    ...(handInducers.length > 0 ? { handInducers } : {}),
  };
}

function resolveTokenCardSkillData(
  effect: Extract<Effect, { kind: 'token-card' }>,
  masters: readonly CardSkillVariantMaster[],
): Extract<Effect, { kind: 'token-card' }> {
  const skillMaster = resolveCardSkillVariant(
    masters,
    effect.skillSeriesId,
    2,
    effect.skillLevel,
    0,
    effect.skillLevel,
  );
  const ability =
    effect.abilitySeriesId === 0
      ? null
      : resolveCardSkillVariant(
          masters,
          effect.abilitySeriesId,
          3,
          effect.abilityLevel,
          0,
          effect.skillLevel,
        );
  const skill = tokenCardSkillData(skillMaster);
  const abilityData = ability === null ? null : tokenCardSkillData(ability);
  return { ...effect, skill, ability: abilityData };
}

function tokenCardSkillData(master: CardSkillVariantMaster): TokenCardSkillMasterData {
  return {
    seriesId: master.seriesId,
    mainEffect: master.seriesMainEffect,
    skillIcon: master.seriesSkillIcon,
    variant: master.variant,
  };
}

function resolveCardSkillVariant(
  masters: readonly CardSkillVariantMaster[],
  seriesId: number,
  skillType: number,
  skillLevel: number,
  specialAppealSkillLevel: number,
  skillSkillLevel: number,
): CardSkillVariantMaster {
  const matches = masters.filter(
    (master) =>
      master.seriesId === seriesId &&
      master.skillType === skillType &&
      master.skillLevel === skillLevel &&
      master.specialAppealSkillLevel === specialAppealSkillLevel &&
      master.skillSkillLevel === skillSkillLevel,
  );
  if (matches.length !== 1) throw new Error('モード切替スキル系列Masterを一意に解決できません。');
  const match = matches[0];
  if (!match) throw new Error('モード切替スキル系列Masterがありません。');
  return match;
}

function modeSkillVariant(variant: ModeSkillVariant | ModeAbilityVariant): ModeSkillVariant {
  if (!('consumeAp' in variant)) throw new Error('モード切替SkillVariantが正しくありません。');
  return variant;
}

function modeAbilityVariant(variant: ModeSkillVariant | ModeAbilityVariant): ModeAbilityVariant {
  if (!('modeEffects' in variant)) throw new Error('モード切替AbilityVariantが正しくありません。');
  return variant;
}

function detailInt32(
  details: readonly Readonly<{ id: bigint; detailType: string; value: bigint }>[],
  detailType: string,
): number {
  const detail = details.find((item) => item.detailType === detailType);
  if (!detail || !isInt64(detail.id) || !isInt64(detail.value))
    throw new Error('モード切替の詳細値がありません。');
  return Number(BigInt.asIntN(32, detail.value));
}
