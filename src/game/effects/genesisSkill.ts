import type { Card, Effect, GameState } from '../model.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { activateBloom } from '../bloom.ts';

type GenesisSkillEffect = Extract<Effect, { kind: 'genesis-skill' }>;

export function activateGenesisSkill(
  state: GameState,
  effect: GenesisSkillEffect,
  card: Card | undefined,
): GameState {
  const durationValue = Number(BigInt.asIntN(32, effect.duration.value));
  if (effect.duration.kind !== 'stage' && durationValue < 1) return state;
  const effectBaseNum = Number(BigInt.asIntN(32, effect.effectBaseNum));
  const value = Math.fround(Math.fround(effectBaseNum) / 10_000);
  const boosted = applyAction52SkillBoostForCard(state, card, value);
  if (effect.duration.kind !== 'stage') return boosted.state;
  return activateBloom(boosted.state, boosted.value);
}
