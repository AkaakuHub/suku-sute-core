import type { LiveApGaugeState } from './apGauge.ts';
export const liveAutoSkillIntervalSeconds = 0.5;
export const liveAutoHeartCollectionSeconds = 0.3;
export const liveAutomaticHeartCountSettings = {
  minimum: 50,
  maximum: 100,
  step: 10,
  defaultValue: 100,
} as const;

export type LiveAutomaticPlaySettings = Readonly<{
  isSkillAuto: boolean;
  isHeartAuto: boolean;
  heartAutoCount: number;
  isWaitMode: boolean;
}>;

export const liveAutomaticPlayDefaultSettings: LiveAutomaticPlaySettings = {
  isSkillAuto: true,
  isHeartAuto: true,
  heartAutoCount: liveAutomaticHeartCountSettings.defaultValue,
  isWaitMode: false,
};

export type LiveAutomaticHeartState = Readonly<{
  timerSeconds: number;
}>;

export type LiveAutomaticSkill = Readonly<{
  cardDatasId: number;
  skillCostValue: number;
  isReshuffleSkill: boolean;
  isSkillCostOver: boolean;
}>;

export function isLiveAutomaticHeartCount(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= liveAutomaticHeartCountSettings.minimum &&
    value <= liveAutomaticHeartCountSettings.maximum &&
    (value - liveAutomaticHeartCountSettings.minimum) % liveAutomaticHeartCountSettings.step === 0
  );
}

export function changeLiveAutomaticPlaySetting(
  settings: LiveAutomaticPlaySettings,
  setting: 'isSkillAuto' | 'isHeartAuto' | 'isWaitMode',
  enabled: boolean,
): LiveAutomaticPlaySettings {
  switch (setting) {
    case 'isSkillAuto':
      return {
        ...settings,
        isSkillAuto: enabled,
        isWaitMode: enabled ? false : settings.isWaitMode,
      };
    case 'isHeartAuto':
      return { ...settings, isHeartAuto: enabled };
    case 'isWaitMode':
      return {
        ...settings,
        isSkillAuto: enabled ? false : settings.isSkillAuto,
        isWaitMode: enabled,
      };
  }
}

export function advanceLiveAutomaticHeart(
  state: LiveAutomaticHeartState,
  input: Readonly<{
    enabled: boolean;
    heartCount: number;
    heartAutoCount: number;
    deltaTimeSeconds: number;
  }>,
): Readonly<{
  state: LiveAutomaticHeartState;
  shouldCollect: boolean;
}> {
  if (
    !Number.isSafeInteger(input.heartCount) ||
    input.heartCount < 0 ||
    !isLiveAutomaticHeartCount(input.heartAutoCount) ||
    !Number.isFinite(input.deltaTimeSeconds) ||
    input.deltaTimeSeconds < 0
  ) {
    throw new Error('Live automatic Heart input is invalid');
  }
  if (!input.enabled || input.heartCount < input.heartAutoCount) {
    return { state: { timerSeconds: 0 }, shouldCollect: false };
  }
  const timerSeconds = state.timerSeconds + input.deltaTimeSeconds;
  if (timerSeconds < liveAutoHeartCollectionSeconds) {
    return { state: { timerSeconds }, shouldCollect: false };
  }
  return { state: { timerSeconds: 0 }, shouldCollect: true };
}

export function isLiveAutoSkillIntervalReached(
  currentTimeSeconds: number,
  lastActivationTimeSeconds: number,
): boolean {
  if (!Number.isFinite(currentTimeSeconds) || !Number.isFinite(lastActivationTimeSeconds)) {
    throw new Error('Live automatic skill clock is invalid');
  }
  return currentTimeSeconds - lastActivationTimeSeconds >= liveAutoSkillIntervalSeconds;
}

