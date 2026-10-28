import type { Card, Effect, GameState } from '../model.ts';
import { rules } from '../model.ts';
import { applyAction52SkillBoostForCard } from './action52SkillBoost.ts';
import { applyGenesisEffect } from '../genesis.ts';
import { createLiveGenesisEffectFromParameters } from '../../runtime/skills/genesisSkill.ts';

type GenesisSkillEffect = Extract<Effect, { kind: 'genesis-skill' }>;

export function activateGenesisSkill(
  state: GameState,
  effect: GenesisSkillEffect,
  card: Card | undefined,
): GameState {
  let next = state;
  const genesis = createLiveGenesisEffectFromParameters(
    {
      effectId: String(state.genesis.effects.length + 1),
      effectBaseNum: effect.effectBaseNum,
      displayTimeType:
        effect.duration.kind === 'stage' ? 3n : effect.duration.kind === 'sections' ? 2n : 1n,
      displayTime: effect.duration.value,
      currentTimeSeconds: state.tick / rules.ticksPerSecond,
    },
    (value) => {
      const boosted = applyAction52SkillBoostForCard(next, card, value);
      next = boosted.state;
      return boosted.value;
    },
  );
  return genesis === null ? next : applyGenesisEffect(next, genesis);
}
