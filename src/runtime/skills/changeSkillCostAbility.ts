import { type LiveConditionContext, liveConditionVoltageLevel } from '../live/conditionContext.ts';
import { liveMentalRatio } from '../live/mentalGauge.ts';
import {
  calculateLiveChangeSkillCostValue,
  liveSkillCostMoodValue,
} from './changeSkillCostValue.ts';
import type { LiveChangeApEffect } from '../cards/deckActionTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';

export type LiveChangeSkillCostCard = Readonly<{
  cardInstanceId: number;
  charactersId: number;
  skillIcon: number;
  styleType: number;
  unitIds: readonly number[];
}>;

export type LiveChangeSkillCostContext = Readonly<
  LiveConditionContext & {
    useCount: number;
    sectionCount: number;
    deckCards: readonly LiveChangeSkillCostCard[];
    handCardInstanceIds: readonly number[];
    loveUpEffect: number;
  }
>;

export type LiveChangeSkillCostAbilityState = Readonly<{
  effects: readonly Readonly<{
    cardInstanceId: number;
    effectId: string;
    amount: number;
    minimum: number;
    maximum: number;
    conditionType: LiveChangeApEffect['conditionType'];
    conditionId: number;
    duration: LiveSkillEffectDuration;
  }>[];
}>;

export function createLiveChangeSkillCostAbilityState(): LiveChangeSkillCostAbilityState {
  return { effects: [] };
}

export function activateLiveChangeSkillCostAbility(
  state: LiveChangeSkillCostAbilityState,
  cardInstanceId: number,
  effect: LiveChangeApEffect,
): LiveChangeSkillCostAbilityState {
  validateState(state);
  if (!Number.isSafeInteger(cardInstanceId) || cardInstanceId <= 0) {
    throw new Error('Live ChangeSkillCost card ID is invalid');
  }
  return {
    effects: [...state.effects, { cardInstanceId, ...effect }],
  };
}

export function advanceLiveChangeSkillCostAbilityState(
  state: LiveChangeSkillCostAbilityState,
  input: Readonly<{
    currentTimeSeconds: number;
    sectionChangeCount: number;
    musicEnded: boolean;
  }>,
): LiveChangeSkillCostAbilityState {
  validateState(state);
  return {
    effects: state.effects.flatMap((effect) => {
      const duration = advanceLiveSkillEffectDuration(effect.duration, input);
      return duration === null ? [] : [{ ...effect, duration }];
    }),
  };
}

export function resolveLiveChangeSkillCost(
  state: LiveChangeSkillCostAbilityState,
  cardInstanceId: number,
  context: LiveChangeSkillCostContext,
): number {
  validateState(state);
  validateContext(context);
  return state.effects
    .filter((effect) => effect.cardInstanceId === cardInstanceId)
    .reduce(
      (sum, effect) =>
        sum + calculateLiveChangeSkillCostValue(effect, resolveConditionValue(effect, context)),
      0,
    );
}

function resolveConditionValue(
  effect: LiveChangeSkillCostAbilityState['effects'][number],
  context: LiveChangeSkillCostContext,
): number {
  const handIds = new Set(context.handCardInstanceIds);
  const handCards = context.deckCards.filter((card) => handIds.has(card.cardInstanceId));
  switch (effect.conditionType) {
    case 1:
      return 1;
    case 2:
      return context.useCount;
    case 3:
      return liveConditionVoltageLevel(context);
    case 4:
      return Math.min(liveMentalRatio(context.mental, context.maximumMental), 1);
    case 5:
      return context.sectionCount;
    case 6:
      return count(context.deckCards, (card) => card.charactersId === effect.conditionId);
    case 7:
      return count(context.deckCards, (card) => card.skillIcon === effect.conditionId);
    case 8:
      return count(handCards, (card) => card.skillIcon === effect.conditionId);
    case 9:
      return context.loveUpEffect;
    case 10:
      return count(handCards, (card) => card.styleType === effect.conditionId);
    case 11:
      return count(handCards, (card) => card.charactersId === effect.conditionId);
    case 12:
      return liveSkillCostMoodValue(context.moodValue, effect.conditionId);
    case 13:
      return count(context.deckCards, (card) => card.unitIds.includes(effect.conditionId));
    case 14:
      return count(handCards, (card) => card.unitIds.includes(effect.conditionId));
    case 15:
      return context.exclusionCount;
  }
}

function count(
  cards: readonly LiveChangeSkillCostCard[],
  predicate: (card: LiveChangeSkillCostCard) => boolean,
): number {
  return cards.filter(predicate).length;
}

function validateState(state: LiveChangeSkillCostAbilityState): void {
  if (
    state.effects.some(
      (effect) =>
        effect.effectId.length === 0 ||
        !Number.isSafeInteger(effect.cardInstanceId) ||
        effect.cardInstanceId <= 0 ||
        ![effect.amount, effect.minimum, effect.maximum].every(Number.isFinite) ||
        effect.minimum > effect.maximum,
    )
  ) {
    throw new Error('Live ChangeSkillCost state is invalid');
  }
}

function validateContext(context: LiveChangeSkillCostContext): void {
  if (
    ![liveMentalRatio(context.mental, context.maximumMental), context.loveUpEffect].every(
      Number.isFinite,
    ) ||
    ![
      context.useCount,
      liveConditionVoltageLevel(context),
      context.sectionCount,
      context.exclusionCount,
    ].every(Number.isSafeInteger) ||
    (context.moodValue !== null && !Number.isSafeInteger(context.moodValue)) ||
    context.useCount < 0 ||
    liveConditionVoltageLevel(context) < 0 ||
    liveMentalRatio(context.mental, context.maximumMental) < 0 ||
    context.sectionCount < 0 ||
    context.exclusionCount < 0 ||
    new Set(context.deckCards.map((card) => card.cardInstanceId)).size !==
      context.deckCards.length ||
    context.handCardInstanceIds.some(
      (cardInstanceId) => !context.deckCards.some((card) => card.cardInstanceId === cardInstanceId),
    )
  ) {
    throw new Error('Live ChangeSkillCost context is invalid');
  }
}
