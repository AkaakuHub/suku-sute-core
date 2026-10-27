import type { LiveDeckBoardState, LiveDeckCardSearchParam } from './deckBoardState.ts';

export type LiveCardSearchCandidate = Readonly<{
  cardInstanceId: number;
  skillMainEffect: number;
  charactersId: number;
  unitIds: readonly number[];
  tokenCardSeriesIds: readonly number[];
}>;

export type LiveCardSearchResult<Candidate extends LiveCardSearchCandidate> = Readonly<{
  deckBoard: LiveDeckBoardState;
  candidates: readonly Candidate[];
}>;

export function consumeLiveSkillCardSearch<Candidate extends LiveCardSearchCandidate>(
  deckBoard: LiveDeckBoardState,
  candidates: readonly Candidate[],
): LiveCardSearchResult<Candidate> {
  validateCandidates(candidates);
  const searchParam = deckBoard.skillCardSearchParams.at(-1);
  if (searchParam === undefined) return { deckBoard, candidates };
  const remainingParams = deckBoard.skillCardSearchParams.slice(0, -1);
  const matches = candidates.filter((candidate) => matchesCardSearch(candidate, searchParam));
  return {
    deckBoard: { ...deckBoard, skillCardSearchParams: remainingParams },
    candidates: matches.length === 0 ? candidates : matches,
  };
}

function matchesCardSearch(
  candidate: LiveCardSearchCandidate,
  searchParam: LiveDeckCardSearchParam,
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
  }
}

function validateCandidates(candidates: readonly LiveCardSearchCandidate[]): void {
  for (const candidate of candidates) {
    if (
      !Number.isSafeInteger(candidate.cardInstanceId) ||
      candidate.cardInstanceId <= 0 ||
      !Number.isSafeInteger(candidate.skillMainEffect) ||
      candidate.skillMainEffect < 0 ||
      !Number.isSafeInteger(candidate.charactersId) ||
      candidate.charactersId <= 0 ||
      !candidate.unitIds.every((unitId) => Number.isSafeInteger(unitId) && unitId > 0) ||
      !candidate.tokenCardSeriesIds.every(
        (seriesId) => Number.isSafeInteger(seriesId) && seriesId > 0,
      )
    ) {
      throw new Error('Live CardSearch candidate is invalid');
    }
  }
}
