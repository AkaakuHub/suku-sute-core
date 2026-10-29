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
import { expireConvertedScoreBoostsOnHeartCollect } from './effects/voltageConversion.ts';
import { applyProxySkillAbsorption } from './effects/proxySkill.ts';
import { createLiveHearts } from '../runtime/live/heartCreation.ts';
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
    for (const effect of card.collectionEffects.effects)
      triggered = applyEffect(triggered, effect, card);
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
  const random = createRangeRandom(state.heartRandomSeed);
  const created = createLiveHearts(
    state,
    count,
    lifeTimeSeconds,
    random.range,
    spawnStarGatherHearts,
  );
  const next = applyProxySkillAbsorption(state, created.proxyAbsorption);
  if (created.proxyAbsorption.absorbed || count === 0) return next;
  return awardHearts(
    { ...next, hearts: created.hearts, heartRandomSeed: random.seed },
    created.overflowCount,
    true,
    liveHeartCount(created.hearts),
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
