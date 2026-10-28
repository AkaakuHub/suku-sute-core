import { isLiveSkillCostOver, type LiveSkillCostInput } from './skillCost.ts';
export type LiveSkillActivationUnresolvedReason =
  | 'verified-skill-cost-missing'
  | 'verified-card-draw-plan-missing';

export type LiveSkillActivationCommand = Readonly<
  | {
      kind: 'set-skill-cooldown';
      currentSeconds: number;
      remainingSeconds: number;
      source: 'registered' | 'base';
    }
  | { kind: 'set-card-board-state'; state: 5 }
  | { kind: 'consume-skill-cost'; consumeAp: number }
  | { kind: 'activate-card-skill' }
  | { kind: 'activate-card-ability' }
  | { kind: 'draw-card' }
  | { kind: 'enqueue-board-action'; action: 2 | 4 | 5 | 6 | 7 | 8 }
  | { kind: 'notify-skill-use' }
>;

export type LiveSkillActivationResult =
  | Readonly<{
      kind: 'blocked';
      reason: 'live-phase' | 'deck-action-running';
    }>
  | Readonly<{
      kind: 'unresolved';
      reason: LiveSkillActivationUnresolvedReason;
    }>
  | Readonly<{
      kind: 'activated';
      commands: readonly LiveSkillActivationCommand[];
    }>;

export type LiveSkillCooldownState = Readonly<{
  currentSeconds: number;
  remainingSeconds: number;
}>;

export type LiveSkillCoolTimeProfile = Readonly<{
  baseSeconds: number;
  underAddFactor: number;
  overAddFactor: number;
  underLimit: number;
  overLimit: number;
}>;

export function calculateLiveSkillCoolTime(
  profile: LiveSkillCoolTimeProfile,
  currentDeckCardCount: number,
  deckCardMax: number,
): number {
  validateSkillCoolTimeProfile(profile);
  if (
    !Number.isSafeInteger(currentDeckCardCount) ||
    currentDeckCardCount < 0 ||
    !Number.isSafeInteger(deckCardMax) ||
    deckCardMax < 0
  ) {
    throw new Error('Live skill cool time deck count is invalid');
  }
  const difference = currentDeckCardCount - deckCardMax;
  const limit = difference < 0 ? profile.underLimit : profile.overLimit;
  const addFactor = difference < 0 ? profile.underAddFactor : profile.overAddFactor;
  const clampedDifference = Math.min(Math.abs(difference), limit);
  return Math.fround(
    Math.fround(profile.baseSeconds) * Math.fround(1 + Math.fround(addFactor * clampedDifference)),
  );
}

export function createLiveSkillCooldownState(): LiveSkillCooldownState {
  return {
    currentSeconds: 0,
    remainingSeconds: 0,
  };
}

export function startLiveSkillCooldown(seconds: number): LiveSkillCooldownState {
  validateCooldownSeconds(seconds);
  return {
    currentSeconds: seconds,
    remainingSeconds: seconds,
  };
}

export function advanceLiveSkillCooldown(
  state: LiveSkillCooldownState,
  deltaTimeSeconds: number,
): LiveSkillCooldownState {
  validateCooldownState(state);
  if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds < 0) {
    throw new Error('Live skill cooldown delta time is invalid');
  }
  if (state.remainingSeconds <= 0) return state;
  return {
    ...state,
    remainingSeconds: state.remainingSeconds - deltaTimeSeconds,
  };
}

export function canActivateLiveHandCardSkill(
  input: LiveSkillCostInput &
    Readonly<{
      isHand: boolean;
      mentalDown: boolean;
      skillCooldown: LiveSkillCooldownState;
    }>,
): boolean {
  validateCooldownState(input.skillCooldown);
  return (
    input.isHand &&
    !input.mentalDown &&
    !isLiveSkillCostOver(input) &&
    input.skillCooldown.remainingSeconds <= 0
  );
}

export function calculateLiveBaseSkillCooldownSeconds(playTimeMilliseconds: number): number {
  if (!Number.isSafeInteger(playTimeMilliseconds) || playTimeMilliseconds < 0) {
    throw new Error('Musics.PlayTime is invalid');
  }
  return Math.fround(
    Math.fround(Math.fround(playTimeMilliseconds) * Math.fround(1 / 256)) / Math.fround(1_000),
  );
}

