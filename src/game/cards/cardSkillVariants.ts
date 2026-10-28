import type { LiveCardSkillLevel } from '../../runtime/skills/skillTypes.ts';
import type { Effect } from '../modelTypes.ts';

export type ModeSkillVariant = Readonly<
  Pick<LiveCardSkillLevel, 'consumeAp'> & {
    effects: readonly Effect[];
    skillIcon: number | null;
    special: Readonly<
      Pick<LiveCardSkillLevel, 'consumeAp'> & { extra: boolean; effects: readonly Effect[] }
    > | null;
  }
>;

export type ModeAbilityVariant = Readonly<{
  modeEffects: readonly Effect[];
  ability893Effects: readonly Effect[];
  ability894Effects: readonly Effect[];
}>;

export type CardSkillVariantMaster = Readonly<{
  skillType: number;
  seriesId: number;
  skillLevel: number;
  specialAppealSkillLevel: number;
  skillSkillLevel: number;
  seriesMainEffect: number;
  seriesSkillIcon: number;
  variant: ModeSkillVariant | ModeAbilityVariant;
}>;

export type TokenCardSkillMasterData = Readonly<{
  seriesId: number;
  mainEffect: number;
  skillIcon: number;
  variant: ModeSkillVariant | ModeAbilityVariant;
}>;
