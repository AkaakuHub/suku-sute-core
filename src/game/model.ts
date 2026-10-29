import type { LiveMentalBarrierState } from '../runtime/skills/mentalBarrier.ts';
import type { LiveConvertVoltageUpState } from '../runtime/skills/convertVoltageUp.ts';
import type { LiveRegenGaugeState } from '../runtime/skills/regenGaugeSkill.ts';
import type { GameRegenGaugeApplication } from './gaugeRegenerationTypes.ts';
import type { LiveApIncreaseSpeedState } from '../runtime/skills/apIncreaseSpeed.ts';
import type { LiveDeckHandsState } from '../runtime/cards/liveHand.ts';
import type { LiveDeckDrawContextState } from '../runtime/cards/cardDraw.ts';
import type { LiveTokenCardDeckState } from '../runtime/cards/tokenCardDeck.ts';
import type { LiveCardSkillLevel } from '../runtime/skills/skillTypes.ts';
import type { LiveDeckActionQueueState } from '../runtime/cards/deckActionQueue.ts';
import type { LiveDeckBoardState } from '../runtime/cards/deckBoardState.ts';
import type { LiveHandCardStats } from '../runtime/cards/handCardStats.ts';
import type { LiveVoltageGaugeState } from '../runtime/live/voltageGauge.ts';
import type { SkillCooldownEffect } from './skillCooldownTypes.ts';
import type {
  ActiveCardMoveInducer,
  ActiveEffectInducer,
  InducedSkillEffect,
} from './induceSkillEffectTypes.ts';
import type { DisableMentalDown } from './disableMentalDownTypes.ts';
import type { MentalBarrierAdditionalBuff } from './mentalBarrierAdditionalBuffTypes.ts';
import type { MentalRecoverAdditionalBuff } from './mentalRecoverAdditionalBuffTypes.ts';
import type { VoltageUpAdditionalBuff } from './voltageUpAdditionalBuffTypes.ts';
import type { LoveUpAdditionalBuff } from './loveUpAdditionalBuffTypes.ts';
import type { ScoreLimitSettings } from './live/scoreLimit.ts';
import type { LiveGenesisState } from '../runtime/skills/genesisSkill.ts';
import type { StarGatherHeartRuntimeState } from './live/heartTypes.ts';
import type { StageGauges } from './live/gaugeTiming.ts';
import type { AutomaticHeartState } from './live/automaticHeart.ts';
import type { ScoreSample } from './scoreHistory.ts';
import type { MoodSample } from './moodHistory.ts';
import type { ModeState } from './live/modes.ts';
import type { MoodKey } from './live/moodTimeline.ts';
import type { Effect } from './modelTypes.ts';
import type { GameCondition } from './conditions/model.ts';
import type { LiveMentalGaugeState } from '../runtime/live/mentalGauge.ts';
import type { LiveApGaugeState } from '../runtime/live/apGauge.ts';
import type { Card } from './cards/cardTypes.ts';
export type { Action } from './actionTypes.ts';
export type { Card } from './cards/cardTypes.ts';
import type { TemporaryScoreBoost } from './voltageConversionTypes.ts';
import type { Action52Buff } from './skillBoostTypes.ts';
import type { MentalHeartInducer } from './mentalHeartInduceTypes.ts';
import type { ComboInducer } from './comboInduceTypes.ts';
import type { AdditionalHeartInducer } from './additionalHeartTypes.ts';
import type { TokenRequest } from './tokenRequestTypes.ts';
import type {
  GaugeInfinity,
  HeartBoostState,
  SkillCostChange,
  ParameterValueFactor,
  TokenBoost,
} from './modelTypes.ts';
import type { TokenDeckSplit } from './tokenDeckSplitTypes.ts';
import type { ProxySkillState } from './proxySkillTypes.ts';
import type { IngameMission, IngameMissionGroup } from './ingameMissionTypes.ts';
import type { HeartLimitAdditionalBuff } from './heartLimitBoostTypes.ts';
import type { MoodValueAdditionalBuff } from './moodValueBoostTypes.ts';
import type { SpecialAppealToken } from './specialAppealTokenTypes.ts';
import type { LiveHandCardCountState } from '../runtime/skills/handCardCount.ts';
import type { MentalShield } from './mentalShieldTypes.ts';
import type { FixedParameterExtend } from './fixedParameterExtendTypes.ts';
import type { BeatPointBuff } from './beatPointBuffTypes.ts';
import type { Boost, ResourceBoost, SkillScoreUp, TargetBoost } from './boostTypes.ts';
export { rules } from './rules.ts';
export type { Boost, ResourceBoost, TargetBoost } from './boostTypes.ts';

export type { SearchTarget, TokenBoost } from './modelTypes.ts';
export type { Effect } from './modelTypes.ts';

