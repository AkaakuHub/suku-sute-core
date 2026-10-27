const waitModeCooldownSeconds = 0.35;

export type WaitModeState = Readonly<{
  kind: 'disabled' | 'initial' | 'reserved' | 'force-reserved' | 'waiting';
  remainingCoolTimeSeconds: number;
  previousAvailableCards: number;
  previousSkillPoint: number;
}>;

export function createWaitMode(): WaitModeState {
  return {
    kind: 'disabled',
    remainingCoolTimeSeconds: 0,
    previousAvailableCards: 0,
    previousSkillPoint: 0,
  };
}

export function releaseWaitMode(state: WaitModeState, skillUsed: boolean): WaitModeState {
  return {
    ...state,
    kind: skillUsed ? 'force-reserved' : 'initial',
    remainingCoolTimeSeconds: waitModeCooldownSeconds,
  };
}

export function notifyWaitModeSkillUse(state: WaitModeState, normalSkill: boolean): WaitModeState {
  if (state.kind === 'waiting') return releaseWaitMode(state, true);
  if (!normalSkill) return state;
  return {
    ...state,
    kind: state.kind === 'initial' ? 'force-reserved' : state.kind,
    remainingCoolTimeSeconds: waitModeCooldownSeconds,
  };
}

export function advanceWaitMode(
  state: WaitModeState,
  input: Readonly<{
    enabled: boolean;
    availableCards: number;
    skillPoint: number;
    ableUseSkill: boolean;
    mentalDown: boolean;
    allSkillsCostOver: boolean;
    deltaTimeSeconds: number;
  }>,
): WaitModeState {
  if (!Number.isFinite(input.deltaTimeSeconds) || input.deltaTimeSeconds < 0) {
    throw new Error('自動停止の経過時間が正しくありません。');
  }
  if (!input.enabled) return { ...createWaitMode(), previousSkillPoint: input.skillPoint };
  if (state.kind === 'waiting') return state;
  const remainingCoolTimeSeconds = Math.max(
    0,
    state.remainingCoolTimeSeconds - input.deltaTimeSeconds,
  );
  const next: WaitModeState = {
    ...state,
    remainingCoolTimeSeconds,
    previousSkillPoint: input.skillPoint,
  };
  if (
    state.kind !== 'reserved' &&
    state.kind !== 'force-reserved' &&
    state.previousSkillPoint === input.skillPoint
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
