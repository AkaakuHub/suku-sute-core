export const liveComboInduceMemberModes = ['six', 'nine', 'eleven'] as const;

export type LiveComboInduceMemberMode = (typeof liveComboInduceMemberModes)[number];

export type LiveComboInduceMemberState = Readonly<{
  characterId: number;
  ap: number | null;
  linked: boolean;
}>;

export type LiveComboInduceUiState = Readonly<{
  memberType: LiveComboInduceMemberMode;
  members: readonly LiveComboInduceMemberState[];
  isPlaying: boolean;
  holdSetAp: boolean;
  showEffect: boolean;
}>;

export type LiveComboInduceUiEvent =
  | Readonly<{
      kind: 'show';
      memberType: LiveComboInduceMemberMode;
      characterIds: readonly number[];
    }>
  | Readonly<{ kind: 'hide' | 'reset-ap' | 'pause' | 'resume' }>
  | Readonly<{
      kind: 'set-ap';
      characterId: number;
      ap: number;
      showEffect: boolean;
    }>
  | Readonly<{ kind: 'set-link'; characterId: number }>;

export type LiveComboInduceUiTimedEvent = Readonly<{
  atSeconds: number;
  event: LiveComboInduceUiEvent;
}>;

export type LiveComboInduceLinkDrawCommand = Readonly<{
  kind: 'combo-induce-member-link';
  memberIndex: number;
  characterId: number;
  order: number;
}>;

export type LiveComboInduceParticlePhase = 'circle' | 'circle-end';

export type LiveComboInduceParticlePlayback = Readonly<{
  memberIndex: number;
  phase: LiveComboInduceParticlePhase;
  startedAtSeconds: number;
  elapsedSeconds: number;
}>;

export function createLiveComboInduceUiState(
  input: Readonly<{
    memberType: LiveComboInduceMemberMode;
    characterIds: readonly number[];
  }>,
): LiveComboInduceUiState {
  if (
    input.characterIds.length < 1 ||
    input.characterIds.length > 11 ||
    resolveLiveComboInduceMemberMode(input.characterIds.length) !== input.memberType
  ) {
    throw new Error('ComboInduceUI member count differs');
  }
  const characterIds = new Set<number>();
  for (const characterId of input.characterIds) {
    if (!Number.isSafeInteger(characterId) || characterId <= 0) {
      throw new Error('ComboInduceMember characterId is invalid');
    }
    if (characterIds.has(characterId)) {
      throw new Error('ComboInduceMember characterId is duplicated');
    }
    characterIds.add(characterId);
  }
  return {
    memberType: input.memberType,
    members: input.characterIds.map((characterId) => ({
      characterId,
      ap: null,
      linked: false,
    })),
    isPlaying: true,
    holdSetAp: false,
    showEffect: false,
  };
}

export function setLiveComboInduceMemberAp(
  state: LiveComboInduceUiState,
  characterId: number,
  ap: number,
  showEffect: boolean,
): LiveComboInduceUiState {
  if (!Number.isSafeInteger(ap) || ap < 0) {
    throw new Error('ComboInduceMember AP is invalid');
  }
  const memberIndex = requireMemberIndex(state, characterId);
  return {
    ...state,
    members: state.members.map((member, index) =>
      index === memberIndex ? { ...member, ap } : member,
    ),
    showEffect,
  };
}

export function setLiveComboInduceMemberLink(
  state: LiveComboInduceUiState,
  characterId: number,
): LiveComboInduceUiState {
  const memberIndex = requireMemberIndex(state, characterId);
  return {
    ...state,
    members: state.members.map((member, index) =>
      index === memberIndex ? { ...member, linked: true } : member,
    ),
  };
}

export function resetLiveComboInduceMemberAp(
  state: LiveComboInduceUiState,
): LiveComboInduceUiState {
  return {
    ...state,
    members: state.members.map((member) => ({
      ...member,
      ap: null,
      linked: false,
    })),
    showEffect: false,
  };
}

export function setLiveComboInduceUiPlaying(
  state: LiveComboInduceUiState,
  isPlaying: boolean,
): LiveComboInduceUiState {
  return { ...state, isPlaying };
}

export function applyLiveComboInduceUiEvent(
  state: LiveComboInduceUiState | null,
  event: LiveComboInduceUiEvent,
): LiveComboInduceUiState | null {
  if (event.kind === 'show') {
    return createLiveComboInduceUiState(event);
  }
  if (event.kind === 'hide') return null;
  if (state === null) {
    throw new Error(`ComboInduceUI event requires active state:${event.kind}`);
  }
  switch (event.kind) {
    case 'reset-ap':
      return resetLiveComboInduceMemberAp(state);
    case 'pause':
      return setLiveComboInduceUiPlaying(state, false);
    case 'resume':
      return setLiveComboInduceUiPlaying(state, true);
    case 'set-ap':
      return setLiveComboInduceMemberAp(state, event.characterId, event.ap, event.showEffect);
    case 'set-link':
      return setLiveComboInduceMemberLink(state, event.characterId);
  }
}

