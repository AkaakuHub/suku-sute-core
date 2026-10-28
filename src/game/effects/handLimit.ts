import { notifyLiveHandCardCountReset } from '../../runtime/cards/handCardCountReset.ts';
import { addLiveHandCardTargetCount } from '../../runtime/cards/handCardTarget.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { skillValue } from './skillValue.ts';
import { isProxyTargetReached } from './proxySkill.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { ceilToInt32, int64ToFloat32 } from '../../runtime/numeric.ts';

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
  const scaledAmount = ceilToInt32(
    Math.fround(Math.fround(baseAmount + Math.fround(addValue)) * Math.fround(multiplier)),
  );
  const skillBoosted = skillValue(state, scaledAmount, effect, card);
  const action52 = applyAction52SkillBoostForCard(state, card, skillBoosted);
  const amount = ceilToInt32(action52.value);
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

export function advanceHandLimitEffects(state: GameState, elapsedSeconds: number): GameState {
  return expireHandLimitEffects(state, (effect) => {
    if (effect.remainingSeconds === null) return effect;
    const remainingSeconds = Math.fround(effect.remainingSeconds - Math.fround(elapsedSeconds));
    return remainingSeconds > 0 ? { ...effect, remainingSeconds } : null;
  });
}

export function expireHandLimitSections(state: GameState): GameState {
  return expireHandLimitEffects(state, (effect) => {
    if (effect.remainingSections === null) return effect;
    const remainingSections = effect.remainingSections - 1n;
    return remainingSections > 0n ? { ...effect, remainingSections } : null;
  });
}

export function deactivateHandLimitEffects(state: GameState, deactivationKey: string): GameState {
  const retainedEffects = state.handLimitEffects.filter(
    (effect) => effect.deactivationKey !== deactivationKey,
  );
  if (retainedEffects.length === state.handLimitEffects.length) return state;
  return state.handLimitEffects
    .filter((effect) => effect.deactivationKey === deactivationKey)
    .reduce((current, effect) => notifyLiveHandCardCountReset(current, effect.expirationAmount), {
      ...state,
      handLimitEffects: retainedEffects,
    });
}

function expireHandLimitEffects(
  state: GameState,
  advance: (
    effect: GameState['handLimitEffects'][number],
  ) => GameState['handLimitEffects'][number] | null,
): GameState {
  let next = state;
  const handLimitEffects = state.handLimitEffects.flatMap((effect) => {
    const retained = advance(effect);
    if (retained) return [retained];
    next = notifyLiveHandCardCountReset(next, effect.expirationAmount);
    return [];
  });
  return { ...next, handLimitEffects };
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
