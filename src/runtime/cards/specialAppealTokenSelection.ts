import type { LiveDeckCardSearchParam } from './deckBoardState.ts';
import { createLiveCardSearchEffect, createLiveReshuffleEffect } from './deckSkillActions.ts';
import type { LiveSkillEffect } from '../skills/skillTypes.ts';

import type { LiveSpecialAppealTokenLevelType } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenEffect } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenCardSetRecord } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenSkill } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenDeckEffect } from './specialAppealTokenTypes.ts';
import type { LiveDeckMemberPosition } from './specialAppealTokenTypes.ts';
import type { LiveSpecialAppealTokenModel } from './specialAppealTokenTypes.ts';
import { createLiveSpecialAppealTokenState } from './specialAppealToken.ts';

export function resolveLiveSpecialAppealTokenCardSearchParam(
  effect: Extract<LiveSpecialAppealTokenDeckEffect, Readonly<{ kind: 'card-search' }>>,
): LiveDeckCardSearchParam {
  return {
    searchType: effect.searchType,
    searchId: effect.searchId,
  };
}

export function resolveLiveSpecialAppealTokenCharacterOrder(
  positions: readonly LiveDeckMemberPosition[],
  generationsId: number,
): readonly number[] {
  return positions
    .filter((position) => position.generationsId === generationsId)
    .toSorted((left, right) => left.orderId - right.orderId)
    .map((position) => position.charactersId);
}

export function resolveLiveSpecialAppealTokenDeckEffects(
  effects: readonly LiveSkillEffect[],
): readonly LiveSpecialAppealTokenDeckEffect[] {
  return [...effects]
    .sort((left, right) => left.orderId - right.orderId || left.id.localeCompare(right.id))
    .flatMap((effect) => {
      switch (effect.actionType) {
        case 13:
          return [resolveReshuffleEffect(effect)];
        case 15:
          return [resolveCardSearchEffect(effect)];
        default:
          return [];
      }
    });
}

export function selectLiveSpecialAppealTokenCardSets(
  input: Readonly<{
    records: readonly LiveSpecialAppealTokenCardSetRecord[];
    tokenSetId: number;
    positions: readonly LiveDeckMemberPosition[];
    generationsId: number;
  }>,
): readonly LiveSpecialAppealTokenCardSetRecord[] {
  const characterIdOrder = resolveLiveSpecialAppealTokenCharacterOrder(
    input.positions,
    input.generationsId,
  );
  const selected = input.records
    .filter((record) => record.specialAppealTokenSetId === input.tokenSetId)
    .filter((record) => characterIdOrder.includes(record.targetParameter))
    .toSorted(
      (left, right) =>
        characterIdOrder.indexOf(left.targetParameter) -
        characterIdOrder.indexOf(right.targetParameter),
    );
  if (selected.length !== characterIdOrder.length) {
    throw new Error(
      `Live Special Appeal token CardSets must resolve for every character in generation ${String(input.generationsId)}`,
    );
  }
  if (new Set(selected.map((record) => record.targetParameter)).size !== selected.length) {
    throw new Error('Live Special Appeal token CardSets TargetParameter is duplicated');
  }
  return selected;
}

