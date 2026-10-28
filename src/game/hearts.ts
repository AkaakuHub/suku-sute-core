import { applyEffect } from './effects.ts';
import { flushDeckActions } from './cards/boardActions.ts';
import { type GameState, rules } from './model.ts';
import { collectionScore, limitValue } from './scoring.ts';
import {
  collectStarGatherHeartRuntime,
  advanceStarGatherHeartRuntime,
} from './live/heartRuntime.ts';
import { spawnStarGatherHearts } from './live/heartSpawn.ts';
import { liveHeartCount } from '../runtime/live/heartRuntime.ts';
import { createRangeRandom } from './random.ts';
import { advanceHandCollectionAbilities } from './cards/collectionAbilities.ts';
import { recordScoreHistory } from './scoreHistory.ts';
import { voltageLevel } from './live/voltageLevel.ts';
import { expireConvertedScoreBoostsOnHeartCollect } from './effects/voltageConversion.ts';
import { absorbSkillEffect } from './effects/proxySkill.ts';
import { registerMissionHeartCollect } from './ingameMissions.ts';
import { notifyHandHeartCollect } from './cards/handInduce.ts';

export function heartCount(state: GameState): number {
  return liveHeartCount(state.hearts);
}

function awardHearts(
  state: GameState,
  count: number,
  missed: boolean,
  rankHeartCount: number,
): GameState {
  if (count === 0) return state;
  const gain = collectionScore(state, count, missed, rankHeartCount);
  const score = limitValue(state.score + gain);
  const combo = missed
    ? state.combo
    : state.tick - state.lastCollectTick <= rules.comboWindowTicks
      ? state.combo + 1
      : 1;
  return {
    ...state,
    score,
    scoreHistory: recordScoreHistory(state.scoreHistory, {
      timeMilliseconds: Math.trunc((state.tick * 1000) / rules.ticksPerSecond),
      totalScore: score,
    }),
    combo,
    lastCollectTick: missed ? state.lastCollectTick : state.tick,
    lastGain: missed ? state.lastGain : score - state.score,
    stats: {
      ...state.stats,
      heartsCollected: state.stats.heartsCollected + (missed ? 0 : count),
      heartsMissed: state.stats.heartsMissed + (missed ? count : 0),
      bestCollection: Math.max(state.stats.bestCollection, missed ? 0 : count),
      bestCombo: Math.max(state.stats.bestCombo, missed ? 0 : combo),
    },
  };
}

export function collectHearts(state: GameState): GameState {
  if (heartCount(state) === 0) return state;
  const random = createRangeRandom(state.heartRandomSeed);
  const collected = collectStarGatherHeartRuntime(state.hearts, random.range);
  let next = awardHearts(
    { ...state, hearts: collected.state, heartRandomSeed: random.seed },
    collected.collectCount,
    false,
    collected.collectCount,
  );
  next = registerMissionHeartCollect(next, collected.collectCount);
  next = notifyHandHeartCollect(next, collected.collectCount, applyEffect);
  next = {
    ...next,
    skillScoreUps: next.skillScoreUps.filter((boost) => !boost.removeOnHeartCollect),
  };
  const abilities = advanceHandCollectionAbilities(next, collected.collectCount);
  let triggered = abilities.state;
  for (const card of abilities.activated) {
    const relay = card.relay;
    if (relay) {
      triggered = applyEffect(
        triggered,
        {
          kind: relay.beats ? 'beat-hearts' : 'hearts',
          amount: relay.hearts,
          ...(relay.moodBonus ? { moodBonus: relay.moodBonus } : {}),
        },
        card,
      );
    } else if (card.collectionEffects) {
      for (const effect of card.collectionEffects.effects)
        triggered = applyEffect(triggered, effect, card);
    } else if (card.collectionAbility) {
      if (
        triggered.genesis.effects.length > 0 ||
        (voltageLevel(triggered.voltage.currentVoltage, triggered.maximumVoltageLevel) >= 950 &&
          Math.trunc(triggered.mental.currentMental) === 0)
      ) {
        triggered = applyEffect(
          triggered,
          { kind: 'shuffle', recoverDiscard: false, destination: 'discard' },
          card,
        );
        triggered = applyEffect(triggered, { kind: 'search-unit', unit: 2, count: 4 }, card);
        triggered = applyEffect(triggered, { kind: 'voltage', amount: -1_400_000 }, card);
        if (
          triggered.genesis.effects.length > 0 ||
          voltageLevel(triggered.voltage.currentVoltage, triggered.maximumVoltageLevel) >= 1000
        )
          triggered = applyEffect(triggered, { kind: 'voltage', amount: -14_000_000 }, card);
      }
    } else if (state.deck.length >= 95) {
      triggered =
        card.token === 'story'
          ? applyEffect(
              triggered,
              { kind: 'beat-hearts', amount: 1001, moodBonus: { target: 1, perPoint: 5.005 } },
              card,
            )
          : applyEffect(
              triggered,
              { kind: 'shuffle', recoverDiscard: false, destination: 'discard' },
              card,
            );
    }
  }
  return expireConvertedScoreBoostsOnHeartCollect(flushDeckActions(triggered));
}

export function addHearts(state: GameState, count: number): GameState {
  return addHeartsWithLifeTime(state, count, state.hearts.baseLifeTimeSeconds);
}

export function addHeartsWithLifeTime(
  state: GameState,
  count: number,
  lifeTimeSeconds: number,
): GameState {
  if (count === 0) return state;
  const absorption = absorbSkillEffect(state, 1, BigInt(count));
  if (absorption.absorbed) return absorption.state;
  const random = createRangeRandom(state.heartRandomSeed);
  const spawned = spawnStarGatherHearts(state.hearts, count, lifeTimeSeconds, random.range);
  return awardHearts(
    { ...state, hearts: spawned.state, heartRandomSeed: random.seed },
    spawned.overflowCount,
    true,
    liveHeartCount(spawned.state),
  );
}

export function advanceHearts(state: GameState): GameState {
  const advanced = advanceStarGatherHeartRuntime(state.hearts, 1 / rules.ticksPerSecond, false);
  const rankHeartCount = heartCount(state);
  return advanced.lapsedBatches.reduce(
    (next, count) => awardHearts(next, count, true, rankHeartCount),
    { ...state, hearts: advanced.state },
  );
}
