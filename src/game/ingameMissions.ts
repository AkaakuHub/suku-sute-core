import { createRangeRandom } from './random.ts';
import { limitValue } from './scoring.ts';
import { recordScoreHistory } from './scoreHistory.ts';
import { rules, type GameState, type MemberId } from './model.ts';
import type { IngameMission, IngameMissionRecord } from './ingameMissionTypes.ts';
import type { Effect } from './modelTypes.ts';
import { liveHeartCount } from '../runtime/live/heartRuntime.ts';
import { heartLimitValueWithoutLimit } from './effects/heartLimit.ts';
import { apIncreaseIntervalValue } from './effects/apSpeed.ts';

export function startIngameMission(state: GameState, groupId: bigint): GameState {
  const group = state.track.ingameMissionGroups.find((item) => BigInt(item.id) === groupId);
  if (!group) return { ...state, ingameMission: null };
  const initial: IngameMission = {
    groupId,
    records: group.records,
    currentIndex: -1,
    target: 0,
    count: 0,
    clearCount: state.ingameMission?.clearCount ?? 0,
    cooldownSeconds: 0,
  };
  return selectNextMission({ ...state, ingameMission: initial });
}

export function registerMissionAction(
  state: GameState,
  actionType: number,
  amount: number,
): GameState {
  const mission = state.ingameMission;
  if (!mission || mission.cooldownSeconds > 0 || missionRecord(mission)?.missionType !== 2)
    return state;
  const record = missionRecord(mission);
  if (!record || record.param2 !== actionType) return state;
  const count = actionCount(actionType, amount);
  return count === null ? state : addMissionCount(state, count);
}

export function missionActionEffect(
  state: GameState,
  effect: Effect,
  before: GameState,
): GameState {
  const actionType =
    effect.kind === 'hearts' || effect.kind === 'skill-hearts'
      ? 1
      : effect.kind === 'boost' || effect.kind === 'skill-score-up'
        ? 2
        : effect.kind === 'stamina'
          ? 5
          : effect.kind === 'excitement'
            ? 10
            : effect.kind === 'energy'
              ? 14
              : effect.kind === 'shuffle'
                ? 13
                : effect.kind === 'hand-limit'
                  ? 20
                  : effect.kind === 'ap-speed-change'
                    ? 21
                    : effect.kind === 'heart-limit-change'
                      ? 25
                      : effect.kind === 'token-card'
                        ? 28
                        : effect.kind === 'disable-mental-down'
                          ? 34
                          : null;
  if (actionType === null) return state;
  const amount =
    actionType === 1
      ? effect.kind === 'hearts'
        ? effect.amount
        : effect.kind === 'skill-hearts'
          ? liveHeartCount(state.hearts) - liveHeartCount(before.hearts)
          : 0
      : actionType === 2
        ? effect.kind === 'skill-score-up'
          ? state.skillScoreUps.length > before.skillScoreUps.length
            ? (state.skillScoreUps.at(-1)?.percent ?? 0)
            : 0
          : state.boosts.length > before.boosts.length
            ? (state.boosts.at(-1)?.percent ?? 0)
            : 0
        : actionType === 5
          ? Math.max(0, state.stamina - before.stamina)
          : actionType === 10
            ? Math.max(0, state.excitement - before.excitement)
            : actionType === 14
              ? Math.max(0, state.energy - before.energy)
              : actionType === 13 || actionType === 34
                ? 1
                : actionType === 28
                  ? state.deck.length - before.deck.length
                  : effect.kind === 'hand-limit'
                    ? state.handLimit - before.handLimit
                    : effect.kind === 'ap-speed-change'
                      ? state.apTimeEffects.length > before.apTimeEffects.length
                        ? state.apTimeEffects.at(-1)?.calculation === 'multiply'
                          ? Math.fround(
                              Math.fround(1 - (state.apTimeEffects.at(-1)?.value ?? 1)) *
                                Math.fround(10_000),
                            )
                          : Math.fround(
                              Math.fround(
                                -(
                                  (state.apTimeEffects.at(-1)?.value ?? 0) /
                                  apIncreaseIntervalValue(before)
                                ),
                              ) * Math.fround(10_000),
                            )
                        : 0
                      : effect.kind === 'heart-limit-change'
                        ? heartLimitValueWithoutLimit(state) - heartLimitValueWithoutLimit(before)
                        : 0;
  return registerMissionAction(state, actionType, amount);
}

export function registerMissionMember(state: GameState, memberId: MemberId): GameState {
  const mission = state.ingameMission;
  const record = mission ? missionRecord(mission) : undefined;
  return mission &&
    mission.cooldownSeconds <= 0 &&
    record?.missionType === 3 &&
    record.param2 === memberId
    ? addMissionCount(state, 1)
    : state;
}

