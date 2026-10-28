import { applyLiveOnDrawInduceAbility } from '../../runtime/cards/cardDraw.ts';
import { sectionAt } from '../projection.ts';
import type { Card, GameState } from '../model.ts';

export function drawWeight(card: Card, state: GameState): number {
  return applyLiveOnDrawInduceAbility(10_000, card.onDrawInduceEffects ?? [], {
    ...state.deckDrawContext,
    currentSection: state.track.sections.indexOf(sectionAt(state)),
    feverSection: state.track.sections.findIndex((section) => section.climax),
  });
}
