import { drawProbability } from './drawProbability.ts';
import { sectionNumber } from '../projection.ts';
import type { Card, GameState } from '../model.ts';

type DrawCandidate = Readonly<{ id: string; weight: number }>;

export function drawCandidate(
  candidates: readonly DrawCandidate[],
  randomIndex: (maximumExclusive: number) => number,
): string | null {
  const priority = candidates.filter((candidate) => candidate.weight < 0);
  if (priority.length) return priority[randomIndex(priority.length)]?.id ?? null;
  const total = candidates.reduce((sum, candidate) => sum + Math.max(0, candidate.weight), 0);
  if (!total) return null;
  const roll = randomIndex(total);
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += Math.max(0, candidate.weight);
    if (roll < cumulative) return candidate.id;
  }
  throw new Error('カードの抽選が成立しません。');
}

export function drawWeight(card: Card, state: GameState): number {
  return drawProbability(card.drawRules ?? [], {
    initial: state.drawContext === 'initial',
    skill: state.drawContext === 'skill',
    usedCard: state.usedCard,
    icon: state.lastUsedSkillIcon,
    section: sectionNumber(state),
  });
}
