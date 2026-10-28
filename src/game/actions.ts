import { liveCurrentHandCardInstanceIds, liveHandCardButtonId } from '../runtime/cards/liveHand.ts';
import { beginLiveAllHandSkill } from '../runtime/cards/allHandDeckActions.ts';
import { moveCardsToBoard } from './cards/deckBoard.ts';
import { liveBoardState } from '../runtime/cards/deckBoardState.ts';
import { clearLiveCardSkillActivatedFlags } from '../runtime/cards/cardSkillActivatedFlags.ts';
import {
  canActivateLiveSkillEffect,
  createLiveSkillEffectActivationState,
} from '../runtime/skills/skillEffectActivation.ts';
import { beginTokenGeneration, finishTokenGeneration } from './cards/tokens.ts';
import { applyBeforeUseAbility } from './cards/beforeUse.ts';
import { drainModeChanges } from './effects/modeChange.ts';
import { resolveModeAbility, resolveModeSkill } from './live/modes.ts';
import { collectHearts } from './hearts.ts';
import { type Action, type Card, type GameState } from './model.ts';
import { applyEffect } from './effects.ts';
import { spendAp } from './resources.ts';
import { canUseCard, cardAt } from './projection.ts';
import { cardCost } from './cards/cost.ts';
import { finishCardActivation } from './cards/cardZones.ts';
import { useSpecial } from './special.ts';
import {
  applyAbilityEffects,
  applyUseAbility,
  notifyHandCardBeforeUse,
  notifyHandSkillUse,
} from './cards/useAbilities.ts';
import { advanceProxySkillUses } from './effects/proxySkill.ts';
import { deactivateHandLimitEffects } from './effects/handLimit.ts';
import { deactivateHandMaxCardEffects } from './effects/handMaxCard.ts';
import { deactivateApSpeedEffects } from './effects/apSpeed.ts';
import { deactivateVoltageConversions } from './effects/voltageConversion.ts';
import { deactivateAction52SkillBoosts } from './effects/action52SkillBoost.ts';
import { flushHandCardCountActions } from './cards/drawing.ts';
import { deactivateMentalHeartInducers } from './effects/mentalHeartInduce.ts';
import { deactivateComboInducer, notifyComboSkillPoint } from './effects/comboInduce.ts';
import { deactivateHeartLimitBuffs } from './effects/heartLimit.ts';
import { deactivateVoltageIncreaseStops } from './effects/stopVoltageIncrease.ts';
import {
  deactivateAdditionalHeartInducers,
  induceAdditionalHearts,
} from './effects/additionalHeart.ts';
import { deactivateLoveUpAdditionalBuffs } from './effects/loveUpAdditionalBuff.ts';
import { deactivateMentalRecoverAdditionalBuffs } from './effects/mentalRecoverAdditionalBuff.ts';
import { deactivateMentalBarrierAdditionalBuffs } from './effects/mentalBarrierAdditionalBuff.ts';
import { deactivateDisableMentalDownEffects } from './effects/disableMentalDown.ts';
import { deactivateGaugeInfinities } from './resources.ts';
import { deactivateSkillCooldownEffects } from './effects/skillCooldown.ts';
import { deactivateInducedSkillEffects } from './effects/induceSkillEffect.ts';
import { deactivateTokenDeck, switchTokenDeck } from './effects/tokenDeckSplit.ts';
import { registerMissionMember, skipIngameMission } from './ingameMissions.ts';
import { deactivateBeatHeartValueBuffs } from './effects/beatHeartValueBuff.ts';
import { deactivateMoodChangeSkills } from './effects/moodChangeSkill.ts';
import { deactivateHeartLimitAdditionalBuffs } from './effects/heartLimitBoost.ts';
import { deactivateMoodValueAdditionalBuffs } from './effects/moodValueBoost.ts';
import { refreshEffectInducers } from './effects/effectInduce.ts';
import { deactivateBeatPointBuffs } from './effects/beatPointBuff.ts';
import { deactivateGaugeRegenerations } from './live/gaugeRegeneration.ts';
import { deactivateSearchRequests } from './cards/search.ts';
import { deactivateHeartBoosts } from './live/heartBoosts.ts';
import { deactivateSkillCostChanges } from './cards/skillCostChanges.ts';
import { deactivateFixedParameterExtends } from './effects/fixedParameterExtend.ts';

export function act(state: GameState, action: Action): GameState {
  return refreshEffectInducers(actInternal(state, action), applyEffect);
}

