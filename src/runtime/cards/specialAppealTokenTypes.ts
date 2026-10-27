import type { LiveSkillEffect } from '../skills/skillTypes.ts';

export type LiveSpecialAppealTokenTargetType = 'song-period';
export type LiveSpecialAppealTokenLevelType = 'none' | 'special-appeal-level' | 'skill-level';

export type LiveSpecialAppealTokenEffect = Readonly<{
  effectId: string;
  tokenSetId: number;
  coolTimeSeconds: number;
  targetType: LiveSpecialAppealTokenTargetType;
  levelType: LiveSpecialAppealTokenLevelType;
}>;

export type LiveSpecialAppealTokenCardSetRecord = Readonly<{
  id: number;
  specialAppealTokenSetId: number;
  specialAppealTokenResourceId: number;
  targetParameter: number;
  skillSeriesId: number;
  mood: number;
  style: number;
}>;

export type LiveSpecialAppealTokenSkillLevel = Readonly<{
  skillLevel: number;
  consumeAp: number;
  appearanceType: number;
  effects: readonly LiveSkillEffect[];
}>;

export type LiveSpecialAppealTokenSkill = Readonly<{
  seriesId: number;
  mainEffect: number;
  skillIcon: number;
  levels: readonly LiveSpecialAppealTokenSkillLevel[];
}>;

export type LiveSpecialAppealTokenDeckEffect =
  | Readonly<{
      kind: 'reshuffle';
      recoveryType: 'no-recovery' | 'recovery';
      stashType: 'graveyard' | 'deck';
    }>
  | Readonly<{
      kind: 'card-search';
      searchType: 'skill-main-effect' | 'character-id' | 'unit-id' | 'token-card-series';
      searchId: number;
    }>;

export type LiveDeckMemberPosition = Readonly<{
  generationsId: number;
  charactersId: number;
  orderId: number;
}>;

export type LiveSpecialAppealTokenState = Readonly<{
  coolTimeSeconds: number;
  remainCoolTimeSeconds: number;
  generationsId: number;
  tokenCardSetRecord: LiveSpecialAppealTokenCardSetRecord;
}>;

export type LiveSpecialAppealTokenModel = Readonly<{
  token: LiveSpecialAppealTokenState;
  skillSeriesId: number;
  mainEffect: number;
  skillIcon: number;
  skillLevel: number;
  consumeAp: number;
  appearanceType: number;
  effects: readonly LiveSkillEffect[];
  deckEffects: readonly LiveSpecialAppealTokenDeckEffect[];
  mood: number;
  style: number;
}>;

export type LiveSpecialAppealTokenActivation = Readonly<{
  token: LiveSpecialAppealTokenState;
  currentAp: number;
}>;
