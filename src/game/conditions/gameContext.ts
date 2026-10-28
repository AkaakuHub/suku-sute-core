import type { GameState } from '../model.ts';
import { beatHeartCount } from '../beat.ts';
import { moodValue, sectionAt, sectionNumber } from '../projection.ts';
import { voltageLevel } from '../live/voltageLevel.ts';
import type { ConditionContext } from './model.ts';

export function conditionContext(state: GameState): ConditionContext {
  const partIndex = state.track.sections.indexOf(sectionAt(state));
  return {
    heatLevel: voltageLevel(state.currentVoltage, state.maximumVoltageLevel),
    mentalFraction: state.currentMental / state.maximumMental,
    moodValue: moodValue(state),
    staminaPercent: Math.trunc((state.currentMental * 100) / state.maximumMental),
    weather: moodValue(state),
    partIndex,
    partNumber: sectionNumber(state),
    cardCounts: {
      all: state.deck.length,
      draw: state.drawPile.length,
      discard: state.discard.length,
      excluded: state.cardPool.length - state.deck.length,
    },
    tokenSeries: state.deck.map((card) => card.tokenSeriesIds ?? []),
    supportLevels: state.supportLevels,
    naturalStars: beatHeartCount(state),
    genesisActive: state.genesis.effects.length > 0,
  };
}