function actInternal(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'start':
      return state.phase === 'ready' ? { ...state, phase: 'playing' } : state;
    case 'pause':
      return state.phase === 'playing' ? { ...state, phase: 'paused' } : state;
    case 'resume':
      return state.phase === 'paused' ? { ...state, phase: 'playing' } : state;
    case 'collect':
      return state.phase === 'playing' ? collectHearts(state) : state;
    case 'special':
      return useSpecial(state, action.cardId);
    case 'card':
      return useCard(state, action.index);
    case 'switch-token-deck':
      return switchTokenDeck(state, applyEffect);
    case 'deactivate-token-deck':
      return deactivateTokenDeck(state, action.deactivationKey, applyEffect);
    case 'skip-ingame-mission':
      return skipIngameMission(state);
    case 'deactivate-hand-limit': {
      const changed = deactivateHandLimitEffects(state, action.deactivationKey);
      return state.activation === null ? flushHandCardCountActions(changed) : changed;
    }
    case 'deactivate-hand-max-card':
      return deactivateHandMaxCardEffects(state, action.deactivationKey);
    case 'deactivate-ap-speed':
      return deactivateApSpeedEffects(state, action.deactivationKey);
    case 'deactivate-voltage-convert':
      return deactivateVoltageConversions(state, action.deactivationKey);
    case 'deactivate-skill-boost':
      return deactivateAction52SkillBoosts(state, action.deactivationKey);
    case 'deactivate-mental-heart-induce':
      return deactivateMentalHeartInducers(state, action.deactivationKey);
    case 'deactivate-combo-induce':
      return deactivateComboInducer(state, action.deactivationKey);
    case 'deactivate-heart-limit':
      return deactivateHeartLimitBuffs(state, action.deactivationKey);
    case 'deactivate-voltage-increase':
      return deactivateVoltageIncreaseStops(state, action.deactivationKey);
    case 'deactivate-additional-heart':
      return deactivateAdditionalHeartInducers(state, action.deactivationKey);
    case 'deactivate-love-up-additional-buff':
      return deactivateLoveUpAdditionalBuffs(state, action.deactivationKey);
    case 'deactivate-mental-recover-additional-buff':
      return deactivateMentalRecoverAdditionalBuffs(state, action.deactivationKey);
    case 'deactivate-mental-barrier-additional-buff':
      return deactivateMentalBarrierAdditionalBuffs(state, action.deactivationKey);
    case 'deactivate-mental-down':
      return deactivateDisableMentalDownEffects(state, action.deactivationKey);
    case 'deactivate-token-boost':
      return {
        ...state,
        tokenBoosts: state.tokenBoosts.filter(
          (buff) => buff.deactivationKey !== action.deactivationKey,
        ),
      };
    case 'deactivate-fixed-parameter-extend':
      return deactivateFixedParameterExtends(state, action.deactivationKey);
    case 'deactivate-infinity-gauge':
      return deactivateGaugeInfinities(state, action.deactivationKey, applyEffect);
    case 'deactivate-skill-cooldown':
      return deactivateSkillCooldownEffects(state, action.deactivationKey);
    case 'deactivate-induced-skill-effect':
      return deactivateInducedSkillEffects(state, action.deactivationKey);
    case 'deactivate-beat-heart-value-buff':
      return deactivateBeatHeartValueBuffs(state, action.deactivationKey);
    case 'deactivate-mood-change-skill':
      return deactivateMoodChangeSkills(state, action.deactivationKey);
    case 'deactivate-heart-limit-boost':
      return deactivateHeartLimitAdditionalBuffs(state, action.deactivationKey);
    case 'deactivate-mood-value-boost':
      return deactivateMoodValueAdditionalBuffs(state, action.deactivationKey);
    case 'deactivate-beat-point-buff':
      return deactivateBeatPointBuffs(state, action.deactivationKey);
    case 'deactivate-gauge-regeneration':
      return deactivateGaugeRegenerations(state, action.deactivationKey);
    case 'deactivate-search':
      return deactivateSearchRequests(state, action.deactivationKey);
    case 'deactivate-heart-boost':
      return deactivateHeartBoosts(state, action.deactivationKey);
    case 'deactivate-skill-cost-change':
      return deactivateSkillCostChanges(state, action.deactivationKey);
    case 'deactivate-skill-score-up':
      return {
        ...state,
        skillScoreUps: state.skillScoreUps.filter(
          (boost) => boost.deactivationKey !== action.deactivationKey,
        ),
      };
  }
}

function useCard(state: GameState, index: number): GameState {
  if (!canUseCard(state, index)) return state;
  const source = cardAt(state, index);
  const paid = spendAp(state, cardCost(state, source));
  const activated = {
    ...paid,
    deckBoard: clearLiveCardSkillActivatedFlags(paid.deckBoard, source.cardInstanceId),
    activation: {
      sourceId: source.cardInstanceId,
      handCardButtonId: liveHandCardButtonId(state, source.cardInstanceId),
      usedCards: [],
      hasUseAllHandSkill: source.effects.some((effect) => effect.kind === 'use-hand'),
      pendingHandStatsDeactivationKeys: [],
    },
  };
  return finishCardActivation(
    activateCard(activated, source, liveCurrentHandCardInstanceIds(state), false),
  );
}