function validateSkillCoolTimeProfile(profile: LiveSkillCoolTimeProfile): void {
  if (
    [profile.baseSeconds, profile.underAddFactor, profile.overAddFactor].some(
      (value) => !Number.isFinite(value),
    ) ||
    profile.baseSeconds < 0 ||
    ![profile.underLimit, profile.overLimit].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  ) {
    throw new Error('Live skill cool time profile is invalid');
  }
}

type VerifiedSkillCost = Readonly<{
  kind: 'verified';
  consumeAp: number;
}>;

type VerifiedCardDrawPlan = Readonly<{
  kind: 'verified';
  hasUseAllHandSkill: boolean;
  drawCard: boolean;
}>;

export function resolveLiveSkillActivation(
  input: Readonly<{
    livePhase: number;
    deckActionRunning: boolean;
    registeredCooldownSeconds: number | null;
    baseCooldownSeconds: number;
    skillCost: VerifiedSkillCost | Readonly<{ kind: 'unresolved' }>;
    drawPlan: VerifiedCardDrawPlan | Readonly<{ kind: 'unresolved' }>;
  }>,
): LiveSkillActivationResult {
  validateInput(input);
  if (input.livePhase !== 3) {
    return { kind: 'blocked', reason: 'live-phase' };
  }
  if (input.deckActionRunning) {
    return { kind: 'blocked', reason: 'deck-action-running' };
  }
  if (input.skillCost.kind === 'unresolved') {
    return { kind: 'unresolved', reason: 'verified-skill-cost-missing' };
  }
  if (input.drawPlan.kind === 'unresolved') {
    return {
      kind: 'unresolved',
      reason: 'verified-card-draw-plan-missing',
    };
  }

  const cooldown = resolveCooldown(input);
  const commands: LiveSkillActivationCommand[] = [
    {
      kind: 'set-skill-cooldown',
      currentSeconds: cooldown.seconds,
      remainingSeconds: cooldown.seconds,
      source: cooldown.source,
    },
    { kind: 'set-card-board-state', state: 5 },
    {
      kind: 'consume-skill-cost',
      consumeAp: input.skillCost.consumeAp,
    },
    { kind: 'activate-card-skill' },
    { kind: 'activate-card-ability' },
  ];
  if (input.drawPlan.hasUseAllHandSkill) {
    commands.push(
      { kind: 'enqueue-board-action', action: 7 },
      { kind: 'enqueue-board-action', action: 8 },
    );
  } else {
    if (input.drawPlan.drawCard) commands.push({ kind: 'draw-card' });
    commands.push({ kind: 'enqueue-board-action', action: 4 });
  }
  commands.push(
    { kind: 'enqueue-board-action', action: 5 },
    { kind: 'notify-skill-use' },
    { kind: 'enqueue-board-action', action: 6 },
    { kind: 'enqueue-board-action', action: 2 },
  );
  return { kind: 'activated', commands };
}

function resolveCooldown(
  input: Readonly<{
    registeredCooldownSeconds: number | null;
    baseCooldownSeconds: number;
  }>,
): Readonly<{
  seconds: number;
  source: 'registered' | 'base';
}> {
  if (input.registeredCooldownSeconds !== null) {
    return { seconds: input.registeredCooldownSeconds, source: 'registered' };
  }
  return { seconds: input.baseCooldownSeconds, source: 'base' };
}

function validateCooldownState(state: LiveSkillCooldownState): void {
  validateCooldownSeconds(state.currentSeconds);
  if (!Number.isFinite(state.remainingSeconds)) {
    throw new Error('Live skill cooldown is invalid');
  }
}

function validateCooldownSeconds(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('Live skill cooldown is invalid');
  }
}

function validateInput(
  input: Readonly<{
    livePhase: number;
    registeredCooldownSeconds: number | null;
    baseCooldownSeconds: number;
    skillCost: VerifiedSkillCost | Readonly<{ kind: 'unresolved' }>;
  }>,
): void {
  if (!Number.isSafeInteger(input.livePhase)) {
    throw new Error('Live skill live phase is invalid');
  }
  for (const seconds of [input.registeredCooldownSeconds, input.baseCooldownSeconds]) {
    if (seconds !== null && (!Number.isFinite(seconds) || seconds < 0)) {
      throw new Error('Live skill cooldown is invalid');
    }
  }
  if (input.skillCost.kind === 'verified') {
    if (!Number.isSafeInteger(input.skillCost.consumeAp) || input.skillCost.consumeAp < 0) {
      throw new Error('Live skill cost is invalid');
    }
  }
}
