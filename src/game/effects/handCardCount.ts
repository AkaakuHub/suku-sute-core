import { notifyLiveHandCardCountReset } from '../../runtime/cards/handCardCountReset.ts';
import {
  activateLiveHandCardCountEffect,
  advanceLiveHandCardCountState,
  calculateLiveHandCardCountAmount,
  deactivateLiveHandCardCountEffectsByKey,
  type LiveHandCardCountTransition,
} from '../../runtime/skills/handCardCount.ts';
import { createLiveSkillEffectDuration } from '../../runtime/skills/skillEffectDuration.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { skillValue } from './skillValue.ts';
import { absorbLiveProxySkillEffect } from '../../runtime/skills/proxyAbsorption.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { ceilToInt32 } from '../../runtime/numeric.ts';
import { markLiveCardHandCountActivated } from '../../runtime/cards/cardSkillActivatedFlags.ts';

export function applyHandCardCount(
  state: GameState,
  effect: Extract<Effect, { kind: 'hand-limit' }>,
  card: Card | undefined,
  multiplier: number,
  addValue = 0,
): GameState {
  if (effect.displayTimeType === 2 && effect.displayTime === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const scaledAmount = calculateLiveHandCardCountAmount(effect.amount, {
    addValue,
    multiplyFactor: multiplier,
    effectPower: 1,
  });
  const skillBoosted = skillValue(state, scaledAmount, effect, card);
  const action52 = applyAction52SkillBoostForCard(state, card, skillBoosted);
  const amount = ceilToInt32(action52.value);
  const current = action52.state;
  const absorption =
    effect.calculationType === 1 && amount >= 0
      ? absorbLiveProxySkillEffect(current.proxySkills, 20, BigInt(amount))
      : null;
  const appliedAmount = effect.calculationType !== 1 || absorption?.absorbed ? 0 : amount;
  let activated = current;
  if (!absorption?.absorbed) {
    const transition = activateLiveHandCardCountEffect(
      current.handCardCountEffects,
      current.tokenCardDeck,
      current.deckActions,
      card?.cardInstanceId ?? null,
      {
        effectId: effect.skillEffectId === undefined ? null : String(effect.skillEffectId),
        calculationType: effect.calculationType,
        amount,
        duration:
          effect.invocationType !== undefined
            ? { kind: 'full-end' }
            : createLiveSkillEffectDuration(
                effect.displayTimeType,
                effect.displayTime,
                'HandCardCount',
              ),
      },
      amount,
      effect.deactivationKey ?? null,
    );
    activated = {
      ...current,
      tokenCardDeck: transition.tokenCardDeck,
      deckActions: transition.deckActions,
      handCardCountEffects: transition.state,
    };
  }
  return {
    ...activated,
    deckBoard: card
      ? markLiveCardHandCountActivated(activated.deckBoard, card.cardInstanceId, appliedAmount)
      : activated.deckBoard,
    ...(absorption ? { proxySkills: absorption.states } : {}),
  };
}

export function advanceHandCardCountEffects(state: GameState, deltaTimeSeconds: number): GameState {
  return applyHandCardCountTransition(
    state,
    advanceLiveHandCardCountState(state.handCardCountEffects, state.tokenCardDeck, {
      deltaTimeSeconds,
      sectionChangeCount: 0,
      musicEnded: false,
    }),
  );
}

export function expireHandCardCountSections(state: GameState): GameState {
  return applyHandCardCountTransition(
    state,
    advanceLiveHandCardCountState(state.handCardCountEffects, state.tokenCardDeck, {
      deltaTimeSeconds: 0,
      sectionChangeCount: 1,
      musicEnded: false,
    }),
  );
}

export function deactivateHandCardCountEffects(
  state: GameState,
  deactivationKey: string,
): GameState {
  return applyHandCardCountTransition(
    state,
    deactivateLiveHandCardCountEffectsByKey(
      state.handCardCountEffects,
      state.tokenCardDeck,
      deactivationKey,
      'count',
    ),
  );
}

export function applyHandCardCountTransition(
  state: GameState,
  transition: LiveHandCardCountTransition<string>,
): GameState {
  return transition.resetNotifications.reduce(
    (current, amount) => notifyLiveHandCardCountReset(current, amount),
    { ...state, handCardCountEffects: transition.state, tokenCardDeck: transition.tokenCardDeck },
  );
}
