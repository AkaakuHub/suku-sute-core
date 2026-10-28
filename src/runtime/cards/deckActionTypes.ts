import type { LiveChangeSkillCostValue } from '../skills/changeSkillCostValue.ts';
import { type LiveAdditionalBuffTarget } from '../skills/additionalBuffTarget.ts';

import { type LiveSkillEffectDuration } from '../skills/skillEffectDuration.ts';

export type LiveReshuffleEffect = Readonly<{
  effectId: string;
  recoveryType: 'no-recovery' | 'recovery';
  stashType: 'graveyard' | 'deck';
}>;

export type LiveCardSearchEffect = Readonly<{
  effectId: string;
  searchType: 'skill-main-effect' | 'character-id' | 'unit-id' | 'token-card-series';
  searchId: number;
}>;

export type LiveChangeApConditionType =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15;

export type LiveChangeApEffect = Readonly<
  LiveChangeSkillCostValue & {
    effectId: string;
    conditionId: number;
    duration: LiveSkillEffectDuration;
  }
>;

export type LiveCardMoveEffect = Readonly<{
  effectId: string;
  destination: 'deck' | 'exclusion';
}>;

export type LiveHandCardCountEffect = Readonly<{
  effectId: string | null;
  calculationType: number;
  amount: number;
  duration: LiveSkillEffectDuration;
}>;

export type LiveTokenCardAbilityLevelReference = 'none' | 'special-appeal' | 'skill';

export type LiveTokenCardEffect = Readonly<{
  effectId: string;
  resourceId: number;
  styleType: number;
  moodType: number;
  skillCardSkillSeriesId: number;
  abilityCardSkillSeriesId: number;
  cardCount: number;
  abilityLevelReference: LiveTokenCardAbilityLevelReference;
  tokenCardSeriesIds: readonly number[];
}>;

export type LiveBoostTokenCardEffect = Readonly<{
  effectId: string;
  calculation: 'multiply' | 'add';
  amount: number;
  duration: LiveSkillEffectDuration;
  disabled: Readonly<{ kind: 'none' } | { kind: 'use-count'; count: number }>;
  target: LiveAdditionalBuffTarget;
  tokenCardSeriesId: number;
}>;

export type LiveUseAllHandEffect = Readonly<{
  effectId: string;
  addAp: number;
}>;

export type LiveSwitchTokenCardDeckEffect = Readonly<{
  effectId: string;
  tokenCardSeriesId: number;
  duration: LiveSkillEffectDuration;
}>;
