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

export type LiveChangeSkillCostContext = Readonly<{
  useCount: number;
  voltageLevel: number;
  mentalRatio: number;
  sectionCount: number;
  deckCards: readonly LiveChangeSkillCostCard[];
  handCardInstanceIds: readonly number[];
  loveUpEffect: number;
  moodValue: number | null;
  excludeCount: number;
}>;

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
        sum +
        Math.ceil(
          Math.min(
            Math.max(effect.amount * resolveConditionValue(effect, context), effect.minimum),
            effect.maximum,
          ),
        ),
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
    case 'none':
      return 1;
    case 'use-count':
      return context.useCount;
    case 'voltage-level':
      return context.voltageLevel;
    case 'mental-ratio':
      return Math.min(context.mentalRatio, 1);
    case 'section-count':
      return context.sectionCount;
    case 'member-id-count':
      return count(context.deckCards, (card) => card.charactersId === effect.conditionId);
    case 'skill-icon-count':
      return count(context.deckCards, (card) => card.skillIcon === effect.conditionId);
    case 'hand-skill-icon-count':
      return count(handCards, (card) => card.skillIcon === effect.conditionId);
    case 'love-up-effect':
      return context.loveUpEffect;
    case 'hand-style-type-count':
      return count(handCards, (card) => card.styleType === effect.conditionId);
    case 'hand-member-id-count':
      return count(handCards, (card) => card.charactersId === effect.conditionId);
    case 'mood-value':
      if (context.moodValue === null) {
        throw new Error('Live ChangeSkillCost mood is unresolved');
      }
      switch (effect.conditionId) {
        case 0:
          return Math.abs(context.moodValue);
        case 1:
          return Math.max(context.moodValue, 0);
        case 2:
          return Math.max(-context.moodValue, 0);
        default:
          throw new Error('Live ChangeSkillCost mood condition ID is invalid');
      }
    case 'unit-id-count':
      return count(context.deckCards, (card) => card.unitIds.includes(effect.conditionId));
    case 'hand-unit-id-count':
      return count(handCards, (card) => card.unitIds.includes(effect.conditionId));
    case 'exclude-count':
      return context.excludeCount;
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
    ![context.mentalRatio, context.loveUpEffect].every(Number.isFinite) ||
    ![context.useCount, context.voltageLevel, context.sectionCount, context.excludeCount].every(
      Number.isSafeInteger,
    ) ||
    (context.moodValue !== null && !Number.isSafeInteger(context.moodValue)) ||
    context.useCount < 0 ||
    context.voltageLevel < 0 ||
    context.mentalRatio < 0 ||
    context.sectionCount < 0 ||
    context.excludeCount < 0 ||
    new Set(context.deckCards.map((card) => card.cardInstanceId)).size !==
      context.deckCards.length ||
    context.handCardInstanceIds.some(
      (cardInstanceId) => !context.deckCards.some((card) => card.cardInstanceId === cardInstanceId),
    )
  ) {
    throw new Error('Live ChangeSkillCost context is invalid');
  }
}
