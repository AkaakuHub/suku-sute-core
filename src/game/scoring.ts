import { voltageLevel } from './live/voltageLevel.ts';
import { scoreMultipliers } from '../master/scoreMultipliers.ts';
import { type GameState, rules } from './model.ts';
import { durationSeconds } from './projection.ts';
import { calculateLiveClientScore } from '../runtime/live/clientScore.ts';
import {
  calculateLiveCardAppealValue,
  calculateLiveMasteryLoveBonusEffect,
  liveValueToFactor,
  calculateLiveAddScoreMax,
} from '../runtime/live/clientScoreInput.ts';
import { calculateLiveFlowerRank, calculateLiveHeartRank } from '../runtime/live/heartRank.ts';

export function limitValue(value: bigint): bigint {
  return value > rules.maxScore ? rules.maxScore : value < 0n ? 0n : value;
}

export function collectionScore(
  state: GameState,
  count: number,
  missed: boolean,
  rankHeartCount: number,
): bigint {
  const voltage = voltageLevel(state.excitement, state.maximumVoltageLevel);
  const rank = state.bloom
    ? calculateLiveFlowerRank(rankHeartCount, Number(state.bloom.progress))
    : calculateLiveHeartRank(rankHeartCount, voltage, null);
  const bonusScoreValue =
    state.boosts.reduce((sum, boost) => sum + boost.percent, 0) +
    state.skillScoreUps.reduce((sum, boost) => sum + boost.percent, 0) +
    state.temporaryScoreBoosts.reduce((sum, boost) => sum + boost.percent, 0);
  const base = calculateLiveClientScore(
    {
      cards: state.cardPool
        .filter((card) => !card.token)
        .map((card) => ({
          appealValue: calculateLiveCardAppealValue(card.appeal, 0, durationSeconds(state)),
        })),
      collectNum: count,
      heartRankMagnification: rank.magnification,
      isDisappearCollect: missed,
      masteryLoveBonusEffect: calculateLiveMasteryLoveBonusEffect(0),
      skillLoveBonusEffect: 1,
      currentGenesisGauge: Number(state.bloom?.progress ?? 0n),
      bonusScoreValue,
      challengeBonusFactor: 1,
    },
    {
      valueToFactor: liveValueToFactor,
      getAddScoreMax: (collectCount) =>
        calculateLiveAddScoreMax(collectCount, scoreMultipliers, {
          additionalEnabled: state.track.scoreLimit.additionalEnabled,
          bonusScoreValue,
          voltageMultiplier:
            state.track.scoreLimit.voltageMultipliers.find(
              (row) => row.minimumLevel <= voltage && voltage <= row.maximumLevel,
            )?.multiplier ?? 0n,
          bloomActive: state.bloom !== null,
          bloomGauge: Number(state.bloom?.progress ?? 0n),
        }),
    },
  );
  return base * state.scoreMultiplier;
}
