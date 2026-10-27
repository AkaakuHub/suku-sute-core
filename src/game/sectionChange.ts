import type { GameState } from './model.ts';
import type { EffectApplier } from './effects/induceSkillEffect.ts';
import { notifyHandSectionChange } from './cards/handInduce.ts';
import { expireTokenDeckSplitSections } from './effects/tokenDeckSplit.ts';
import { expireSkillCooldownSections } from './effects/skillCooldown.ts';
import { expireInducedSkillEffectSections } from './effects/induceSkillEffect.ts';
import { expireApSpeedSections } from './effects/apSpeed.ts';
import { expireVoltageConversionSections } from './effects/voltageConversion.ts';
import { expireTimedSkillBuffSections } from './effects/timedSkillBuffs.ts';
import { expireMentalHeartInducerSections } from './effects/mentalHeartInduce.ts';
import { expireComboInducerSections } from './effects/comboInduce.ts';
import { expireHeartLimitBuffSections } from './effects/heartLimit.ts';
import { expireAdditionalHeartInducerSections } from './effects/additionalHeart.ts';
import { advanceProxySkillSections } from './effects/proxySkill.ts';
import { expireHandLimitSections } from './effects/handLimit.ts';
import { restoreHandLimitCount } from './cards/drawing.ts';
import { expireGaugeInfinities } from './resources.ts';
import { expireGaugeRegenerations } from './live/gaugeRegeneration.ts';
import { expireMentalBarriers } from './live/mentalBarriers.ts';
import { expireVoltageIncreaseStopSections } from './effects/stopVoltageIncrease.ts';
import { expireSectionHeartBoosts } from './live/heartBoosts.ts';
import { expireBeatPointBuffSections } from './effects/beatPointBuff.ts';

export function advanceSectionChange(state: GameState, applyEffect: EffectApplier): GameState {
  let next = expireTokenDeckSplitSections(state, applyEffect);
  next = expireSkillCooldownSections(next);
  next = expireInducedSkillEffectSections(next);
  next = expireApSpeedSections(next);
  next = expireVoltageConversionSections(next);
  next = expireTimedSkillBuffSections(next);
  next = expireMentalHeartInducerSections(next);
  next = expireComboInducerSections(next);
  next = expireHeartLimitBuffSections(next);
  next = expireAdditionalHeartInducerSections(next);
  next = advanceProxySkillSections(next, applyEffect);
  const expiredHandLimit = expireHandLimitSections(next);
  next = expiredHandLimit.state;
  if (expiredHandLimit.handAdjustment > 0)
    next = restoreHandLimitCount(next, expiredHandLimit.handAdjustment);
  next = expireGaugeInfinities(next, 'sections', 1, applyEffect);
  next = expireGaugeRegenerations(next, 'sections');
  next = expireMentalBarriers(next, 'sections', 1);
  next = expireVoltageIncreaseStopSections(next);
  next = expireBeatPointBuffSections(next);
  next = {
    ...next,
    tokenBoosts: next.tokenBoosts.flatMap((boost) => {
      if (boost.remainingSections === null) return [boost];
      const remainingSections = boost.remainingSections - 1n;
      return remainingSections > 0n ? [{ ...boost, remainingSections }] : [];
    }),
    skillScoreUps: next.skillScoreUps.flatMap((boost) => {
      if (boost.remainingSections === null) return [boost];
      const remainingSections = boost.remainingSections - 1;
      return remainingSections > 0 ? [{ ...boost, remainingSections }] : [];
    }),
    moodOffset: 0,
    sectionMentalProtected: false,
    sectionBeatHeartBonus: 0,
    heartBoosts: expireSectionHeartBoosts(next.heartBoosts),
    skillCostChanges: next.skillCostChanges.flatMap((change) => {
      if (change.remainingSections === null) return [change];
      const remainingSections = change.remainingSections - 1;
      return remainingSections > 0 ? [{ ...change, remainingSections }] : [];
    }),
    amplification: next.amplification - next.sectionAmplification,
    sectionAmplification: 0,
    targetBoosts: next.targetBoosts.filter((boost) => boost.duration === 'stage'),
  };
  return notifyHandSectionChange(next, applyEffect);
}
