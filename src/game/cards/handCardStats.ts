import { createLiveHandCardStats } from '../../runtime/cards/handCardStats.ts';
import { sectionAt } from '../projection.ts';
import type { GameState } from '../model.ts';

export function initializeHandCardStats(state: GameState, ids: readonly string[]): GameState {
  const sectionIndex = state.track.sections.indexOf(sectionAt(state));
  const handCardStats = { ...state.handCardStats };
  for (const id of ids) {
    handCardStats[id] = createLiveHandCardStats(sectionIndex);
  }
  return { ...state, handCardStats };
}