export type PerformerId = 'nova' | 'lumen' | 'tetra';
export type MemberId = 0 | 1021 | 1022 | 1030 | 1031 | 1032 | 1033 | 1041 | 1042 | 1053;
export type UnitId = 1 | 2 | 3;
export const costumeIds = [
  'star',
  'moon',
  'blossom',
  'encore',
  'sailor',
  'witch',
  'prism',
  'snow',
  'sunny',
  'space',
  'march',
  'ribbon',
] as const;
export type CostumeId = (typeof costumeIds)[number];
export type HandShuffle = Readonly<{ recoverDiscard: boolean; destination: 'draw' | 'discard' }>;

export type TokenId = string;

export type Section = Readonly<{
  name: string;
  startBeat: number;
  climax: boolean;
}>;

export type Track = Readonly<{
  id: string;
  name: string;
  bpm: number;
  songTime: number;
  beats: number;
  stage: StageGauges;
  masteryVoltageBonus: Readonly<{ demand: number; gain: number }>;
  scoreLimit: ScoreLimitSettings;
  sections: readonly Section[];
  moodKeys: readonly MoodKey[];
  ingameMissionGroups: readonly IngameMissionGroup[];
  afterDeckReloadEffects: readonly Effect[];
}>;

export type CardUse = Readonly<
  Pick<LiveCardSkillLevel, 'consumeAp'> & {
    key: number;
    card: Card;
    tick: number;
    handIndex: number;
    handCount: number;
  }
>;
export type PlayStats = Readonly<{
  cardsUsed: number;
  heartsCollected: number;
  heartsMissed: number;
  specialsUsed: number;
  bestCollection: number;
  bestCombo: number;
}>;

