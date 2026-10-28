import type { LiveChangeSkillCostValue } from '../runtime/skills/changeSkillCostValue.ts';
import type { SkillCooldownEffectInput } from './skillCooldownTypes.ts';
import type { InduceSkillEffectInput, InduceEffect } from './induceSkillEffectTypes.ts';
import type { DisableMentalDownEffect } from './disableMentalDownTypes.ts';
import type { MentalBarrierAdditionalBuffEffect } from './mentalBarrierAdditionalBuffTypes.ts';
import type { MentalRecoverAdditionalBuffEffect } from './mentalRecoverAdditionalBuffTypes.ts';
import type { VoltageUpAdditionalBuffEffect } from './voltageUpAdditionalBuffTypes.ts';
import type { LoveUpAdditionalBuffEffect } from './loveUpAdditionalBuffTypes.ts';
import type { DeckSkillCostChangeEffect, SkillCostChangeEffect } from './skillCostChangeTypes.ts';
export type { SkillCostChangeEffect } from './skillCostChangeTypes.ts';
import type { TokenCardEffect } from './tokenRequestTypes.ts';
import type { GameCondition } from './conditions/model.ts';
import type { ModeChange } from './live/modes.ts';
import type { MemberId, TokenId, UnitId } from './model.ts';
import type { StopVoltageIncreaseEffect, VoltageConvertEffect } from './voltageConversionTypes.ts';
import type { Action52BuffEffect } from './skillBoostTypes.ts';
import type { MentalHeartInduceEffect } from './mentalHeartInduceTypes.ts';
import type { AdditionalHeartInduceEffect } from './additionalHeartTypes.ts';
import type { ProxyForcedActivationEffect, ProxySkillEffect } from './proxySkillTypes.ts';
import type { MoodChangeSkillEffect } from './moodChangeSkillTypes.ts';
import type { BeatHeartValueBuffEffect } from './beatHeartValueBuffTypes.ts';
import type { HeartLimitBoostEffect } from './heartLimitBoostTypes.ts';
import type { MoodValueBoostEffect } from './moodValueBoostTypes.ts';
import type { GenesisSkillEffect } from './genesisSkillTypes.ts';
import type { AddSpecialAppealTokenEffect } from './specialAppealTokenTypes.ts';
import type { HandMaxCardEffect } from './handMaxCardTypes.ts';
import type { MentalShieldEffect } from './mentalShieldTypes.ts';
import type { FixedParameterExtendEffect } from './fixedParameterExtendTypes.ts';
import type { BeatPointBuffEffect } from './beatPointBuffTypes.ts';
import type { RecoverMentalSkillEffect } from './recoverMentalSkillTypes.ts';
import type { GaugeRegenerationEffect } from './gaugeRegenerationTypes.ts';
import type { MentalBarrierEffect } from './mentalBarrierTypes.ts';
import type { AddVoltageSkillEffect } from './addVoltageTypes.ts';
import type { ReshuffleSkillEffect } from './reshuffleSkillTypes.ts';
import type { DrawSuccessInduceEffect } from './drawSuccessInduceTypes.ts';
import type { SkillActionEffect } from './skillActionTypes.ts';
export type { GaugeRegeneration, GaugeRegenerationEffect } from './gaugeRegenerationTypes.ts';
export type { MentalBarrier, MentalBarrierEffect } from './mentalBarrierTypes.ts';
export type { ProxySkillEffect } from './proxySkillTypes.ts';
export type MoodBonus = Readonly<{ target: 1 | 2 | 3; perPoint: number }>;
export type GaugeInfinity = Readonly<{
  gauge: 'ap' | 'voltage' | 'mental';
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  suspended: boolean;
  deactivationKey: string | null;
}>;
type InfinityGaugeEffect = Readonly<{
  kind: 'infinity-gauge';
  gauge: 'ap' | 'voltage' | 'mental';
  duration:
    | Readonly<{ kind: 'milliseconds'; value: number }>
    | Readonly<{ kind: 'sections'; value: bigint }>
    | Readonly<{ kind: 'stage'; value: number }>;
  invocationType?: number;
  deactivationKey?: string;
}>;
type GaugeEffect = InfinityGaugeEffect | GaugeRegenerationEffect | MentalBarrierEffect;
export type ComboInduceEffect = Readonly<{
  kind: 'combo-induce';
  members: readonly MemberId[];
  apPower: bigint;
  repeatAction: 0 | 1 | 2;
  duration: Readonly<{ kind: 'milliseconds' | 'sections' | 'stage'; value: number }>;
  effects: readonly Effect[];
  deactivationKey?: string;
}>;
type ResetSpecial = Readonly<{
  kind: 'reset-special';
  scope: 'normal' | 'extra' | 'all';
  target:
    | Readonly<{ kind: 'all' | 'source' | 'others' }>
    | Readonly<{ kind: 'member'; member: MemberId }>
    | Readonly<{ kind: 'unit'; unit: UnitId }>;
}>;
export type SearchTarget =
  | Readonly<{ kind: 'skill-icon'; icon: number }>
  | Readonly<{ kind: 'main-effect'; actionType: number }>
  | Readonly<{ kind: 'member'; member: MemberId }>
  | Readonly<{ kind: 'unit'; unit: UnitId }>
  | Readonly<{ kind: 'token-series'; seriesId: number }>
  | Readonly<{ kind: 'token'; token: TokenId }>;
