import { applyApRecovery } from './effects/apRecovery.ts';
import { enqueueHandShuffle } from './cards/boardActions.ts';
import { setVoltageValue } from './resources.ts';
import { evaluateCondition } from './conditions/evaluate.ts';
import { conditionContext } from './conditions/gameContext.ts';
import { addModeReaction, changeMode } from './effects/modeChange.ts';
import { applyResourceEffect } from './effects/resourceEffect.ts';
import { applyScoreBoost } from './effects/scoreBoost.ts';
import { moodValue, sectionAt } from './projection.ts';
import { voltageLevel } from './live/voltageLevel.ts';
import { activateGenesis } from './genesis.ts';
import { collectHearts } from './hearts.ts';
import { type Card, type Effect, type GameState } from './model.ts';
import { applyTokenCardEffect, requestTokens } from './cards/tokens.ts';
import { activateTokenBoost } from './effects/tokenBoost.ts';
import { activateSkillCooldown } from './effects/skillCooldown.ts';
import { skillValue } from './effects/skillValue.ts';
import { applySpecialReset } from './effects/specialReset.ts';
import { activateInfinityGauge } from './effects/infinityGauge.ts';
import { applyGaugeRegeneration } from './effects/gaugeRegeneration.ts';
import { applyMentalBarrier } from './effects/mentalBarrier.ts';
import {
  activateAction52SkillBoost,
  applyAction52SkillBoostForCard,
} from './effects/action52SkillBoost.ts';
import { addHeartBoost } from './live/heartBoosts.ts';
import { createHeartsFromEffect } from './effects/heartCreation.ts';
import { createSkillHeartsFromEffect } from './effects/skillHearts.ts';
import { resolveEffectParameterDetails } from './parameters/parameterValueChange.ts';
import { applyParameterEffect, isParameterEffect } from './parameters/applyParameterEffect.ts';
import { applyHandLimit } from './effects/handLimit.ts';
import { activateHeartLimitChange, applyHeartLimitEffect } from './effects/heartLimit.ts';
import { dispatchEarlyEffect } from './effects/earlyEffectDispatch.ts';
import { applyVoltageTier } from './effects/voltageTier.ts';
import { applyAmplifyEffect } from './effects/amplify.ts';
import { applyApSpeedChange, applyApSpeedPercent } from './effects/apSpeed.ts';
import { activateMentalHeartInduce } from './effects/mentalHeartInduce.ts';
import { activateComboInduce } from './effects/comboInduce.ts';
import { activateVoltageIncreaseStop } from './effects/stopVoltageIncrease.ts';
import { activateAdditionalHeartInduce } from './effects/additionalHeart.ts';
import { activateInducedSkillEffect } from './effects/induceSkillEffect.ts';
import { activateTokenDeckSplit } from './effects/tokenDeckSplit.ts';
import { missionActionEffect, startIngameMission } from './ingameMissions.ts';
import { activateBeatHeartValueBuff } from './effects/beatHeartValueBuff.ts';
import { activateHandMaxCard } from './effects/handMaxCard.ts';
import { activateMentalShield } from './effects/mentalShield.ts';
import { refreshEffectInducers } from './effects/effectInduce.ts';
import {
  activateFixedParameterExtend,
  changeFixedParameterBase,
} from './effects/fixedParameterExtend.ts';
import { incrementSkillEffectActivationCount } from './effects/skillEffectActivation.ts';
export { skillValue } from './effects/skillValue.ts';
export function applyEffect(
  state: GameState,
  effect: Effect,
  card?: Card,
  multiplier = 1,
  addValue = 0,
  effectPower = 1,
): GameState {
  const applied = applyEffectInternal(state, effect, card, multiplier, addValue, effectPower);
  const counted = incrementSkillEffectActivationCount(applied, effect, card);
  const notified = missionActionEffect(counted, effect, state);
  return refreshEffectInducers(notified, applyEffect);
}

