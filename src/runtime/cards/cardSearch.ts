import type { LiveCardIdentity } from './cardIdentity.ts';
import type { LiveCardIdentifier, LiveDeckBoardState } from './deckBoardState.ts';
import { liveCardSearchParamList, type LiveDeckCardSearchParam } from './cardSearchState.ts';

export type LiveCardSearchCandidate<Id extends LiveCardIdentifier = number> = Readonly<
  LiveCardIdentity & {
    cardInstanceId: Id;
    cardDatasId: Id;
    skillMainEffect: number | null;
    tokenCardSeriesIds: readonly number[];
  }
>;

export function consumeLiveCardSearch<
  Id extends LiveCardIdentifier,
  Candidate extends LiveCardSearchCandidate<Id>,
>(
  deckBoard: LiveDeckBoardState<Id>,
  candidates: readonly Candidate[],
  graveyardCandidates: readonly Candidate[],
): Readonly<{ deckBoard: LiveDeckBoardState<Id>; candidates: readonly Candidate[] }> {
  validateCandidates(candidates);
  validateCandidates(graveyardCandidates);
  let next = deckBoard;
  for (const scope of ['grade', 'section', 'skill'] as const) {
    const key = liveCardSearchParamList[scope];
    const searchParam = next[key].at(-1);
    if (searchParam === undefined) continue;
    next = { ...next, [key]: next[key].slice(0, -1) };
    const matches = candidates.filter((candidate) => matchesCardSearch(candidate, searchParam));
    if (matches.length > 0) return { deckBoard: next, candidates: matches };
    if (scope !== 'skill') {
      const fromGraveyard = graveyardCandidates.filter((candidate) =>
        matchesCardSearch(candidate, searchParam),
      );
      if (fromGraveyard.length > 0) return { deckBoard: next, candidates: fromGraveyard };
    }
  }
  return { deckBoard: next, candidates };
}

function matchesCardSearch<Id extends LiveCardIdentifier>(
  candidate: LiveCardSearchCandidate<Id>,
  searchParam: LiveDeckCardSearchParam<Id>,
): boolean {
  switch (searchParam.searchType) {
    case 'skill-main-effect':
      return candidate.skillMainEffect === searchParam.searchId;
    case 'character-id':
      return candidate.charactersId === searchParam.searchId;
    case 'unit-id':
      return candidate.unitIds.includes(searchParam.searchId);
    case 'token-card-series':
      return candidate.tokenCardSeriesIds.includes(searchParam.searchId);
    case 'card-datas-id':
      return candidate.cardDatasId === searchParam.searchId;
  }
}

function validateCandidates(
  candidates: readonly LiveCardSearchCandidate<LiveCardIdentifier>[],
): void {
  const validId = (id: LiveCardIdentifier) =>
    typeof id === 'string' ? id.length > 0 : Number.isSafeInteger(id) && id > 0;
  for (const candidate of candidates) {
    if (
      !validId(candidate.cardInstanceId) ||
      !validId(candidate.cardDatasId) ||
      (candidate.skillMainEffect !== null &&
        (!Number.isSafeInteger(candidate.skillMainEffect) || candidate.skillMainEffect < 0)) ||
      !Number.isSafeInteger(candidate.charactersId) ||
      candidate.charactersId < 0 ||
      !candidate.unitIds.every((unitId) => Number.isSafeInteger(unitId) && unitId > 0) ||
      !candidate.tokenCardSeriesIds.every(
        (seriesId) => Number.isSafeInteger(seriesId) && seriesId > 0,
      )
    )
      throw new Error('Live CardSearch candidate is invalid');
  }
}