export type GameState = Readonly<{
  supportLevels: Readonly<Record<number, number>>;
  modes: ModeState;
  modeReactions: readonly Readonly<{
    sourceId: string | null;
    modeId: number;
    thresholds: readonly bigint[];
    effects: readonly Effect[];
    buffNum: bigint;
    count: number;
  }>[];
  phase: 'ready' | 'playing' | 'paused' | 'finished';
  currentSkillType: number | null;
  tick: number;
  track: Track;
  deck: readonly Card[];
  cardPool: readonly Card[];
  liveHands: LiveDeckHandsState<string>;
  handEffectCardIds: readonly string[];
  activeHandPermanentCardIds: readonly string[];
  tokenCardDeck: LiveTokenCardDeckState<string>;
  tokenDeckSplit: TokenDeckSplit | null;
  ingameMission: IngameMission | null;
  afterDeckReloadEvents: number;
  tokenCatalog: readonly Card[];
  tokenGroups: readonly Readonly<{
    sourceId: string;
    requests: readonly TokenRequest[];
  }>[];
  tokenBoosts: readonly TokenBoost[];
  proxySkills: readonly ProxySkillState[];
  nextProxySkillId: number;
  handCardCountEffects: LiveHandCardCountState<string>;
  heartLimitBase: number;
  heartLimitBuffs: readonly Readonly<{
    id: number;
    calculation: 'add' | 'multiply';
    value: number;
    remainingSeconds: number | null;
    remainingSections: bigint | null;
    deactivationKey: string | null;
  }>[];
  nextHeartLimitBuffId: number;
  heartLimitAdditionalBuffs: readonly HeartLimitAdditionalBuff[];
  nextHeartLimitAdditionalBuffId: number;
  moodValueAdditionalBuffs: readonly MoodValueAdditionalBuff[];
  nextMoodValueAdditionalBuffId: number;
  deckDrawContext: LiveDeckDrawContextState;
  deckActions: LiveDeckActionQueueState;
  cardUseCounts: Readonly<Record<string, number>>;
  skillActivationCounts: Readonly<Record<string, number>>;
  handCardStats: Readonly<Record<string, LiveHandCardStats>>;
  skillCostChanges: readonly SkillCostChange[];
  parameterValueFactors: readonly ParameterValueFactor[];
  parameterValueChangeCounts: Readonly<Record<string, Readonly<Record<string, number>>>>;
  activeModeParameterChanges: readonly Readonly<{
    cardId: string;
    modeId: number;
    isOn: boolean;
  }>[];
  deckBoard: LiveDeckBoardState<string>;
  activation: Readonly<{
    sourceId: string;
    handCardButtonId: number;
    usedCards: readonly string[];
    hasUseAllHandSkill: boolean;
    pendingHandStatsDeactivationKeys?: readonly string[];
  }> | null;
  randomSeed: number;
  ap: LiveApGaugeState;
  fixedParameterBase: Readonly<{ ap: number; voltage: number; mental: number }>;
  maximumMental: number;
  fixedParameterExtends: readonly FixedParameterExtend[];
  nextFixedParameterExtendId: number;
  apIncreaseSpeedEffects: LiveApIncreaseSpeedState;
  convertVoltageUpEffects: LiveConvertVoltageUpState<Card>;
  action52Buffs: readonly Action52Buff[];
  mentalHeartInducers: readonly MentalHeartInducer[];
  nextMentalHeartInducerId: number;
  additionalHeartInducers: readonly AdditionalHeartInducer[];
  nextAdditionalHeartInducerId: number;
  comboInducer: ComboInducer | null;
  voltageStops: readonly Readonly<{
    id: number;
    remainingSeconds: number | null;
    remainingSections: bigint | null;
    deactivationKey: string | null;
  }>[];
  nextVoltageStopId: number;
  nextConvertVoltageUpEffectId: number;
  nextAction52BuffId: number;
  loveUpAdditionalBuffs: readonly LoveUpAdditionalBuff[];
  voltageUpAdditionalBuffs: readonly VoltageUpAdditionalBuff[];
  mentalRecoverAdditionalBuffs: readonly MentalRecoverAdditionalBuff[];
  mentalBarrierAdditionalBuffs: readonly MentalBarrierAdditionalBuff[];
  nextSkillAdditionalBuffId: number;
  temporaryScoreBoosts: readonly TemporaryScoreBoost[];
  gaugeInfinities: readonly GaugeInfinity[];
  regenGaugeEffects: LiveRegenGaugeState<GameRegenGaugeApplication>;
  nextRegenGaugeEffectId: number;
  moodOffset: number;
  moodSkillBuffs: readonly Readonly<{
    calculation: 'add' | 'fixed';
    value: number;
    remainingSeconds: number | null;
    remainingSections: bigint | null;
    deactivationKey: string | null;
  }>[];
  costReductions: Readonly<Record<string, number>>;
  onceSkillCostChanges: Readonly<Record<string, number>>;
  storyAmplification: number;
  mental: LiveMentalGaugeState;
  mentalProtected: boolean;
  disableMentalDownEffects: readonly DisableMentalDown[];
  nextDisableMentalDownId: number;
  sectionMentalProtected: boolean;
  sectionBeatHeartBonus: number;
  beatPointBuffs: readonly BeatPointBuff[];
  beatHeartValueBuffs: readonly Readonly<{
    calculation: 'add' | 'multiply' | 'fixed';
    value: number;
    remainingSeconds: number | null;
    remainingSections: bigint | null;
    deactivationKey: string | null;
  }>[];
  heartBoosts: readonly HeartBoostState[];
  mentalShields: readonly MentalShield[];
  mentalBarriers: LiveMentalBarrierState;
  nextMentalBarrierEffectId: number;
  voltage: LiveVoltageGaugeState;
  masteryVoltageProgress: number;
  maximumVoltageLevel: number;
  specialAppealTokens: readonly SpecialAppealToken[];
  specialUsed: readonly string[];
  score: bigint;
  scoreMultiplier: bigint;
  scoreHistory: readonly ScoreSample[];
  moodHistory: readonly MoodSample[];
  hearts: StarGatherHeartRuntimeState;
  automaticHeart: AutomaticHeartState;
  heartRandomSeed: number;
  boosts: readonly Boost[];
  skillScoreUps: readonly SkillScoreUp[];
  amplification: number;
  sectionAmplification: number;
  targetBoosts: readonly TargetBoost[];
  resourceBoosts: readonly ResourceBoost[];
  genesis: LiveGenesisState;
  handHeartCollectCounts: Readonly<Record<string, number>>;
  handCollectionActivationCounts: Readonly<Record<string, number>>;
  handUseActivationCounts: Readonly<Record<string, number>>;
  handUseHeartCollectionCounts: Readonly<Record<string, number>>;
  skillEffectActivationCounts: Readonly<Record<string, number>>;
  effectInducers: readonly ActiveEffectInducer[];
  branchInducers: readonly Readonly<{
    id: number;
    condition: GameCondition;
    whenTrue: readonly Effect[];
    whenFalse: readonly Effect[];
    active: boolean | null;
    deactivationKey: string | null;
    sourceCardId: string | null;
  }>[];
  nextBranchInducerId: number;
  cardMoveInducers: readonly ActiveCardMoveInducer[];
  combo: number;
  lastCollectTick: number;
  lastActionTick: number;
  skillCooldownEffects: readonly SkillCooldownEffect[];
  nextSkillCooldownEffectId: number;
  inducedSkillEffects: readonly InducedSkillEffect[];
  nextInducedSkillEffectId: number;
  lastPerformer: PerformerId | null;
  lastCardName: string;
  cardUses: readonly CardUse[];
  lastGain: bigint;
  stats: PlayStats;
}>;