function applyEffectInternal(
  state: GameState,
  effect: Effect,
  card: Card | undefined,
  multiplier: number,
  addValue: number,
  effectPower: number,
): GameState {
  effect = resolveEffectParameterDetails(state, card, effect);
  const earlyEffect = dispatchEarlyEffect(
    state,
    effect,
    card,
    multiplier,
    addValue,
    effectPower,
    applyEffect,
  );
  if (earlyEffect) return earlyEffect;
  if (effect.kind === 'hand-max-card') return activateHandMaxCard(state, effect);
  if (effect.kind === 'mental-heart-induce')
    return activateMentalHeartInduce(state, effect, card, multiplier, addValue);
  if (effect.kind === 'combo-induce')
    return activateComboInduce(state, effect, card, multiplier, addValue);
  if (effect.kind === 'heart-limit-change')
    return activateHeartLimitChange(state, effect, card, multiplier, addValue, effectPower);
  if (effect.kind === 'additional-heart-induce')
    return activateAdditionalHeartInduce(state, effect, card, multiplier, addValue);
  if (effect.kind === 'induce-skill-effect')
    return activateInducedSkillEffect(state, effect, card, multiplier, addValue);
  if (effect.kind === 'skill-boost') return activateAction52SkillBoost(state, effect);
  if (effect.kind === 'ap-speed')
    return applyApSpeedPercent(state, effect.percent, effect.duration);
  if (effect.kind === 'voltage-tier')
    return applyVoltageTier(state, effect, card, multiplier, addValue, applyEffect, effectPower);
  if (effect.kind === 'ap-speed-change')
    return applyApSpeedChange(state, effect, card, multiplier, addValue);
  if (isParameterEffect(effect))
    return applyParameterEffect(state, effect, card, multiplier, addValue);
  const value = (amount: number) =>
    Math.fround(
      skillValue(state, Math.fround(Math.fround(amount + addValue) * multiplier), effect, card),
    );
  switch (effect.kind) {
    case 'branch': {
      const context = conditionContext(state);
      const bothGenesisBranches =
        context.genesisActive &&
        (effect.condition.kind === 'mental-at-most' ||
          effect.condition.kind === 'voltage-level-at-most');
      const alwaysTrueBranch =
        effect.condition.kind === 'heat' || effect.condition.kind === 'mental';
      const effects = bothGenesisBranches
        ? [...effect.whenTrue, ...effect.whenFalse]
        : alwaysTrueBranch || evaluateCondition(effect.condition, context)
          ? effect.whenTrue
          : effect.whenFalse;
      return effects.reduce(
        (next, child) => applyEffect(next, child, card, multiplier, addValue, effectPower),
        state,
      );
    }
    case 'mode':
      return changeMode(state, effect, applyEffect);
    case 'mode-reaction':
      return addModeReaction(state, effect, card);
    case 'conditional':
      return (
        effect.condition === 'happy100'
          ? moodValue(state) >= 100
          : effect.condition === 'mellow100'
            ? moodValue(state) <= -100
            : effect.condition === 'mental0'
              ? state.genesis.effects.length > 0 || Math.trunc(state.mental.currentMental) === 0
              : effect.condition === 'deck80'
                ? state.deck.length >= 80
                : effect.condition === 'first-section'
                  ? sectionAt(state) === state.track.sections[0]
                  : sectionAt(state) === state.track.sections.at(-1)
      )
        ? effect.effects.reduce(
            (next, item) => applyEffect(next, item, card, multiplier, addValue, effectPower),
            state,
          )
        : state;
    case 'mood': {
      const base = Math.fround(value(effect.amount) * effectPower);
      const boosted = applyAction52SkillBoostForCard(state, card, base);
      const amount = Math.ceil(boosted.value);
      return {
        ...boosted.state,
        moodOffset: boosted.state.moodOffset + amount,
      };
    }
    case 'hearts':
      return createHeartsFromEffect(
        state,
        value(effect.amount),
        card,
        false,
        effectPower,
        effect.lifetimeSeconds,
      );
    case 'skill-hearts':
      return createSkillHeartsFromEffect(state, effect, card, multiplier, addValue, effectPower);
    case 'beat-hearts':
      return createHeartsFromEffect(state, value(effect.amount), card, true);
    case 'tokens':
      return requestTokens(state, effect.token, effect.count, card?.id ?? null, effect.seriesIds);
    case 'token-card':
      return applyTokenCardEffect(state, effect, card?.id ?? null);
    case 'token-boost':
      return activateTokenBoost(state, effect, card, multiplier, addValue);
    case 'token-deck-split':
      return activateTokenDeckSplit(state, effect, applyEffect);
    case 'ingame-mission':
      return startIngameMission(state, effect.groupId);
    case 'hand-limit':
      return applyHandLimit(state, effect, card, multiplier, addValue);
    case 'heart-limit':
      return applyHeartLimitEffect(state, value(effect.amount), card, effectPower);
    case 'shuffle':
      return enqueueHandShuffle(state, effect, card?.id ?? null);
    case 'search-unit':
    case 'search-token':
    case 'search': {
      const target =
        effect.kind === 'search'
          ? effect.target
          : effect.kind === 'search-unit'
            ? { kind: 'unit' as const, unit: effect.unit }
            : { kind: 'token' as const, token: effect.token };
      return {
        ...state,
        deckActions: {
          ...state.deckActions,
          searches: [
            ...state.deckActions.searches,
            ...Array.from({ length: effect.count }, () => ({
              scope: effect.kind === 'search' ? effect.scope : ('skill' as const),
              target,
              deactivationKey: effect.kind === 'search' ? (effect.deactivationKey ?? null) : null,
            })),
          ],
        },
      };
    }
    case 'use-hand':
      throw new Error('一斉使用はカード使用処理で実行してください。');
    case 'card-move': {
      if (
        !card ||
        state.skillUseDestinations[card.id] === 'exclusion' ||
        state.skillUseDestinations[card.id] === 'proxy'
      )
        return state;
      return {
        ...state,
        skillUseDestinations: { ...state.skillUseDestinations, [card.id]: effect.destination },
      };
    }
    case 'ap':
      return applyApRecovery(state, effect, card, {
        addValue,
        multiplyFactor: multiplier,
        effectPower,
      });
    case 'ap-limit':
      return changeFixedParameterBase(state, 'ap', effect.amount);
    case 'reset-special':
      return applySpecialReset(state, effect, card);
    case 'mental-shield':
      return activateMentalShield(state, effect, card, multiplier, addValue, effectPower);
    case 'protect-mental':
      return effect.duration === 'section'
        ? { ...state, sectionMentalProtected: true, mental: { ...state.mental, mentalDown: false } }
        : { ...state, mentalProtected: true, mental: { ...state.mental, mentalDown: false } };
    case 'beat-count': {
      const boosted = applyAction52SkillBoostForCard(state, card, value(effect.amount));
      return {
        ...boosted.state,
        sectionBeatHeartBonus: boosted.state.sectionBeatHeartBonus + Math.trunc(boosted.value),
      };
    }
    case 'beat-heart-value-buff':
      return activateBeatHeartValueBuff(
        state,
        effect,
        card,
        effect.multiplier ?? multiplier,
        effect.addValue ?? addValue,
      );
    case 'heart-boost':
      return addHeartBoost(state, effect, card, multiplier, addValue);
    case 'voltage-limit':
      return changeFixedParameterBase(state, 'voltage', effect.amount);
    case 'fixed-parameter-extend':
      return activateFixedParameterExtend(state, effect, card);
    case 'voltage-set':
      return setVoltageValue(state, effect.amount, applyEffect);
    case 'stop-voltage-increase':
      return activateVoltageIncreaseStop(state, effect);
    case 'infinity-gauge':
      return activateInfinityGauge(state, effect, applyEffect);
    case 'gauge-regeneration':
      return applyGaugeRegeneration(
        state,
        effect,
        card,
        multiplier,
        addValue,
        effectPower,
        applyEffect,
      );
    case 'mental-barrier':
      return applyMentalBarrier(
        state,
        effect,
        card,
        multiplier,
        addValue,
        effectPower,
        applyEffect,
      );
    case 'mental':
    case 'voltage':
      return applyResourceEffect(
        state,
        effect.kind,
        card,
        value(effect.amount),
        effectPower,
        applyEffect,
      );
    case 'collect':
      return collectHearts(state);
    case 'boost':
      return applyScoreBoost(
        state,
        Math.fround(value(Math.round((effect.multiplier - 1) * 100)) * effectPower),
        card,
        effect.deactivationKey,
      );
    case 'amplify': {
      return applyAmplifyEffect(state, effect);
    }
    case 'skill-cooldown':
      return activateSkillCooldown(state, effect);
    case 'genesis': {
      const base = value(effect.effectValue);
      const boosted = applyAction52SkillBoostForCard(state, card, base);
      return activateGenesis(boosted.state, boosted.value);
    }
    case 'resource-boost': {
      const eligible =
        effect.condition === 'always' ||
        (effect.condition === 'mental100'
          ? state.mental.currentMental >= state.maximumMental
          : voltageLevel(state.currentVoltage, state.maximumVoltageLevel) >= 20);
      return eligible
        ? {
            ...state,
            resourceBoosts: [
              ...state.resourceBoosts,
              {
                target: effect.target,
                percent: Math.ceil(value(effect.percent)),
                uses: effect.uses,
                ...(effect.members ? { members: effect.members } : {}),
              },
            ],
          }
        : state;
    }
  }
  throw new Error('効果を実行できません。');
}