export function createLiveSpecialAppealTokenModels(
  input: Readonly<{
    effect: LiveSpecialAppealTokenEffect;
    records: readonly LiveSpecialAppealTokenCardSetRecord[];
    positions: readonly LiveDeckMemberPosition[];
    generationsId: number;
    levels: readonly LiveSpecialAppealTokenSkill[];
    specialAppealLevel: number;
    skillLevel: number;
  }>,
): readonly LiveSpecialAppealTokenModel[] {
  if (input.effect.levelType === 'none') {
    throw new Error(
      'Live Special Appeal token NONE level is not supported by the verified runtime contract',
    );
  }
  const records = selectLiveSpecialAppealTokenCardSets({
    records: input.records,
    tokenSetId: input.effect.tokenSetId,
    positions: input.positions,
    generationsId: input.generationsId,
  });
  const tokenLevel = resolveLiveSpecialAppealTokenSkillLevel(input.effect.levelType, {
    specialAppealLevel: input.specialAppealLevel,
    skillLevel: input.skillLevel,
  });
  if (tokenLevel === null) {
    throw new Error('Live Special Appeal token level is unresolved');
  }
  return records.map((record) => {
    const skills = input.levels.filter((skill) => skill.seriesId === record.skillSeriesId);
    const skill = skills[0];
    if (skills.length !== 1 || skill === undefined) {
      throw new Error(
        `Live Special Appeal token SkillSeries.Id=${String(record.skillSeriesId)} must resolve once`,
      );
    }
    const skillLevels = skill.levels.filter((level) => level.skillLevel === tokenLevel);
    const level = skillLevels[0];
    if (skillLevels.length !== 1 || level === undefined) {
      throw new Error(
        `Live Special Appeal token SkillSeries.Id=${String(record.skillSeriesId)} level=${String(tokenLevel)} must resolve once`,
      );
    }
    return {
      token: createLiveSpecialAppealTokenState({
        coolTimeSeconds: input.effect.coolTimeSeconds,
        generationsId: input.generationsId,
        tokenCardSetRecord: record,
      }),
      skillSeriesId: skill.seriesId,
      mainEffect: skill.mainEffect,
      skillIcon: skill.skillIcon,
      skillLevel: level.skillLevel,
      consumeAp: level.consumeAp,
      appearanceType: level.appearanceType,
      effects: level.effects,
      deckEffects: resolveLiveSpecialAppealTokenDeckEffects(level.effects),
      mood: record.mood,
      style: record.style,
    };
  });
}

export function orderLiveSpecialAppealTokenModelsForSelection(
  models: readonly LiveSpecialAppealTokenModel[],
): readonly LiveSpecialAppealTokenModel[] {
  const ordered = [...models].sort(
    (left, right) =>
      left.token.tokenCardSetRecord.specialAppealTokenResourceId -
      right.token.tokenCardSetRecord.specialAppealTokenResourceId,
  );
  if (
    new Set(ordered.map((model) => model.token.tokenCardSetRecord.specialAppealTokenResourceId))
      .size !== ordered.length
  ) {
    throw new Error('Live Special Appeal token card ID must resolve exactly once');
  }
  return ordered;
}

function resolveReshuffleEffect(effect: LiveSkillEffect): LiveSpecialAppealTokenDeckEffect {
  const resolved = createLiveReshuffleEffect(effect);
  return {
    kind: 'reshuffle',
    recoveryType: resolved.recoveryType,
    stashType: resolved.stashType,
  };
}

function resolveCardSearchEffect(effect: LiveSkillEffect): LiveSpecialAppealTokenDeckEffect {
  const resolved = createLiveCardSearchEffect(effect);
  return {
    kind: 'card-search',
    searchType: resolved.searchType,
    searchId: resolved.searchId,
  };
}

export function resolveLiveSpecialAppealTokenSkillLevel(
  levelType: LiveSpecialAppealTokenLevelType,
  levels: Readonly<{
    specialAppealLevel: number;
    skillLevel: number;
  }>,
): number | null {
  if (
    !Number.isSafeInteger(levels.specialAppealLevel) ||
    levels.specialAppealLevel < 1 ||
    !Number.isSafeInteger(levels.skillLevel) ||
    levels.skillLevel < 1
  ) {
    throw new Error('Live Special Appeal token skill level is invalid');
  }
  switch (levelType) {
    case 'none':
      return null;
    case 'special-appeal-level':
      return levels.specialAppealLevel;
    case 'skill-level':
      return levels.skillLevel;
  }
}

export function validateTokenCardSetRecord(record: LiveSpecialAppealTokenCardSetRecord): void {
  for (const value of [
    record.id,
    record.specialAppealTokenSetId,
    record.specialAppealTokenResourceId,
    record.targetParameter,
    record.skillSeriesId,
    record.mood,
    record.style,
  ]) {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new Error('Live Special Appeal token CardSets record is invalid');
    }
  }
}
