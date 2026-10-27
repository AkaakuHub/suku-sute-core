import type { LiveSkillEffect } from './skillTypes.ts';

export type LiveIngameMissionRecord = Readonly<{
  id: string;
  groupId: string;
  rare: boolean;
  missionType: 1 | 2 | 3 | 4 | 5;
  param1: string;
  param2: string;
  addParam: string;
  baseScore: string;
  addScore: string;
  probability: number;
  missionText: string;
}>;

export type LiveIngameMissionState = Readonly<{
  records: readonly LiveIngameMissionRecord[];
  activeRecords: readonly LiveIngameMissionRecord[];
  currentIndex: number;
  currentMission: LiveIngameMissionRecord | null;
  currentTarget: bigint;
  currentCount: bigint;
  clearCount: number;
  cooldownSeconds: number;
  scoreMultiplier: number;
}>;

export type LiveIngameMissionEvent =
  | Readonly<{ kind: 'heart-count'; count: number }>
  | Readonly<{
      kind: 'skill-effect';
      actionType: number;
      effectAmount: number;
    }>
  | Readonly<{ kind: 'skill-use'; characterId: number }>
  | Readonly<{ kind: 'mental-down' }>
  | Readonly<{ kind: 'voltage-zero' }>;

export type LiveIngameMissionResult = Readonly<{
  state: LiveIngameMissionState;
  addedScore: bigint;
}>;

export function createLiveIngameMissionState(
  records: readonly LiveIngameMissionRecord[],
  songTime: number,
): LiveIngameMissionState {
  validateRecords(records);
  if (!Number.isSafeInteger(songTime) || songTime <= 0) {
    throw new Error('Live Ingame Mission song time differs');
  }
  return {
    records,
    activeRecords: [],
    currentIndex: -1,
    currentMission: null,
    currentTarget: 0n,
    currentCount: 0n,
    clearCount: 0,
    cooldownSeconds: 0,
    scoreMultiplier: Math.fround(Math.fround(songTime) / Math.fround(10_000)),
  };
}

export function activateLiveIngameMission(
  state: LiveIngameMissionState,
  effect: LiveSkillEffect,
  randomRange: (maximumExclusive: number) => number,
): LiveIngameMissionState {
  const groupId = requireIngameMissionGroupId(effect);
  const activeRecords = state.records.filter((record) => record.groupId === groupId);
  if (activeRecords.length === 0) {
    throw new Error(`Live Ingame Mission group is absent:${groupId}`);
  }
  return selectNextMission(
    {
      ...state,
      activeRecords,
      currentIndex: -1,
      currentMission: null,
      currentTarget: 0n,
      currentCount: 0n,
    },
    randomRange,
  );
}

export function notifyLiveIngameMission(
  state: LiveIngameMissionState,
  event: LiveIngameMissionEvent,
): LiveIngameMissionResult {
  const mission = state.currentMission;
  if (mission === null || state.cooldownSeconds > 0) {
    return { state, addedScore: 0n };
  }
  const addCount = eventCount(mission, event);
  if (addCount < 0) return { state, addedScore: 0n };
  const currentCount = state.currentCount + BigInt(addCount);
  if (currentCount < state.currentTarget) {
    return { state: { ...state, currentCount }, addedScore: 0n };
  }
  const clearCount = state.clearCount + (mission.rare ? 3 : 1);
  const scaledAddScore = Math.fround(
    Math.fround(Number(BigInt(mission.addScore))) / Math.fround(10_000),
  );
  const clearCountFloat = Math.fround(clearCount);
  const scoreBeforeMultiplier = Math.fround(
    Math.fround(Math.fround(scaledAddScore * clearCountFloat) * clearCountFloat) +
      Math.fround(Number(BigInt(mission.baseScore))),
  );
  const addedScore = BigInt(Math.ceil(Math.fround(state.scoreMultiplier * scoreBeforeMultiplier)));
  return {
    state: {
      ...state,
      currentCount,
      clearCount,
      cooldownSeconds: 1,
    },
    addedScore,
  };
}

export function advanceLiveIngameMission(
  state: LiveIngameMissionState,
  deltaTimeSeconds: number,
  randomRange: (maximumExclusive: number) => number,
): LiveIngameMissionState {
  if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
    throw new Error('Live Ingame Mission delta time differs');
  }
  if (state.currentMission === null || state.cooldownSeconds <= 0) return state;
  const cooldownSeconds = Math.fround(state.cooldownSeconds - Math.fround(deltaTimeSeconds));
  if (cooldownSeconds > 0) return { ...state, cooldownSeconds };
  return selectNextMission({ ...state, cooldownSeconds }, randomRange);
}