export function registerMissionHeartCollect(state: GameState, count: number): GameState {
  const mission = state.ingameMission;
  return mission && mission.cooldownSeconds <= 0 && missionRecord(mission)?.missionType === 1
    ? addMissionCount(state, count)
    : state;
}

export function registerMentalDownMission(state: GameState): GameState {
  const mission = state.ingameMission;
  return mission && mission.cooldownSeconds <= 0 && missionRecord(mission)?.missionType === 4
    ? addMissionCount(state, 1)
    : state;
}

export function registerVoltageZeroMission(state: GameState): GameState {
  const mission = state.ingameMission;
  return mission && mission.cooldownSeconds <= 0 && missionRecord(mission)?.missionType === 5
    ? addMissionCount(state, 1)
    : state;
}

export function skipIngameMission(state: GameState): GameState {
  const mission = state.ingameMission;
  return !mission || mission.cooldownSeconds > 0
    ? state
    : { ...state, ingameMission: { ...mission, cooldownSeconds: 2 } };
}

export function advanceIngameMission(state: GameState, seconds: number): GameState {
  const mission = state.ingameMission;
  if (!mission || mission.cooldownSeconds <= 0) return state;
  const cooldownSeconds = mission.cooldownSeconds - seconds;
  if (cooldownSeconds > 0) return { ...state, ingameMission: { ...mission, cooldownSeconds } };
  return selectNextMission({ ...state, ingameMission: { ...mission, cooldownSeconds: 0 } });
}

function missionRecord(mission: IngameMission): IngameMissionRecord | undefined {
  return mission.records[mission.currentIndex];
}

function selectNextMission(state: GameState): GameState {
  const mission = state.ingameMission;
  if (!mission) return state;
  const candidates = mission.records
    .map((record, index) => ({ record, index }))
    .filter(({ index }) => index !== mission.currentIndex);
  const total = candidates.reduce((sum, { record }) => sum + record.probability, 0);
  let selected = candidates[0];
  let randomSeed = state.randomSeed;
  if (total > 0) {
    const random = createRangeRandom(state.randomSeed);
    let target = Math.floor(random.range(0, total));
    selected = candidates.find(({ record }) => {
      if (target < record.probability) return true;
      target -= record.probability;
      return false;
    });
    randomSeed = random.seed;
  } else if (mission.currentIndex >= 0) {
    selected = { record: mission.records[mission.currentIndex]!, index: mission.currentIndex };
  } else {
    selected = undefined;
  }
  if (!selected) return { ...state, ingameMission: null, randomSeed };
  const nextMission = selected.record;
  const targetPerClear = Math.fround(Math.fround(nextMission.addParam) / Math.fround(10_000));
  const targetIncrease = Math.fround(targetPerClear * Math.fround(mission.clearCount + 1));
  const target = Math.trunc(Math.fround(targetIncrease + Math.fround(nextMission.param1)));
  return {
    ...state,
    randomSeed,
    ingameMission: {
      ...mission,
      currentIndex: selected.index,
      target,
      count: 0,
      cooldownSeconds: 0,
    },
  };
}

function actionCount(actionType: number, amount: number): number | null {
  if (amount <= -1) return null;
  switch (actionType) {
    case 1:
    case 2:
    case 5:
    case 7:
    case 10:
    case 14:
    case 20:
    case 21:
    case 25:
    case 28:
      return Math.trunc(amount);
    case 13:
    case 34:
      return 1;
    default:
      return null;
  }
}

function addMissionCount(state: GameState, amount: number): GameState {
  const mission = state.ingameMission;
  if (!mission || amount <= -1) return state;
  const count = mission.count + amount;
  if (mission.target > count) return { ...state, ingameMission: { ...mission, count } };
  const record = missionRecord(mission);
  if (!record) return state;
  const clearCount = mission.clearCount + (record.rare ? 3 : 1);
  const countFloat = Math.fround(clearCount);
  const scorePerClear = Math.fround(Math.fround(record.addScore) / Math.fround(10_000));
  const linearScore = Math.fround(scorePerClear * countFloat);
  const quadraticScore = Math.fround(linearScore * countFloat);
  const scoreFactor = Math.fround(quadraticScore + Math.fround(record.baseScore));
  const scoreMultiplier = Math.fround(state.track.songTime / 10_000);
  const score = Math.trunc(Math.fround(scoreMultiplier * scoreFactor));
  const nextScore = limitValue(state.score + BigInt(score));
  return {
    ...state,
    score: nextScore,
    scoreHistory: recordScoreHistory(state.scoreHistory, {
      timeMilliseconds: Math.trunc((state.tick * 1000) / rules.ticksPerSecond),
      totalScore: nextScore,
    }),
    ingameMission: { ...mission, count, clearCount, cooldownSeconds: 1 },
  };
}
