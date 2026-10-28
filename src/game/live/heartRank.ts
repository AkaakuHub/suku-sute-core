import {
  calculateLiveFlowerRank,
  calculateLiveHeartRank,
  type LiveHeartRank,
} from '../../runtime/live/heartRank.ts';
import type { GameState } from '../model.ts';
import { voltageLevel } from './voltageLevel.ts';

export function projectHeartRank(
  state: Pick<GameState, 'voltage' | 'maximumVoltageLevel' | 'genesis'>,
  collectableHeartCount: number,
): LiveHeartRank {
  return state.genesis.effects.length > 0
    ? calculateLiveFlowerRank(collectableHeartCount, state.genesis.currentGauge)
    : calculateLiveHeartRank(
        collectableHeartCount,
        voltageLevel(state.voltage.currentVoltage, state.maximumVoltageLevel),
        null,
      );
}
