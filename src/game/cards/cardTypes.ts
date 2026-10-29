import type { LiveTokenCardDeckIdentity } from '../../runtime/cards/tokenCardDeck.ts';
import type { LiveDeckBoardCard } from '../../runtime/cards/deckBoardState.ts';
import type { LiveCardSkillLevel } from '../../runtime/skills/skillTypes.ts';
import type { LiveSkillCardIdentity } from '../../runtime/cards/cardIdentity.ts';
import type { LiveSkillEffect } from '../../runtime/skills/skillTypes.ts';
import type { LiveCardAppealParameters } from '../../runtime/live/clientScoreInput.ts';
import type { PerformerId, MemberId, CostumeId, TokenId } from '../model.ts';
import type { Effect } from '../modelTypes.ts';
import type { MoodBonus, ParameterValueChangeEffect } from '../modelTypes.ts';
import type { SpecialAppealTokenCardSet } from '../specialAppealTokenTypes.ts';
import type { ActionType12Record } from './actionType12Record.ts';
import type { ActionType14Record } from './actionType14Record.ts';
import type { ActionType17Record } from './actionType17Record.ts';
import type { ActionType18Record } from './actionType18Record.ts';
import type { ActionType901Record } from './actionType901Record.ts';
import type { ActionType902Record } from './actionType902Record.ts';
import type { ActionType903Record } from './actionType903Record.ts';
import type { ActionType904Record } from './actionType904Record.ts';
import type { ActionType905Record } from './actionType905Record.ts';
import type { ActionType906Record } from './actionType906Record.ts';
import type { ActionType907Record } from './actionType907Record.ts';
import type { ActionType908Record } from './actionType908Record.ts';
import type { ActionType19Record } from './actionType19Record.ts';
import type { ActionType25Record } from './actionType25Record.ts';
import type { ActionType26Record } from './actionType26Record.ts';
import type { MoodActionRecord } from './moodActionRecord.ts';
export type { HandUseTrigger } from './handUseTrigger.ts';
import type { HandInducer } from './handInducer.ts';
import type { ActionTypeDetail } from './actionTypeDetail.ts';
import type { ModeAbilityVariant, ModeSkillVariant } from './cardSkillVariants.ts';
export type {
  CardSkillVariantMaster,
  ModeAbilityVariant,
  ModeSkillVariant,
  TokenCardSkillMasterData,
} from './cardSkillVariants.ts';

