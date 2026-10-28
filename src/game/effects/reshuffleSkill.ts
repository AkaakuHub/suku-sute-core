import type { Card, GameState } from '../model.ts';
import type { ReshuffleSkillEffect } from '../reshuffleSkillTypes.ts';
import { enqueueHandShuffle } from '../cards/boardActions.ts';

export function activateReshuffleSkill(
  state: GameState,
  effect: ReshuffleSkillEffect,
  card: Card | undefined,
): GameState {
  return enqueueHandShuffle(
    state,
    {
      recoverDiscard: effect.recoveryType === 1n,
      destination: effect.stashType === 1n ? 'draw' : 'discard',
    },
    card?.cardInstanceId ?? null,
  );
}
