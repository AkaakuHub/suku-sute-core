import {
  addLiveHandCardTargetCount,
  resetLiveHandCardTargetCount,
} from '../../runtime/cards/handCardTarget.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { skillValue } from './skillValue.ts';
import { isProxyTargetReached } from './proxySkill.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { int64ToFloat32 } from '../../runtime/numeric.ts';

type HandLimitEffect = Extract<Effect, { kind: 'hand-limit' }>;

export function applyHandLimit(
  state: GameState,
  effect: HandLimitEffect,
  card: Card | undefined,
  multiplier: number,
  addValue = 0,
): GameState {
  const baseAmount = effect.amount;
  if (effect.displayTimeType === 2 && effect.displayTime === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const scaledAmount = int32(
    Math.fround(Math.fround(baseAmount + Math.fround(addValue)) * Math.fround(multiplier)),
  );
  const skillBoosted = skillValue(state, scaledAmount, effect, card);
  const action52 = applyAction52SkillBoostForCard(state, card, skillBoosted);
  const amount = int32(action52.value);
  const currentState = action52.state;
  const absorption =
    effect.calculationType === 1 && amount >= 0 ? absorbHandLimit(currentState, amount) : null;
  const appliedAmount = effect.calculationType !== 1 || absorption?.absorbed ? 0 : amount;
  const activation = currentState.activation;
  const handLimitEffects =
    amount === 0
      ? currentState.handLimitEffects
      : [
          ...currentState.handLimitEffects,
          {
            amount: appliedAmount,
            expirationAmount: -amount | 0,
            deactivationKey: effect.deactivationKey ?? null,
            remainingSeconds:
              effect.invocationType !== undefined || effect.displayTimeType !== 1
                ? null
                : Math.fround(int64ToFloat32(effect.displayTime) / 1000),
            remainingSections:
              effect.invocationType !== undefined || effect.displayTimeType !== 2
                ? null
                : effect.displayTime,
          },
        ];
  return {
    ...currentState,
    tokenCardDeck:
      appliedAmount === 0
        ? currentState.tokenCardDeck
        : addLiveHandCardTargetCount(currentState.tokenCardDeck, appliedAmount),
    handLimitEffects,
    ...(activation && card && appliedAmount !== 0
      ? {
          activation: {
            ...activation,
            handCountChanges: {
              ...activation.handCountChanges,
              [card.cardInstanceId]: appliedAmount,
            },
          },
        }
      : {}),
    ...(absorption ? { proxyAbsorptions: absorption.absorptions } : {}),
  };
}

export function advanceHandLimitEffects(state: GameState, elapsedSeconds: number): HandLimitExpiry {
  return expireHandLimitEffects(state, (effect) => {
    if (effect.remainingSeconds === null) return effect;
    const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? { ...effect, remainingSeconds } : null;
  });
}

export function expireHandLimitSections(state: GameState): HandLimitExpiry {
  return expireHandLimitEffects(state, (effect) => {
    if (effect.remainingSections === null) return effect;
    const remainingSections = effect.remainingSections - 1n;
    return remainingSections > 0n ? { ...effect, remainingSections } : null;
  });
}

function int32(value: number): number {
  return Number(BigInt.asIntN(32, BigInt(Math.trunc(value))));
}

export function deactivateHandLimitEffects(
  state: GameState,
  deactivationKey: string,
): HandLimitExpiry {
  const retainedEffects = state.handLimitEffects.filter(
    (effect) => effect.deactivationKey !== deactivationKey,
  );
  if (retainedEffects.length === state.handLimitEffects.length) return { state, handAdjustment: 0 };
  const expiredAmount = state.handLimitEffects
    .filter((effect) => effect.deactivationKey === deactivationKey)
    .reduce((sum, effect) => (sum + effect.expirationAmount) | 0, 0);
  return restoreHandLimitEffects(state, retainedEffects, expiredAmount);
}

type HandLimitExpiry = Readonly<{ state: GameState; handAdjustment: number }>;

function expireHandLimitEffects(
  state: GameState,
  advance: (
    effect: GameState['handLimitEffects'][number],
  ) => GameState['handLimitEffects'][number] | null,
): HandLimitExpiry {
  let expiredAmount = 0;
  const handLimitEffects = state.handLimitEffects.flatMap((effect) => {
    const next = advance(effect);
    if (next) return [next];
    expiredAmount = (expiredAmount + effect.expirationAmount) | 0;
    return [];
  });
  return restoreHandLimitEffects(state, handLimitEffects, expiredAmount);
}

function restoreHandLimitEffects(
  state: GameState,
  handLimitEffects: GameState['handLimitEffects'],
  expiredAmount: number,
): HandLimitExpiry {
  if (expiredAmount === 0) return { state: { ...state, handLimitEffects }, handAdjustment: 0 };
  const resetAmount = expiredAmount;
  const minimumCorrection =
    state.tokenCardDeck.handTargetCounts.current > 3
      ? 0
      : state.tokenCardDeck.handTargetCounts.current - 3;
  return {
    state: {
      ...state,
      tokenCardDeck: resetLiveHandCardTargetCount(state.tokenCardDeck, resetAmount),
      handLimitEffects,
    },
    handAdjustment: Math.max(0, minimumCorrection + resetAmount),
  };
}

function absorbHandLimit(
  state: GameState,
  amount: number,
): Readonly<{ absorptions: GameState['proxyAbsorptions']; absorbed: boolean }> | null {
  for (
    let absorptionIndex = 0;
    absorptionIndex < state.proxyAbsorptions.length;
    absorptionIndex += 1
  ) {
    const absorption = state.proxyAbsorptions[absorptionIndex];
    if (!absorption) continue;
    for (let effectIndex = 0; effectIndex < absorption.effects.length; effectIndex += 1) {
      const effect = absorption.effects[effectIndex];
      if (!effect) continue;
      if (effect.actionType !== 20) continue;
      if (absorption.hasAbsorbLimit && isProxyTargetReached(effect))
        return { absorptions: state.proxyAbsorptions, absorbed: true };
      const totalAmount = BigInt.asIntN(64, effect.totalAmount + BigInt(amount));
      const effects = absorption.effects.map((item, index) =>
        index === effectIndex ? { ...item, totalAmount } : item,
      );
      const absorptions = state.proxyAbsorptions.map((item, index) =>
        index === absorptionIndex ? { ...item, effects } : item,
      );
      return { absorptions, absorbed: true };
    }
  }
  return null;
}