export type SearchRequest = Readonly<{
  scope: 'grade' | 'section' | 'skill';
  target: SearchTarget;
  deactivationKey: string | null;
}>;
export type TokenBoostTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; member: MemberId }>
  | Readonly<{ kind: 'unit'; unit: UnitId }>
  | Readonly<{ kind: 'card-series'; seriesId: number }>;
export type HeartBoostTarget =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ kind: 'member'; member: MemberId }>
  | Readonly<{ kind: 'unit'; unit: UnitId }>
  | Readonly<{ kind: 'card-series'; seriesId: number }>;
type HeartBoostEffect = Readonly<{
  kind: 'heart-boost';
  percent: number;
  uses: number | bigint | null;
  target?: HeartBoostTarget;
  duration?:
    | Readonly<{ kind: 'milliseconds' | 'sections'; value: number }>
    | Readonly<{ kind: 'stage' }>;
  invocationType?: number;
  deactivationKey?: string;
  moodBonus?: MoodBonus;
}>;
export type HeartBoostState = Readonly<{
  percent: number;
  uses: bigint | null;
  target: HeartBoostTarget;
  remainingSeconds: number | null;
  remainingSections: number | null;
  deactivationKey: string | null;
}>;
export type HandCardStats = Readonly<{
  isActive: boolean;
  enteredSectionIndex: number;
  skillUseCountsByMember: Readonly<Record<number, number>>;
  skillUseCountsByIcon: Readonly<Record<number, number>>;
  skillUseCountsByUnit: Readonly<Record<number, number>>;
}>;
export type SkillCostChange = Readonly<
  LiveChangeSkillCostValue & {
    sourceId: string;
    conditionId: number;
    remainingSections: number | null;
    invocationType: number | null;
    deactivationKey: string | null;
  }
