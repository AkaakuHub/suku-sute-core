import type { LiveTokenCardAbilityLevelReference, LiveTokenCardEffect } from './deckActionTypes.ts';
import type { LiveCardSkillSeries, LiveSkillEffect } from '../skills/skillTypes.ts';

export type LiveTokenCardSkillSource = Readonly<{
  skillType: 1 | 2 | 3;
  skillLevel: number;
  specialAppealSkillLevel: number;
  skillSkillLevel: number;
}>;

export type LiveGeneratedTokenCardSkill = Readonly<{
  seriesId: number;
  name: string;
  mainEffect: number;
  skillIcon: number;
  skillLevel: number;
  consumeAp: number;
  appearanceType: number;
  description: string;
  effects: readonly LiveSkillEffect[];
}>;

export type LiveGeneratedTokenCard = Readonly<{
  cardDatasId: number;
  charactersId: 0;
  unitIds: readonly [];
  rarity: 0;
  styleType: number;
  moodType: number;
  slotNo: 1;
  tokenCardSeriesIds: readonly number[];
  skill: LiveGeneratedTokenCardSkill;
  ability: LiveGeneratedTokenCardSkill;
}>;

export function createLiveGeneratedTokenCard(
  effect: LiveTokenCardEffect,
  source: LiveTokenCardSkillSource,
  seriesList: readonly LiveCardSkillSeries[],
): LiveGeneratedTokenCard {
  validateSource(source);
  const skillLevel = resolveLiveTokenCardSkillLevel(effect.abilityLevelReference, source);
  return {
    cardDatasId: effect.resourceId,
    charactersId: 0,
    unitIds: [],
    rarity: 0,
    styleType: effect.styleType,
    moodType: effect.moodType,
    slotNo: 1,
    tokenCardSeriesIds: effect.tokenCardSeriesIds,
    skill: resolveSkill(seriesList, effect.skillCardSkillSeriesId, skillLevel),
    ability: resolveSkill(seriesList, effect.abilityCardSkillSeriesId, 1),
  };
}

export function resolveLiveTokenCardSkillLevel(
  reference: LiveTokenCardAbilityLevelReference,
  source: LiveTokenCardSkillSource,
): number {
  validateSource(source);
  if (source.skillType !== 3) return source.skillLevel;
  const referencedLevel =
    reference === 'special-appeal'
      ? source.specialAppealSkillLevel
      : reference === 'skill'
        ? source.skillSkillLevel
        : source.skillLevel;
  return referencedLevel === 0 ? source.skillLevel : referencedLevel;
}

function resolveSkill(
  seriesList: readonly LiveCardSkillSeries[],
  seriesId: number,
  skillLevel: number,
): LiveGeneratedTokenCardSkill {
  const matchingSeries = seriesList.filter((series) => series.seriesId === seriesId);
  const series = matchingSeries[0];
  if (matchingSeries.length !== 1 || series === undefined) {
    throw new Error(`Live token CardSkillSeriesを一意に解決できません:${String(seriesId)}`);
  }
  const matchingLevels = series.levels.filter((level) => level.skillLevel === skillLevel);
  const level = matchingLevels[0];
  if (matchingLevels.length !== 1 || level === undefined) {
    throw new Error(
      `Live token CardSkill levelを一意に解決できません:${String(seriesId)}:${String(skillLevel)}`,
    );
  }
  return {
    seriesId,
    name: series.name,
    mainEffect: series.mainEffect,
    skillIcon: series.skillIcon,
    skillLevel,
    consumeAp: level.consumeAp,
    appearanceType: level.appearanceType,
    description: level.description,
    effects: level.effects,
  };
}

function validateSource(source: LiveTokenCardSkillSource): void {
  if (
    ![1, 2, 3].includes(source.skillType) ||
    !Number.isSafeInteger(source.skillLevel) ||
    source.skillLevel < 1 ||
    !Number.isSafeInteger(source.specialAppealSkillLevel) ||
    source.specialAppealSkillLevel < 0 ||
    !Number.isSafeInteger(source.skillSkillLevel) ||
    source.skillSkillLevel < 0
  ) {
    throw new Error('Live token card skill source is invalid');
  }
}