export function failLiveIngameMission(state: LiveIngameMissionState): LiveIngameMissionState {
  if (state.cooldownSeconds > 0) return state;
  return { ...state, cooldownSeconds: 2 };
}

function selectNextMission(
  state: LiveIngameMissionState,
  randomRange: (maximumExclusive: number) => number,
): LiveIngameMissionState {
  const probabilityTotal = state.activeRecords.reduce(
    (total, record, index) => (index === state.currentIndex ? total : total + record.probability),
    0,
  );
  let nextIndex = state.currentIndex;
  if (probabilityTotal > 0) {
    let value = randomRange(probabilityTotal);
    if (!Number.isSafeInteger(value) || value < 0 || value >= probabilityTotal) {
      throw new Error('Live Ingame Mission random value differs');
    }
    for (let index = 0; index < state.activeRecords.length; index += 1) {
      if (index === state.currentIndex) continue;
      const record = state.activeRecords[index];
      if (record === undefined) continue;
      value -= record.probability;
      if (value < 0) {
        nextIndex = index;
        break;
      }
    }
  }
  const currentMission = state.activeRecords[nextIndex];
  if (currentMission === undefined) return state;
  const scaledAddParam = Math.fround(
    Math.fround(Number(BigInt(currentMission.addParam))) / Math.fround(10_000),
  );
  const currentTarget = BigInt(
    Math.ceil(
      Math.fround(
        Math.fround(Number(BigInt(currentMission.param1))) +
          Math.fround(scaledAddParam * Math.fround(state.clearCount + 1)),
      ),
    ),
  );
  return {
    ...state,
    currentIndex: nextIndex,
    currentMission,
    currentTarget,
    currentCount: 0n,
  };
}

function eventCount(mission: LiveIngameMissionRecord, event: LiveIngameMissionEvent): number {
  if (mission.missionType === 1 && event.kind === 'heart-count') {
    return event.count;
  }
  if (
    mission.missionType === 2 &&
    event.kind === 'skill-effect' &&
    Number(BigInt(mission.param2)) === event.actionType
  ) {
    if ([13, 25, 28, 34].includes(event.actionType)) return 1;
    if ([1, 2, 5, 7, 10, 14, 20, 21].includes(event.actionType)) {
      return Math.ceil(event.effectAmount);
    }
    return -1;
  }
  if (
    mission.missionType === 3 &&
    event.kind === 'skill-use' &&
    BigInt(mission.param2) === BigInt(event.characterId)
  ) {
    return 1;
  }
  if (mission.missionType === 4 && event.kind === 'mental-down') return 1;
  if (mission.missionType === 5 && event.kind === 'voltage-zero') return 1;
  return -1;
}

function requireIngameMissionGroupId(effect: LiveSkillEffect): string {
  if (effect.actionType !== 44 || effect.details.length !== 1) {
    throw new Error('Live Ingame Mission action type differs');
  }
  const detail = effect.details[0];
  if (
    detail === undefined ||
    detail.detailType !== 'INGAME_MISSION_SKILL_GROUP_ID' ||
    detail.targetMood !== 0 ||
    detail.params.length !== 0 ||
    !Number.isSafeInteger(detail.effectValue) ||
    detail.effectValue <= 0
  ) {
    throw new Error('Live Ingame Mission details differ');
  }
  return String(detail.effectValue);
}

function validateRecords(records: readonly LiveIngameMissionRecord[]): void {
  for (const record of records) {
    if (
      !/^\d+$/.test(record.id) ||
      !/^\d+$/.test(record.groupId) ||
      !/^\d+$/.test(record.param1) ||
      !/^\d+$/.test(record.param2) ||
      !/^\d+$/.test(record.addParam) ||
      !/^\d+$/.test(record.baseScore) ||
      !/^\d+$/.test(record.addScore) ||
      ![1, 2, 3, 4, 5].includes(record.missionType) ||
      !Number.isSafeInteger(record.probability) ||
      record.probability < 0 ||
      record.missionText.length === 0
    ) {
      throw new Error(`Live Ingame Mission record differs:${record.id}`);
    }
  }
}