export function projectLiveComboInduceUiAtTime(
  events: readonly LiveComboInduceUiTimedEvent[],
  currentTimeSeconds: number,
): LiveComboInduceUiState | null {
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) {
    throw new Error('ComboInduceUI event clock is invalid');
  }
  let state: LiveComboInduceUiState | null = null;
  let previousTimeSeconds = 0;
  for (const timedEvent of events) {
    if (!Number.isFinite(timedEvent.atSeconds) || timedEvent.atSeconds < previousTimeSeconds) {
      throw new Error('ComboInduceUI event order is invalid');
    }
    previousTimeSeconds = timedEvent.atSeconds;
    if (timedEvent.atSeconds > currentTimeSeconds) break;
    state = applyLiveComboInduceUiEvent(state, timedEvent.event);
  }
  return state;
}

export function projectLiveComboInduceLinkDrawCommands(
  state: LiveComboInduceUiState | null,
): readonly LiveComboInduceLinkDrawCommand[] {
  if (state === null) return [];
  if (!state.isPlaying) return [];
  if (resolveLiveComboInduceMemberMode(state.members.length) !== state.memberType) {
    throw new Error('ComboInduceUI state member count differs');
  }
  return state.members.flatMap((member, memberIndex) => {
    if (!member.linked) return [];
    return [
      {
        kind: 'combo-induce-member-link' as const,
        memberIndex,
        characterId: member.characterId,
        order: memberIndex,
      },
    ];
  });
}

export function projectLiveComboInduceParticlePlaybacksAtTime(
  events: readonly LiveComboInduceUiTimedEvent[],
  currentTimeSeconds: number,
): readonly LiveComboInduceParticlePlayback[] {
  if (!Number.isFinite(currentTimeSeconds) || currentTimeSeconds < 0) {
    throw new Error('ComboInduceUI particle clock is invalid');
  }
  let state: LiveComboInduceUiState | null = null;
  let previousTimeSeconds = 0;
  let pausedAtSeconds: number | null = null;
  let pausedDurationSeconds = 0;
  const starts: {
    memberIndex: number;
    startedAtSeconds: number;
    pausedDurationAtStartSeconds: number;
  }[] = [];
  for (const timedEvent of events) {
    if (!Number.isFinite(timedEvent.atSeconds) || timedEvent.atSeconds < previousTimeSeconds) {
      throw new Error('ComboInduceUI particle event order is invalid');
    }
    previousTimeSeconds = timedEvent.atSeconds;
    if (timedEvent.atSeconds > currentTimeSeconds) break;
    const event = timedEvent.event;
    if (event.kind === 'show' || event.kind === 'hide') {
      starts.length = 0;
      pausedAtSeconds = null;
      pausedDurationSeconds = 0;
    }
    if (event.kind === 'pause' && pausedAtSeconds === null) {
      pausedAtSeconds = timedEvent.atSeconds;
    }
    if (event.kind === 'resume' && pausedAtSeconds !== null) {
      pausedDurationSeconds += timedEvent.atSeconds - pausedAtSeconds;
      pausedAtSeconds = null;
    }
    if (event.kind === 'set-ap' && event.showEffect) {
      if (state === null) {
        throw new Error('ComboInduceUI particle event requires active state');
      }
      const memberIndex = requireMemberIndex(state, event.characterId);
      starts.push({
        memberIndex,
        startedAtSeconds: timedEvent.atSeconds,
        pausedDurationAtStartSeconds:
          pausedDurationSeconds +
          (pausedAtSeconds === null ? 0 : timedEvent.atSeconds - pausedAtSeconds),
      });
    }
    state = applyLiveComboInduceUiEvent(state, event);
  }
  const totalPausedDurationSeconds =
    pausedDurationSeconds + (pausedAtSeconds === null ? 0 : currentTimeSeconds - pausedAtSeconds);
  return starts.flatMap((start): readonly LiveComboInduceParticlePlayback[] => {
    const elapsedSeconds =
      currentTimeSeconds -
      start.startedAtSeconds -
      (totalPausedDurationSeconds - start.pausedDurationAtStartSeconds);
    if (elapsedSeconds < 0 || elapsedSeconds > 2) return [];
    const startedAtSeconds = currentTimeSeconds - elapsedSeconds;
    return elapsedSeconds <= 1
      ? [
          {
            memberIndex: start.memberIndex,
            phase: 'circle' as const,
            startedAtSeconds,
            elapsedSeconds,
          },
        ]
      : [
          {
            memberIndex: start.memberIndex,
            phase: 'circle-end' as const,
            startedAtSeconds: startedAtSeconds + 1,
            elapsedSeconds: elapsedSeconds - 1,
          },
        ];
  });
}

function requireMemberIndex(state: LiveComboInduceUiState, characterId: number): number {
  if (!Number.isSafeInteger(characterId) || characterId <= 0) {
    throw new Error('ComboInduceMember characterId is invalid');
  }
  const indexes = state.members.flatMap((member, index) =>
    member.characterId === characterId ? [index] : [],
  );
  if (indexes.length !== 1 || indexes[0] === undefined) {
    throw new Error(`ComboInduceMember characterId is not unique:${String(characterId)}`);
  }
  return indexes[0];
}

export function resolveLiveComboInduceMemberMode(memberCount: number): LiveComboInduceMemberMode {
  if (!Number.isSafeInteger(memberCount) || memberCount < 1 || memberCount > 11) {
    throw new Error('ComboInduceUI member count differs');
  }
  if (memberCount < 7) return 'six';
  if (memberCount < 10) return 'nine';
  return 'eleven';
}
