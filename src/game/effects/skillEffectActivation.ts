import type { Card, Effect, GameState } from '../model.ts';

export function incrementSkillEffectActivationCount(
  state: GameState,
  effect: Effect,
  card: Card | undefined,
): GameState {
  const skillEffectId = effect.skillEffectId;
  if (skillEffectId === undefined) return state;
  const key = `${card?.cardInstanceId ?? ''}:${skillEffectId}`;
  const count = state.skillEffectActivationCounts[key] ?? 0;
  return {
    ...state,
    skillEffectActivationCounts: {
      ...state.skillEffectActivationCounts,
      [key]: Number(BigInt.asIntN(32, BigInt(count + 1))),
    },
  };
}
