import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';

export type LiveCardSearchScope = 'grade' | 'section' | 'skill';
export type LiveDeckCardSearchParam<Id extends LiveCardIdentifier = number> = Readonly<
  (
    | {
        searchType: 'skill-main-effect' | 'character-id' | 'unit-id' | 'token-card-series';
        searchId: number;
      }
    | { searchType: 'card-datas-id'; searchId: Id }
  ) & { deactivationKey?: string }
>;
export type LiveCardSearchState<Id extends LiveCardIdentifier = number> = Readonly<{
  gradeCardSearchParams: readonly LiveDeckCardSearchParam<Id>[];
  sectionCardSearchParams: readonly LiveDeckCardSearchParam<Id>[];
  skillCardSearchParams: readonly LiveDeckCardSearchParam<Id>[];
}>;

export const liveCardSearchParamList = {
  grade: 'gradeCardSearchParams',
  section: 'sectionCardSearchParams',
  skill: 'skillCardSearchParams',
} as const;

export function createLiveCardSearchState<
  Id extends LiveCardIdentifier,
>(): LiveCardSearchState<Id> {
  return { gradeCardSearchParams: [], sectionCardSearchParams: [], skillCardSearchParams: [] };
}

export function registerLiveCardSearchParam<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  scope: LiveCardSearchScope,
  param: LiveDeckCardSearchParam<Id>,
): LiveDeckBoardState<Id> {
  if (
    param.searchType === 'card-datas-id'
      ? !(typeof param.searchId === 'string'
          ? param.searchId.length > 0
          : typeof param.searchId === 'number' &&
            Number.isSafeInteger(param.searchId) &&
            param.searchId > 0)
      : !Number.isSafeInteger(param.searchId) || param.searchId < 1
  ) {
    throw new Error('Live card search param is invalid');
  }
  const key = liveCardSearchParamList[scope];
  return { ...state, [key]: [...state[key], param] };
}

export function removeLiveCardSearchParam<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  scope: LiveCardSearchScope,
  param: LiveDeckCardSearchParam<Id>,
): LiveDeckBoardState<Id> {
  const key = liveCardSearchParamList[scope];
  const index = state[key].indexOf(param);
  if (index < 0) return state;
  return { ...state, [key]: state[key].filter((_, position) => position !== index) };
}

export function deactivateLiveCardSearchParams<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
  deactivationKey: string,
): LiveDeckBoardState<Id> {
  return {
    ...state,
    gradeCardSearchParams: state.gradeCardSearchParams.filter(
      (param) => param.deactivationKey !== deactivationKey,
    ),
    sectionCardSearchParams: state.sectionCardSearchParams.filter(
      (param) => param.deactivationKey !== deactivationKey,
    ),
    skillCardSearchParams: state.skillCardSearchParams.filter(
      (param) => param.deactivationKey !== deactivationKey,
    ),
  };
}

export function resetLiveCardSearchParams<Id extends LiveCardIdentifier>(
  state: LiveDeckBoardState<Id>,
): LiveDeckBoardState<Id> {
  return { ...state, ...createLiveCardSearchState<Id>() };
}
