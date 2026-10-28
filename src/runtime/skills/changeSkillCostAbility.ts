import {
  liveChangeSkillCostConditionValue,
  type LiveChangeSkillCostContext,
} from './changeSkillCostCondition.ts';
import { calculateLiveChangeSkillCostValue } from './changeSkillCostValue.ts';
import type { LiveChangeApEffect } from '../cards/deckActionTypes.ts';
import {
  advanceLiveSkillEffectDuration,
  type LiveSkillEffectDuration,
} from './skillEffectDuration.ts';

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
        calculateLiveChangeSkillCostValue(
          effect,
          liveChangeSkillCostConditionValue(effect, context),
        ),
      0,
    );
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
    !Number.isSafeInteger(context.useCount) ||
    context.useCount < 0 ||
    !Number.isFinite(context.loveUpEffect)
  )
    throw new Error('Live ChangeSkillCost context is invalid');
}
