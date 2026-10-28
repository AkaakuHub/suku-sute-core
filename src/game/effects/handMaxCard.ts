import {
  activateLiveHandCardMaxEffect,
  deactivateLiveHandCardCountEffectsByKey,
} from '../../runtime/skills/handCardCount.ts';
import { createLiveSkillEffectDuration } from '../../runtime/skills/skillEffectDuration.ts';
import type { Card, Effect, GameState } from '../model.ts';
import { fillHand } from '../cards/drawing.ts';
import { applyHandCardCountTransition } from './handCardCount.ts';

export function activateHandMaxCard(
  state: GameState,
  effect: Extract<Effect, { kind: 'hand-max-card' }>,
  card: Card | undefined,
): GameState {
  if (effect.duration.kind === 'sections' && effect.duration.value === 0n)
    throw new Error('Display section count is 0. (displayTimeType: SECTION, displayTime: 0)');
  const duration =
    effect.invocationType !== undefined || effect.duration.kind === 'stage'
      ? { kind: 'full-end' as const }
      : createLiveSkillEffectDuration(
          effect.duration.kind === 'milliseconds' ? 1 : 2,
          effect.duration.value,
          'HandCardMax',
        );
  const activated = activateLiveHandCardMaxEffect(
    state.handCardCountEffects,
    state.tokenCardDeck,
    card?.cardInstanceId ?? null,
    effect.skillEffectId === undefined ? null : String(effect.skillEffectId),
    duration,
    effect.deactivationKey ?? null,
  );
  return fillHand(applyHandCardCountTransition(state, activated));
}

export function deactivateHandMaxCardEffects(state: GameState, deactivationKey: string): GameState {
  return applyHandCardCountTransition(
    state,
    deactivateLiveHandCardCountEffectsByKey(
      state.handCardCountEffects,
      state.tokenCardDeck,
      deactivationKey,
      'max',
    ),
  );
}