function activateCard(
  state: GameState,
  card: Card,
  initialHand: readonly string[],
  allHand: boolean,
): GameState {
  if (!state.activation) throw new Error('カードの使用処理がありません。');
  const previousSkillType = state.currentSkillType;
  const usedSkillCost = cardCost(state, card, allHand);
  let next: GameState = {
    ...state,
    currentSkillType: 2,
    onceSkillCostChanges: Object.fromEntries(
      Object.entries(state.onceSkillCostChanges).filter(([id]) => id !== card.cardInstanceId),
    ),
    activation: {
      ...state.activation,
      usedCards: [...state.activation.usedCards, card.cardInstanceId],
    },
    lastActionTick: state.tick,
    lastPerformer: card.performer,

    deckDrawContext: {
      currentDrawType: 1 as const,
      usedCard: card,
      usedSkill: { skillType: 2 as const, skillMainEffect: card.skillMainEffect ?? null },
    },
    skillActivationCounts: {
      ...state.skillActivationCounts,
      [card.cardInstanceId]: Number(
        BigInt.asIntN(32, BigInt((state.skillActivationCounts[card.cardInstanceId] ?? 0) + 1)),
      ),
    },
    cardUseCounts: {
      ...state.cardUseCounts,
      [card.cardInstanceId]: (state.cardUseCounts[card.cardInstanceId] ?? 0) + 1,
    },
    lastCardName: card.name,
    stats: { ...state.stats, cardsUsed: state.stats.cardsUsed + 1 },
    cardUses: [
      ...state.cardUses,
      {
        key: state.stats.cardsUsed + 1,
        card,
        tick: state.tick,
        handIndex: initialHand.indexOf(card.cardInstanceId),
        handCount: initialHand.length,
        consumeAp: usedSkillCost,
      },
    ],
  };
  next = notifyHandCardBeforeUse(next, card, 2, applyEffect);
  next = beginTokenGeneration(
    retireCard(applyBeforeUseAbility(next, card), card, allHand),
    card.cardInstanceId,
  );
  next = notifyComboSkillPoint(next, card, usedSkillCost);
  const effectIdentities = card.effects.map((effect, index) => ({
    id: String(index),
    actionType: effect.kind === 'use-hand' ? 42 : 0,
  }));
  const skillEffects = createLiveSkillEffectActivationState(effectIdentities);
  for (const [index, effect] of card.effects.entries()) {
    if (effect.kind !== 'use-hand') {
      next = applyEffect(next, effect, card);
      continue;
    }
    if (
      !canActivateLiveSkillEffect({ id: String(index), actionType: 42 }, skillEffects, {
        isSkill: true,
        activeAllHandSkill: allHand,
      })
    )
      continue;
    next = beginLiveAllHandSkill({ ...next, modes: { ...next.modes, held: true } });
    const children = [...liveCurrentHandCardInstanceIds(next)];
    for (const id of children) {
      const child = next.deck.find((item) => item.cardInstanceId === id);
      if (child) next = activateCard(next, resolveModeSkill(child, next.modes), initialHand, true);
    }
    next = drainModeChanges({ ...next, modes: { ...next.modes, held: false } }, applyEffect);
  }
  const tokenGeneration = finishTokenGeneration(next, card.cardInstanceId);
  next = tokenGeneration.state;
  next = registerMissionMember(notifyHandSkillUse(next, card, applyEffect), card.charactersId);
  const ability = resolveModeAbility(card, next.modes);
  next = applyAbilityEffects(next, card, ability.ability893Effects ?? [], applyEffect);
  next = applyAbilityEffects(next, card, ability.ability894Effects ?? [], applyEffect);
  next = advanceProxySkillUses(
    applyUseAbility(next, card),
    card.cardInstanceId,
    usedSkillCost,
    applyEffect,
  );
  next = induceAdditionalHearts(next, card, usedSkillCost, applyEffect);
  return { ...next, currentSkillType: previousSkillType };
}

function retireCard(state: GameState, card: Card, allHand: boolean): GameState {
  return {
    ...moveCardsToBoard(
      state,
      [card.cardInstanceId],
      allHand ? liveBoardState.extra2 : liveBoardState.extra,
    ),
    relayUsed: state.relayUsed.filter((id) => id !== card.cardInstanceId),
    handHeartCollectCounts: Object.fromEntries(
      Object.entries(state.handHeartCollectCounts).filter(([id]) => id !== card.cardInstanceId),
    ),
  };
}
