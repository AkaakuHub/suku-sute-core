import { consumeLiveCardSearch } from '../../runtime/cards/cardSearch.ts';
import {
  deactivateLiveCardSearchParams,
  registerLiveCardSearchParam,
  type LiveCardSearchScope,
  type LiveDeckCardSearchParam,
} from '../../runtime/cards/cardSearchState.ts';
import { boardCardIds } from './deckBoard.ts';
import { liveBoardState } from '../../runtime/cards/deckBoardState.ts';
import type { GameState, SearchTarget } from '../model.ts';

export function registerSearch(
  state: GameState,
  scope: LiveCardSearchScope,
  target: SearchTarget,
  count: number,
  deactivationKey?: string,
): GameState {
  let param: LiveDeckCardSearchParam<string>;
  switch (target.kind) {
    case 'main-effect':
      param = { searchType: 'skill-main-effect', searchId: target.actionType };
      break;
    case 'member':
      param = { searchType: 'character-id', searchId: target.member };
      break;
    case 'unit':
      param = { searchType: 'unit-id', searchId: target.unit };
      break;
    case 'token-series':
      param = { searchType: 'token-card-series', searchId: target.seriesId };
      break;
    case 'token': {
      const card = state.tokenCatalog.find((candidate) => candidate.token === target.token);
      if (!card) throw new Error('検索する追加カードの定義がありません。');
      param = { searchType: 'card-datas-id', searchId: card.cardDatasId };
      break;
    }
  }
  if (deactivationKey !== undefined) param = { ...param, deactivationKey };
  let deckBoard = state.deckBoard;
  for (let index = 0; index < count; index++)
    deckBoard = registerLiveCardSearchParam(deckBoard, scope, param);
  return { ...state, deckBoard };
}

export function consumeSearch(
  state: GameState,
): Readonly<{ state: GameState; cardInstanceIds: readonly string[] }> {
  const deckIds = new Set(boardCardIds(state, liveBoardState.deck));
  const graveyardIds = new Set(boardCardIds(state, liveBoardState.graveyard));
  const searched = consumeLiveCardSearch(
    state.deckBoard,
    state.deck.filter((card) => deckIds.has(card.cardInstanceId)),
    state.deck.filter((card) => graveyardIds.has(card.cardInstanceId)),
  );
  return {
    state: { ...state, deckBoard: searched.deckBoard },
    cardInstanceIds: searched.candidates.map((card) => card.cardInstanceId),
  };
}

export function deactivateSearchRequests(state: GameState, deactivationKey: string): GameState {
  return { ...state, deckBoard: deactivateLiveCardSearchParams(state.deckBoard, deactivationKey) };
}
