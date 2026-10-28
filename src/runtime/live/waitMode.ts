import type { LiveApGaugeState } from './apGauge.ts';

const waitModeCooldownSeconds = Math.fround(0.35);

export type LiveWaitModeState = Readonly<{
  kind: 'disabled' | 'initial' | 'reserved' | 'force-reserved' | 'waiting';
  remainingCoolTimeSeconds: number;
  previousAvailableCards: number;
  previousAp: number;
}>;

export function createLiveWaitMode(): LiveWaitModeState {
  return {
    kind: 'disabled',
    remainingCoolTimeSeconds: 0,
    previousAvailableCards: 0,
    previousAp: 0,
  };
}

export function releaseLiveWaitMode(
  state: LiveWaitModeState,
  skillUsed: boolean,
): LiveWaitModeState {
  return {
    ...state,
    kind: skillUsed ? 'force-reserved' : 'initial',
    remainingCoolTimeSeconds: waitModeCooldownSeconds,
  };
}

export function notifyLiveWaitModeSkillUse(
  state: LiveWaitModeState,
  normalSkill: boolean,
): LiveWaitModeState {
  if (state.kind === 'waiting') return releaseLiveWaitMode(state, true);
  if (!normalSkill) return state;
  return {
    ...state,
    kind: state.kind === 'initial' ? 'force-reserved' : state.kind,
    remainingCoolTimeSeconds: waitModeCooldownSeconds,
  };
}

export type LiveWaitModeInput = Readonly<{
  enabled: boolean;
  availableCards: number;
  ap: LiveApGaugeState;
  ableUseSkill: boolean;
  mentalDown: boolean;
  allSkillsCostOver: boolean;
  deltaTimeSeconds: number;
}>;

export function advanceLiveWaitMode(
  state: LiveWaitModeState,
  input: LiveWaitModeInput,
): LiveWaitModeState {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('自動停止の経過時間が正しくありません。');
  }
  if (!input.enabled) return { ...createLiveWaitMode(), previousAp: input.ap.currentAp };
  if (state.kind === 'waiting') return state;
  if (state.kind === 'disabled') state = { ...state, kind: 'force-reserved' };
  const remainingCoolTimeSeconds =
    state.remainingCoolTimeSeconds > 0
      ? Math.fround(state.remainingCoolTimeSeconds - Math.fround(input.deltaTimeSeconds))
      : state.remainingCoolTimeSeconds;
  const next: LiveWaitModeState = {
    ...state,
    remainingCoolTimeSeconds,
    previousAp: input.ap.currentAp,
  };
  if (
    state.kind !== 'reserved' &&
    state.kind !== 'force-reserved' &&
    state.previousAp === input.ap.currentAp
  )
    return next;
  if (remainingCoolTimeSeconds > 0 || !input.ableUseSkill || input.mentalDown) {
    return { ...next, kind: state.kind === 'force-reserved' ? 'force-reserved' : 'reserved' };
  }
  if (state.kind === 'force-reserved' || state.previousAvailableCards !== input.availableCards) {
    const checked = { ...next, previousAvailableCards: input.availableCards };
    if (input.availableCards !== 0) return { ...checked, kind: 'waiting' };
    if (!input.allSkillsCostOver) return checked;
    return { ...checked, kind: 'initial' };
  }
  return { ...next, kind: 'initial' };
}