export function selectLiveTopPrioritySkill<Skill extends LiveAutomaticSkill>(
  handCards: readonly Skill[],
  ap: LiveApGaugeState,
): Skill {
  const candidacyCards = handCards.filter(isLiveTopPrioritySkillCandidate);
  const selected = selectLowestSkillCost(candidacyCards);
  if (!selected.isSkillCostOver || ap.currentAp !== ap.maxAp) {
    return selected;
  }
  return selectLowestSkillCost(handCards);
}

export function hasLiveTopPrioritySkillCandidate(
  handCards: readonly LiveAutomaticSkill[],
): boolean {
  return handCards.some(isLiveTopPrioritySkillCandidate);
}

function isLiveTopPrioritySkillCandidate(skill: LiveAutomaticSkill): boolean {
  return !skill.isReshuffleSkill;
}

function selectLowestSkillCost<Skill extends LiveAutomaticSkill>(skills: readonly Skill[]): Skill {
  if (skills.length === 0) {
    throw new Error('Live automatic skill candidate is empty');
  }
  return skills.reduce((selected, skill) =>
    skill.skillCostValue < selected.skillCostValue ? skill : selected,
  );
}

export function shouldLiveWaitForSkill(
  settings: LiveAutomaticPlaySettings,
  hasAvailableSkill: boolean,
): boolean {
  return settings.isWaitMode && hasAvailableSkill;
}

export type LiveWaitModeState = Readonly<{
  kind: 'disabled' | 'initial' | 'reserved' | 'force-reserved' | 'waiting';
  remainingCoolTimeSeconds: number;
}>;

const waitModeCoolTimeSeconds = 0.35;
const waitModeCoolTimeAtStartSeconds = 0.05;

export function releaseLiveWaitMode(): LiveWaitModeState {
  return {
    kind: 'reserved',
    remainingCoolTimeSeconds: waitModeCoolTimeSeconds,
  };
}

export function advanceLiveWaitMode(
  state: LiveWaitModeState,
  input: Readonly<{
    enabled: boolean;
    hasAvailableSkill: boolean;
    deltaTimeSeconds: number;
  }>,
): LiveWaitModeState {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('Live WaitMode delta time is invalid');
  }
  if (!input.enabled) {
    return { kind: 'disabled', remainingCoolTimeSeconds: 0 };
  }
  if (state.kind === 'disabled') {
    return {
      kind: 'force-reserved',
      remainingCoolTimeSeconds: 0,
    };
  }
  if (state.kind === 'waiting') return state;
  if (state.kind === 'force-reserved') {
    return input.hasAvailableSkill
      ? { kind: 'waiting', remainingCoolTimeSeconds: 0 }
      : {
          kind: 'initial',
          remainingCoolTimeSeconds: waitModeCoolTimeAtStartSeconds,
        };
  }
  const remainingCoolTimeSeconds = Math.max(
    0,
    state.remainingCoolTimeSeconds - input.deltaTimeSeconds,
  );
  if (state.kind === 'initial') {
    return remainingCoolTimeSeconds > 0
      ? { kind: 'initial', remainingCoolTimeSeconds }
      : releaseLiveWaitMode();
  }
  if (!input.hasAvailableSkill) {
    return { kind: 'reserved', remainingCoolTimeSeconds };
  }
  return remainingCoolTimeSeconds > 0
    ? { kind: 'reserved', remainingCoolTimeSeconds }
    : { kind: 'waiting', remainingCoolTimeSeconds: 0 };
}

export function projectLiveAutomaticPlayClock(
  currentTimeSeconds: number,
  nextTimeSeconds: number,
  waitModePaused: boolean,
): number {
  if (
    !Number.isFinite(currentTimeSeconds) ||
    currentTimeSeconds < 0 ||
    !Number.isFinite(nextTimeSeconds) ||
    nextTimeSeconds < 0
  ) {
    throw new Error('Live automatic play clock is invalid');
  }
  return waitModePaused ? currentTimeSeconds : nextTimeSeconds;
}
