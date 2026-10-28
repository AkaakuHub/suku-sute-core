import { createModes } from './live/modes.ts';
import { advanceAutomaticGauges } from './automaticGauges.ts';
import { advanceSectionChange } from './sectionChange.ts';
import { moodAtTime } from './live/moodTimeline.ts';
import { validateTrack } from './live/validateTrack.ts';
import { calculateLiveBaseSkillCooldownSeconds } from '../runtime/live/skillActivation.ts';
import { beatHeartCount } from './beat.ts';
import { validateDeck, validateCard } from './deck.ts';
import { addHearts, collectHearts, advanceHearts, heartCount } from './hearts.ts';
import { advanceAutomaticHeart } from './live/automaticHeart.ts';
import { type Card, type GameState, type Track, rules } from './model.ts';
import { durationSeconds, sectionAt, moodValue } from './projection.ts';
import { finishBloom } from './bloom.ts';
import { fillHand, restoreHandLimitCount } from './cards/drawing.ts';
import { advanceHandLimitEffects } from './effects/handLimit.ts';
import { createStarGatherHeartRuntimeState } from './live/heartSpawn.ts';
import { recordScoreHistory } from './scoreHistory.ts';
import { recordMoodHistory } from './moodHistory.ts';
import { starGatherHeartShowLimitSettings } from './live/heartPresentation.ts';
import { resolveLiveHeartDrawCount } from '../runtime/live/heartPresentation.ts';
import { expireGaugeInfinities } from './resources.ts';
import { advanceMentalHeartInducers } from './effects/mentalHeartInduce.ts';
import { advanceGaugeRegenerations, expireGaugeRegenerations } from './live/gaugeRegeneration.ts';
import { expireMentalBarriers, removeExhaustedMentalBarriers } from './live/mentalBarriers.ts';
import { advanceHeartBoosts } from './live/heartBoosts.ts';
import { initializeHandCardStats } from './cards/skillCostChanges.ts';
import { initializeParameterValueFactors } from './parameters/parameterValueChange.ts';
import { advanceProxySkillPeriods } from './effects/proxySkill.ts';
import { applyEffect } from './effects.ts';
import { advanceComboInducer } from './effects/comboInduce.ts';
import { advanceHeartLimitBuffs } from './effects/heartLimit.ts';
import { advanceVoltageIncreaseStops } from './effects/stopVoltageIncrease.ts';
import { advanceAdditionalHeartInducers } from './effects/additionalHeart.ts';
import { advanceApSpeedEffects } from './effects/apSpeed.ts';
import { advanceVoltageConversions } from './effects/voltageConversion.ts';
import { advanceTimedSkillBuffs } from './effects/timedSkillBuffs.ts';
import { advanceSkillCooldownEffects } from './effects/skillCooldown.ts';
import { advanceInducedSkillEffects } from './effects/induceSkillEffect.ts';
import { advanceTokenDeckSplit } from './effects/tokenDeckSplit.ts';
import { advanceIngameMission } from './ingameMissions.ts';
import { createInitialEffectState } from './effects/initialState.ts';
import { refreshEffectInducers } from './effects/effectInduce.ts';
import { resolveActionEffects } from './cards/resolveActionEffects.ts';
import type { CardSkillVariantMaster } from './cards/cardTypes.ts';
export function createGame(
  track: Track,
  deck: readonly Card[],
  seed: number,
  heartShowLimit: number = starGatherHeartShowLimitSettings.defaultValue,
  tokenCatalog: readonly Card[] = [],
  cardSkillVariants: readonly CardSkillVariantMaster[] = [],
): GameState {
  const resolvedDeck = deck.map((card) => resolveActionEffects(card, cardSkillVariants));
  const resolvedTokenCatalog = tokenCatalog.map((card) =>
    resolveActionEffects(card, cardSkillVariants),
  );
  validateDeck(resolvedDeck);
  validateTrack(track);
  for (const card of resolvedTokenCatalog) validateCard(card);
  resolveLiveHeartDrawCount(0, heartShowLimit);
  const lead = resolvedDeck[0];
  const initial: GameState = {
    supportLevels: {},
    modes: createModes(
      resolvedDeck.flatMap((card) => [
        ...(card.modeIds ?? []),
        ...(card.modeParameterChanges ? [card.modeParameterChanges.modeId] : []),
        ...(card.modeSkillChanges ? [card.modeSkillChanges.modeId] : []),
        ...(card.modeAbilityChanges ? [card.modeAbilityChanges.modeId] : []),
      ]),
    ),
    modeReactions: [],
    phase: 'ready',
    currentSkillType: null,
    tick: 0,
    track,
    deck: [...resolvedDeck],
    cardPool: [...resolvedDeck],
    hand: [lead.id],
    activeHandPermanentCardIds: [],
    proxyCards: [],
    handCardStats: {},
    skillCostChanges: [],
    parameterValueFactors: [],
    parameterValueChangeCounts: {},
    activeModeParameterChanges: [],
    skillUseDestinations: {},
    handEffectCardIds: [lead.id],
    drawPile: resolvedDeck.filter((card) => card.id !== lead.id).map((card) => card.id),
    tokenDeckSplit: null,
    ingameMission: null,
    deckOutCount: 0,
    afterMentalDownEvents: 0,
    discard: [],
    tokenCatalog: resolvedTokenCatalog,
    nextTokenId: 1,
    tokenGroups: [],
    tokenBoosts: [],
    handLimit: rules.handSize,
    proxyAbsorptions: [],
    nextProxyAbsorptionId: 1,
    handLimitEffects: [],
    heartLimitBase: 100,
    heartLimitBuffs: [],
    nextHeartLimitBuffId: 1,
    heartLimitAdditionalBuffs: [],
    nextHeartLimitAdditionalBuffId: 1,
    moodValueAdditionalBuffs: [],
    nextMoodValueAdditionalBuffId: 1,
    drawContext: 'initial',
    deckActions: { shuffles: [], searches: [] },
    lastUsedMember: null,
    lastUsedUnit: null,
    lastUsedSkillIcon: null,
    cardUseCounts: {},
    skillActivationCounts: {},
    activation: null,
    randomSeed: seed,
    currentAp: 0,
    maxAp: track.stage.maxAp,
    ...createInitialEffectState(track),
    apTimeEffects: [],
    voltageConversions: [],
    action52Buffs: [],
    mentalHeartInducers: [],
    nextMentalHeartInducerId: 1,
    additionalHeartInducers: [],
    nextAdditionalHeartInducerId: 1,
    comboInducer: null,
    nextVoltageConversionId: 1,
    nextAction52BuffId: 1,
    loveUpAdditionalBuffs: [],
    voltageUpAdditionalBuffs: [],
    mentalRecoverAdditionalBuffs: [],
    mentalBarrierAdditionalBuffs: [],
    nextSkillAdditionalBuffId: 1,
    temporaryScoreBoosts: [],
    apTimerSeconds: 0,
    mentalTimerSeconds: 0,
    voltageTimerSeconds: 0,
    voltageStops: [],
    nextVoltageStopId: 1,
    gaugeInfinities: [],
    gaugeRegenerations: [],
    moodOffset: 0,
    moodSkillBuffs: [],
    costReductions: {},
    onceSkillCostChanges: {},
    storyAmplification: 0,
    currentMental: 100,
    mentalDown: false,
    mentalProtected: false,
    disableMentalDownEffects: [],
    nextDisableMentalDownId: 1,
    sectionMentalProtected: false,
    sectionBeatHeartBonus: 0,
    beatPointBuffs: [],
    beatHeartValueBuffs: [],
    heartBoosts: [],
    mentalBarriers: [],
    currentVoltage: 0,
    masteryVoltageProgress: 0,
    maximumVoltageLevel: 1000,
    specialUsed: [],
    score: 0n,
    scoreMultiplier: 1n,
    scoreHistory: [{ timeMilliseconds: 0, totalScore: 0n }],
    moodHistory: [{ timeMilliseconds: 0, moodValue: moodAtTime(track.moodKeys, 0) }],
    hearts: {
      ...createStarGatherHeartRuntimeState((track.beats * 60) / track.bpm),
      showLimit: heartShowLimit,
      throwLimit: heartShowLimit,
      showPercentage: 100,
    },
    heartRandomSeed: seed,
    automaticHeart: { enabled: true, timerSeconds: 0 },
    boosts: [],
    skillScoreUps: [],
    amplification: 100,
    sectionAmplification: 0,
    targetBoosts: [],
    resourceBoosts: [],
    bloom: null,
    relayUsed: [],
    handHeartCollectCounts: {},
    combo: 0,
    lastCollectTick: -rules.comboWindowTicks - 1,
    lastActionTick: -Math.ceil(
      calculateLiveBaseSkillCooldownSeconds(Math.round(((track.beats * 60) / track.bpm) * 1000)) *
        rules.ticksPerSecond,
    ),
    skillCooldownEffects: [],
    nextSkillCooldownEffectId: 1,
    inducedSkillEffects: [],
    nextInducedSkillEffectId: 1,
    skillEffectActivationCounts: {},
    effectInducers: [],
    branchInducers: [],
    nextBranchInducerId: 1,
    cardMoveInducers: [],
    lastPerformer: null,
    lastCardName: '',
    cardUses: [],
    lastGain: 0n,
    stats: {
      cardsUsed: 0,
      heartsCollected: 0,
      heartsMissed: 0,
      specialsUsed: 0,
      bestCollection: 0,
      bestCombo: 0,
    },
  };
  return fillHand(initializeHandCardStats(initializeParameterValueFactors(initial), [lead.id]));
}
export function advanceTo(state: GameState, seconds: number): GameState {
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error('ゲーム時刻が正しくありません。');
  if (state.phase !== 'playing') return state;
  const endTick = Math.round(durationSeconds(state) * rules.ticksPerSecond);
  const target = Math.min(endTick, Math.floor(seconds * rules.ticksPerSecond + 1e-7));
  let next = state;
  while (next.tick < target) next = advanceTick(next);
  if (next.tick === endTick) {
    const collected = collectHearts({ ...next, relayUsed: [...next.hand] });
    return {
      ...finishBloom(collected),
      scoreHistory: recordScoreHistory(collected.scoreHistory, {
        timeMilliseconds: Math.trunc(durationSeconds(collected) * 1000),
        totalScore: collected.score,
      }),
      moodHistory: recordMoodHistory(collected.moodHistory, {
        timeMilliseconds: Math.trunc(durationSeconds(collected) * 1000),
        moodValue: moodValue(collected),
      }),
      phase: 'finished',
    };
  }
  return next;
}
function advanceTick(state: GameState): GameState {
  const tick = state.tick + 1;
  const dt = 1 / rules.ticksPerSecond;
  const gauges = advanceMentalHeartInducers(
    advanceTimedSkillBuffs(
      advanceVoltageConversions(
        advanceApSpeedEffects(
          removeExhaustedMentalBarriers(
            expireMentalBarriers(
              advanceGaugeRegenerations(
                expireGaugeInfinities(
                  advanceAutomaticGauges(state, dt, applyEffect),
                  'milliseconds',
                  dt,
                  applyEffect,
                ),
                dt,
                applyEffect,
              ),
              'milliseconds',
              dt,
            ),
          ),
          dt,
        ),
        dt,
      ),
      dt,
    ),
    dt,
  );
  const tokenDeckState = advanceIngameMission(advanceTokenDeckSplit(gauges, dt, applyEffect), dt);
  const proxyPeriodState = advanceProxySkillPeriods(tokenDeckState, dt, applyEffect);
  const comboState = advanceComboInducer(proxyPeriodState, dt, applyEffect);
  let next: GameState = advanceHearts({
    ...advanceHeartBoosts(comboState, dt),
    tick,
    tokenBoosts: state.tokenBoosts.flatMap((boost) => {
      if (boost.remainingSeconds === null) return [boost];
      const remainingSeconds = Math.fround(boost.remainingSeconds - Math.fround(dt));
      return remainingSeconds > 0 ? [{ ...boost, remainingSeconds }] : [];
    }),
    cardUses: state.cardUses.filter((use) => tick - use.tick < rules.ticksPerSecond),
    combo: tick - state.lastCollectTick > rules.comboWindowTicks ? 0 : state.combo,
    boosts: state.boosts.filter((boost) => boost.untilTick > tick),
    skillScoreUps: state.skillScoreUps.flatMap((boost) => {
      if (boost.untilTick <= tick) return [];
      if (boost.remainingSeconds === null) return [boost];
      const remainingSeconds = Math.fround(boost.remainingSeconds - Math.fround(dt));
      return remainingSeconds > 0 ? [{ ...boost, remainingSeconds }] : [];
    }),
  });
  next = advanceSkillCooldownEffects(next, dt);
  next = advanceInducedSkillEffects(next, dt);
  const elapsedHandLimit = advanceHandLimitEffects(next, dt);
  next = elapsedHandLimit.state;
  next = advanceHeartLimitBuffs(next, dt);
  next = advanceVoltageIncreaseStops(next, dt);
  next = advanceAdditionalHeartInducers(next, dt);
  if (elapsedHandLimit.handAdjustment > 0) {
    next = restoreHandLimitCount(next, elapsedHandLimit.handAdjustment);
  }
  const previousBeat = Math.floor((state.tick * state.track.bpm) / (60 * rules.ticksPerSecond));
  const beat = Math.floor((tick * state.track.bpm) / (60 * rules.ticksPerSecond));
  if (beat !== previousBeat && beat % 2 === 0) {
    if (!next.mentalDown) next = addHearts(next, beatHeartCount(next));
    next = expireGaugeRegenerations(next, 'heart-event');
  }
  if (sectionAt(next) !== sectionAt(state)) next = advanceSectionChange(next, applyEffect);
  const automatic = advanceAutomaticHeart(next.automaticHeart, heartCount(next), dt);
  next = { ...next, automaticHeart: automatic.state };
  const collected = automatic.shouldCollect ? collectHearts(next) : next;
  const reactive = refreshEffectInducers(collected, applyEffect);
  const mood = moodValue(reactive);
  return mood === reactive.moodHistory.at(-1)?.moodValue
    ? reactive
    : {
        ...reactive,
        moodHistory: recordMoodHistory(reactive.moodHistory, {
          timeMilliseconds: Math.trunc((tick * 1000) / rules.ticksPerSecond),
          moodValue: mood,
        }),
      };
}