>;
export type ParameterDetailValue = Readonly<{
  id: bigint;
  value: bigint;
  unitsPerValue: number;
}>;
export type ParameterValueChangeEffect = Readonly<{
  kind: 'parameter-value-change';
  sourceEffectId: string;
  targetDetailId: bigint;
  calculation: 'add' | 'multiply' | 'fan-level';
  base: number;
  increment: number;
  values?: readonly number[];
  members?: readonly MemberId[];
}>;
export type ParameterValueFactor = Readonly<{
  cardId: string;
  sourceEffectId: string;
  targetDetailId: bigint;
  factor: number;
}>;
export type TokenBoost = Readonly<{
  calculation: 'add' | 'multiply-percent';
  value: number;
  target: TokenBoostTarget;
  seriesIds?: readonly bigint[];
  remainingUses: bigint | null;
  remainingSeconds: number | null;
  remainingSections: bigint | null;
  deactivationKey: string | null;
}>;
type EffectShape =
  | Readonly<{
      kind: 'branch';
      condition: GameCondition;
      whenTrue: readonly Effect[];
      whenFalse: readonly Effect[];
      persistent?: boolean;
      deactivationKey?: string;
    }>
  | Readonly<{ kind: 'hearts'; amount: number; moodBonus?: MoodBonus; lifetimeSeconds?: number }>
  | SkillActionEffect
  | RecoverMentalSkillEffect
  | AddVoltageSkillEffect
  | ReshuffleSkillEffect
  | Readonly<{
      kind: 'beat-hearts' | 'ap' | 'mental' | 'voltage';
      amount: number;
      moodBonus?: MoodBonus;
    }>
  | Readonly<{
      kind: 'boost';
      multiplier: number;
      moodBonus?: MoodBonus;
      deactivationKey?: string;
    }>
  | Readonly<{
      kind: 'amplify';
      percent: number;
      moodBonus?: MoodBonus;
      members?: readonly MemberId[];
      duration?: 'section';
      deactivationKey?: string;
    }>
  | Readonly<{ kind: 'mood'; amount: number }>
  | MoodChangeSkillEffect
  | Readonly<{
      kind: 'conditional';
      condition: 'happy100' | 'mellow100' | 'mental0' | 'deck80' | 'first-section' | 'last-section';
      effects: readonly Effect[];
    }>
  | DrawSuccessInduceEffect
  | InduceEffect
  | Readonly<{ kind: 'tokens'; token: TokenId; count: number; seriesIds?: readonly number[] }>
  | Readonly<{ kind: 'ingame-mission'; groupId: bigint }>
  | Readonly<{
      kind: 'token-deck-split';
      seriesIds: readonly bigint[] | null;
      duration:
        | Readonly<{ kind: 'milliseconds'; value: number }>
        | Readonly<{ kind: 'sections'; value: bigint }>
        | Readonly<{ kind: 'stage'; value: number }>;
      invocationType?: number;
      deactivationKey?: string;
    }>
  | Readonly<{
      kind: 'token-boost';
      calculation: TokenBoost['calculation'];
      num: bigint;
      target: TokenBoostTarget;
      seriesIds?: readonly bigint[];
      uses?: bigint;
      duration?: Readonly<{ kind: 'milliseconds' | 'sections'; value: bigint }>;
      invocationType?: number;
      deactivationKey?: string;
    }>
  | Readonly<{
      kind: 'hand-limit';
      amount: number;
      calculationType: number;
      displayTimeType: number;
      displayTime: bigint;
      invocationType?: number;
      deactivationKey?: string;
    }>
  | Readonly<{ kind: 'heart-limit'; amount: number }>
  | Readonly<{
      kind: 'heart-limit-change';
      calculationType: 1 | 2;
      num: bigint;
      bonusMoodTarget: 0 | 1 | 2 | 3;
      bonusMoodValue: bigint;
      duration:
        | Readonly<{ kind: 'milliseconds' | 'sections'; value: bigint }>
        | Readonly<{ kind: 'stage' }>;
      invocationType?: number;
      deactivationKey?: string;
    }>
  | Readonly<{ kind: 'use-hand'; addAp?: number }>
  | Readonly<{ kind: 'card-move'; destination: 'deck' | 'exclusion' }>
  | Readonly<{ kind: 'shuffle'; recoverDiscard: boolean; destination: 'draw' | 'discard' }>
  | Readonly<{ kind: 'search-unit'; unit: UnitId; count: number }>
  | Readonly<{ kind: 'search-token'; token: TokenId; count: number }>
  | Readonly<{
      kind: 'search';
      scope: SearchRequest['scope'];
      target: SearchTarget;
      count: number;
      deactivationKey?: string;
    }>
  | Readonly<{ kind: 'genesis'; effectValue: number }>
  | SkillCooldownEffectInput
  | InduceSkillEffectInput
  | Readonly<{ kind: 'ap-limit'; amount: number }>
  | Readonly<{ kind: 'ap-speed'; percent: number; duration: 'stage' | 'section' }>
  | Readonly<{
      kind: 'ap-speed-change';
      calculationType: 1 | 2;
      num: bigint;
      bonusMoodTarget: 0 | 1 | 2 | 3;
      bonusMoodValue: bigint;
      displayTimeType: bigint;
      displayTime: bigint;
      invocationType?: number;
      deactivationKey?: string;
    }>
  | VoltageConvertEffect
  | MentalHeartInduceEffect
  | AdditionalHeartInduceEffect
  | TokenCardEffect
  | ComboInduceEffect
  | Action52BuffEffect
  | ResetSpecial
  | Readonly<{ kind: 'voltage-limit'; amount: number }>
  | Readonly<{ kind: 'voltage-tier'; step: 100 | 200; tiers: readonly (readonly Effect[])[] }>
  | Readonly<{ kind: 'protect-mental'; duration?: 'section' }>
  | DisableMentalDownEffect
  | Readonly<{ kind: 'beat-count'; amount: number }>
  | BeatHeartValueBuffEffect
  | BeatPointBuffEffect
  | HeartBoostEffect
  | HeartLimitBoostEffect
  | MoodValueBoostEffect
  | GenesisSkillEffect
  | AddSpecialAppealTokenEffect
  | HandMaxCardEffect
  | LoveUpAdditionalBuffEffect
  | VoltageUpAdditionalBuffEffect
  | MentalRecoverAdditionalBuffEffect
  | MentalBarrierAdditionalBuffEffect
  | MentalShieldEffect
  | FixedParameterExtendEffect
  | Readonly<{
      kind: 'cost-reduction';
      amount: number;
      target:
        | Readonly<{ kind: 'unit'; unit: UnitId }>
        | Readonly<{ kind: 'token'; token: TokenId }>;
    }>
  | SkillCostChangeEffect
  | ParameterValueChangeEffect
  | DeckSkillCostChangeEffect
  | Readonly<{ kind: 'voltage-set'; amount: number }>
  | GaugeEffect
  | StopVoltageIncreaseEffect
  | Readonly<{
      kind: 'resource-boost';
      target: 'voltage' | 'mental' | 'attract';
      percent: number;
      uses: number | null;
      condition: 'voltage20' | 'mental100' | 'always';
      members?: readonly MemberId[];
      moodBonus?: MoodBonus;
    }>
  | Readonly<{ kind: 'mode'; modeId: bigint; change: ModeChange['change'] }>
  | Readonly<{
      kind: 'mode-reaction';
      modeId: number;
      thresholds: readonly bigint[];
      effects: readonly Effect[];
      buffNum: bigint;
    }>
  | Readonly<{ kind: 'collect' }>
  | ProxySkillEffect
  | ProxyForcedActivationEffect;
export type Effect = EffectShape &
  Readonly<{
    parameterDetails?: Readonly<Record<string, ParameterDetailValue>>;
    skillEffectId?: bigint;
  }>;