export type ActionType1Record = Readonly<{
  actionType: 1;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType2Record = Readonly<{
  actionType: 2;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType3Record = Readonly<{
  actionType: 3;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType5Record = Readonly<{
  actionType: 5;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType6Record = Readonly<{
  actionType: 6;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType7Record = Readonly<{
  actionType: 7;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType20Record = Readonly<{
  actionType: 20;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType21Record = Readonly<{
  actionType: 21;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType22Record = Readonly<{
  actionType: 22;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType23Record = Readonly<{
  actionType: 23;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType24Record = Readonly<{
  actionType: 24;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  childEffects: readonly Effect[];
  destination: 'effects' | 'handPermanentEffects';
  deactivationKey?: string;
}>;

export type ActionType27Record = Readonly<{
  actionType: 27;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  heartAction: Readonly<{ skillEffectId: bigint; details: readonly ActionTypeDetail[] }>;
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType28Record = Readonly<{
  actionType: 28;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  skillType: number;
  skillLevel: number;
  specialAppealSkillLevel: number;
  skillSkillLevel: number;
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType45Record = Readonly<{
  actionType: 45;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  childEffects: readonly Effect[];
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType46Record = Readonly<{
  actionType: 46;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  childEffects: readonly Readonly<{ actionType: number; effect: Effect }>[];
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType53Record = Readonly<{
  actionType: 53;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  musicGenerationsId: number;
  sourceSkillLevel: number;
  sourceSpecialAppealSkillLevel: number;
  memberOrder: readonly MemberId[];
  tokenCardSets: readonly SpecialAppealTokenCardSet[];
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType36Record = Readonly<{
  actionType: 36;
  details: readonly ActionTypeDetail[];
  skillType: number;
  skillLevel: number;
  specialAppealSkillLevel: number;
  skillSkillLevel: number;
  modeIds?: readonly number[];
  modeParameterChanges?: Readonly<{
    modeId: number;
    off: readonly ParameterValueChangeEffect[];
    on: readonly ParameterValueChangeEffect[];
  }>;
}>;

export type ActionType29Record = Readonly<{
  actionType: 29;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  destination: 'effects' | 'handPermanentEffects';
}>;

export type ActionType40Record = Readonly<{
  actionType: 40;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  deckCardMax: number | null;
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type ActionType41Record = Readonly<{
  actionType: 41;
  skillEffectId: bigint;
  details: readonly ActionTypeDetail[];
  deckCardMax: number;
  childEffects: readonly Readonly<{ actionType: number; effect: Effect }>[];
  destination: 'effects' | 'handPermanentEffects';
  invocationType?: number;
  deactivationKey?: string;
}>;

export type Card = Readonly<{
  name: string;
  costume: CostumeId | null;
  performer: PerformerId | null;
  charactersId: MemberId;
  mood?: number;
  tokenCard?: true;
  appeal: LiveCardAppealParameters;
  beatPoint: number;
  tokenCardAbilitySeriesId?: bigint | null;
  modeIds?: readonly number[];
  modeParameterChanges?: Readonly<{
    modeId: number;
    off: readonly ParameterValueChangeEffect[];
    on: readonly ParameterValueChangeEffect[];
  }>;
  modeSkillChanges?: Readonly<{
    modeId: number;
    off: ModeSkillVariant;
    on: ModeSkillVariant;
  }>;
  modeAbilityChanges?: Readonly<{
    modeId: number;
    off: ModeAbilityVariant;
    on: ModeAbilityVariant;
  }>;
  handPermanentEffects?: readonly Effect[];
  effects: readonly Effect[];
  actionEffects?: readonly (
    | ActionType1Record
    | ActionType2Record
    | ActionType3Record
    | ActionType5Record
    | ActionType6Record
    | ActionType7Record
    | ActionType14Record
    | ActionType17Record
    | ActionType18Record
    | ActionType901Record
    | ActionType902Record
    | ActionType903Record
    | ActionType904Record
    | ActionType905Record
    | ActionType906Record
    | ActionType907Record
    | ActionType908Record
    | ActionType19Record
    | MoodActionRecord<10>
    | MoodActionRecord<11>
    | ActionType12Record
    | MoodActionRecord<13>
    | MoodActionRecord<15>
    | MoodActionRecord<16>
    | ActionType20Record
    | ActionType21Record
    | ActionType22Record
    | ActionType23Record
    | ActionType24Record
    | ActionType25Record
    | ActionType26Record
    | ActionType27Record
    | ActionType28Record
    | ActionType29Record
    | ActionType40Record
    | ActionType41Record
    | MoodActionRecord<30>
    | MoodActionRecord<31>
    | MoodActionRecord<32>
    | MoodActionRecord<33>
    | MoodActionRecord<34>
    | MoodActionRecord<35>
    | ActionType36Record
    | MoodActionRecord<37>
    | MoodActionRecord<38>
    | MoodActionRecord<39>
    | MoodActionRecord<42>
    | MoodActionRecord<43>
    | MoodActionRecord<44>
    | ActionType45Record
    | ActionType46Record
    | ActionType53Record
    | MoodActionRecord<47>
    | MoodActionRecord<48>
    | MoodActionRecord<49>
    | MoodActionRecord<50>
    | MoodActionRecord<56>
    | MoodActionRecord<51>
    | MoodActionRecord<52>
    | MoodActionRecord<54>
    | MoodActionRecord<55>
    | MoodActionRecord<57>
    | MoodActionRecord<58>
  )[];
  ability893Effects?: readonly Effect[];
  ability894Effects?: readonly Effect[];
  drawEffects?: readonly Effect[];
  beforeUseEffects?: readonly Effect[];
  handInducers?: readonly HandInducer[];
  token?: TokenId;
  exhausts?: true;
  special?: Readonly<
    Pick<LiveCardSkillLevel, 'consumeAp'> & { extra: boolean; effects: readonly Effect[] }
  >;
  allHandCost?: Readonly<{
    reductions: readonly Readonly<{ minimumCards: number; amount: number }>[];
  }>;
  onDrawInduceEffects?: readonly LiveSkillEffect[];
  skillIcon?: number;
  passive?: Readonly<{
    heartsPercent?: number;
    handLimitDelta?: number;
    moodBonus?: MoodBonus;
    skillBoost?: Readonly<{
      members: readonly MemberId[];
      percent: number;
      moodBonus?: MoodBonus;
    }>;
  }>;
  drawAbility?:
    | 'clock'
    | 'bookmark'
    | 'story'
    | 'library'
    | 'genesis'
    | 'camera'
    | 'perennial'
    | 'shadow';
  beforeUseAbility?: 'story-boost' | 'rain-echo';
  useAbility?: 'class' | 'shadow';
  collectionEffects?: Readonly<{
    threshold: number;
    effects: readonly Effect[];
    limit?: number;
    limitMemory?: 'reset' | 'retain';
  }>;
}> &
  LiveSkillCardIdentity &
  Pick<LiveCardSkillLevel, 'consumeAp'> &
  Pick<LiveDeckBoardCard<string>, 'cardDatasId'> &
  LiveTokenCardDeckIdentity<string>;
