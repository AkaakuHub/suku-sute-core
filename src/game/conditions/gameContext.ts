import {
  liveBoardState,
  liveDeckBoardCardInstanceIds,
} from '../../runtime/cards/deckBoardState.ts';
import type { LiveConditionContext } from '../../runtime/live/conditionContext.ts';
import type { GameState } from '../model.ts';
import { beatHeartCount } from '../beat.ts';
import { moodValue, sectionAt } from '../projection.ts';
import { voltageThresholds } from '../live/voltageLevel.ts';

export function conditionContext(state: GameState): LiveConditionContext {
  const feverSection = state.track.sections.findIndex((section) => section.climax);
  return {
    voltage: state.voltage,
    voltageThresholds,
    maximumVoltageLevel: state.maximumVoltageLevel,
    mental: state.mental,
    maximumMental: state.maximumMental,
    moodValue: moodValue(state),
    currentSection: state.track.sections.indexOf(sectionAt(state)),
    feverSection: feverSection < 0 ? null : feverSection,
    cardTotal: state.deck.length,
    deckCount: liveDeckBoardCardInstanceIds(state.deckBoard, liveBoardState.deck).length,
    graveyardCount: liveDeckBoardCardInstanceIds(state.deckBoard, liveBoardState.graveyard).length,
    exclusionCount: state.cardPool.length - state.deck.length,
    tokenCardSeriesCount: (seriesIds) =>
      state.deck.filter((card) => seriesIds.some((id) => card.tokenCardSeriesIds.includes(id)))
        .length,
    memberFanLevelTotal: (characterIds) =>
      characterIds.reduce((total, id) => total + (state.supportLevels[id] ?? 0), 0),
    beatHeartValue: beatHeartCount(state),
  };
}
