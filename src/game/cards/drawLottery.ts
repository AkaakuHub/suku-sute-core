import { drawProbability } from './drawProbability.ts';
import { sectionNumber } from '../projection.ts';
import type { Card, GameState } from '../model.ts';

export function drawWeight(card: Card, state: GameState): number {
  return drawProbability(card.drawRules ?? [], {
    initial: state.drawContext === 'initial',
    skill: state.drawContext === 'skill',
    usedCard: state.usedCard,
    icon: state.lastUsedSkillIcon,
    section: sectionNumber(state),
  });
}
