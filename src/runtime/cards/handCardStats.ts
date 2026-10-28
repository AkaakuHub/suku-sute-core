export type LiveHandCardStats = Readonly<{
  isActive: boolean;
  initialSectionIndex: number;
  sectionCount: number;
  skillUseCountsByMember: Readonly<Record<number, number>>;
  skillUseCountsByMainEffect: Readonly<Record<number, number>>;
}>;

export function createLiveHandCardStats(currentSection: number): LiveHandCardStats {
  return {
    isActive: true,
    initialSectionIndex: currentSection,
    sectionCount: 0,
    skillUseCountsByMember: {},
    skillUseCountsByMainEffect: {},
  };
}

export function advanceLiveHandCardStatsSection(
  state: LiveHandCardStats,
  currentSection: number,
): LiveHandCardStats {
  return state.isActive
    ? { ...state, sectionCount: (currentSection - state.initialSectionIndex) | 0 }
    : state;
}

export function notifyLiveHandCardStatsSkillUse(
  state: LiveHandCardStats,
  charactersId: number,
  skillMainEffect: number | null,
): LiveHandCardStats {
  if (!state.isActive) return state;
  return {
    ...state,
    skillUseCountsByMember: increment(state.skillUseCountsByMember, charactersId),
    skillUseCountsByMainEffect:
      skillMainEffect === null
        ? state.skillUseCountsByMainEffect
        : increment(state.skillUseCountsByMainEffect, skillMainEffect),
  };
}

export function liveHandCardStatsUnitUseCount(
  state: LiveHandCardStats,
  unitId: number,
  isUnitMember: (unitId: number, charactersId: number) => boolean,
): number {
  return Object.entries(state.skillUseCountsByMember).reduce((sum, [id, count]) => {
    if (!isUnitMember(unitId, Number(id))) return sum;
    const next = sum + count;
    if (next < -2_147_483_648 || next > 2_147_483_647)
      throw new Error('Live hand unit skill use count overflow');
    return next;
  }, 0);
}

export function reconcileLiveHandCardStats(
  state: Readonly<Record<string, LiveHandCardStats>>,
  handCardIds: readonly string[],
  activeHandCardIds: readonly string[],
  currentSection: number,
): Readonly<Record<string, LiveHandCardStats>> {
  const activeIds = new Set(activeHandCardIds);
  return Object.fromEntries(
    handCardIds.map((id) => {
      const current = state[id] ?? createLiveHandCardStats(currentSection);
      const isActive = activeIds.has(id);
      return [id, current.isActive === isActive ? current : { ...current, isActive }];
    }),
  );
}

function increment(
  counts: Readonly<Record<number, number>>,
  key: number,
): Readonly<Record<number, number>> {
  return { ...counts, [key]: ((counts[key] ?? 0) + 1) | 0 };
}
