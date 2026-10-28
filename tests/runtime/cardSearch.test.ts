import { expect, test } from 'vite-plus/test';
import { consumeLiveCardSearch } from '../../src/runtime/cards/cardSearch.ts';
import {
  deactivateLiveCardSearchParams,
  registerLiveCardSearchParam,
  removeLiveCardSearchParam,
  resetLiveCardSearchParams,
} from '../../src/runtime/cards/cardSearchState.ts';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';

const candidates = [
  {
    cardInstanceId: 1,
    cardDatasId: 1,
    skillMainEffect: 10,
    charactersId: 101,
    unitIds: [1001],
    tokenCardSeriesIds: [],
  },
  {
    cardInstanceId: 2,
    cardDatasId: 2,
    skillMainEffect: 20,
    charactersId: 102,
    unitIds: [1001, 1002],
    tokenCardSeriesIds: [2001],
  },
] as const;

test('末尾のskill CardSearchだけを消費して一致候補へ絞る', () => {
  const deckBoard = {
    ...createLiveDeckBoardState([1, 2], []),
    skillCardSearchParams: [
      { searchType: 'character-id' as const, searchId: 101 },
      { searchType: 'skill-main-effect' as const, searchId: 20 },
    ],
  };

  expect(consumeLiveCardSearch(deckBoard, candidates, [])).toEqual({
    deckBoard: {
      ...deckBoard,
      skillCardSearchParams: [{ searchType: 'character-id', searchId: 101 }],
    },
    candidates: [candidates[1]],
  });
});

test('一致候補がなければ検索条件を消費して通常候補を維持する', () => {
  const deckBoard = {
    ...createLiveDeckBoardState([1, 2], []),
    skillCardSearchParams: [{ searchType: 'token-card-series' as const, searchId: 9999 }],
  };

  expect(consumeLiveCardSearch(deckBoard, candidates, [])).toEqual({
    deckBoard: { ...deckBoard, skillCardSearchParams: [] },
    candidates,
  });
});

test('character、unit、token card seriesをそれぞれ検索する', () => {
  for (const searchParam of [
    { searchType: 'character-id' as const, searchId: 102 },
    { searchType: 'unit-id' as const, searchId: 1002 },
    { searchType: 'token-card-series' as const, searchId: 2001 },
  ]) {
    const deckBoard = {
      ...createLiveDeckBoardState([1, 2], []),
      skillCardSearchParams: [searchParam],
    };
    expect(consumeLiveCardSearch(deckBoard, candidates, []).candidates).toEqual([candidates[1]]);
  }
});

test('グレードの墓地検索をパートとスキルより先に消費する', () => {
  const board = {
    ...createLiveDeckBoardState([1, 2], []),
    gradeCardSearchParams: [{ searchType: 'character-id' as const, searchId: 102 }],
    sectionCardSearchParams: [{ searchType: 'character-id' as const, searchId: 101 }],
    skillCardSearchParams: [{ searchType: 'unit-id' as const, searchId: 1001 }],
  };
  const result = consumeLiveCardSearch(board, candidates.slice(0, 1), candidates.slice(1));
  expect(result.candidates).toEqual([candidates[1]]);
  expect(result.deckBoard.gradeCardSearchParams).toEqual([]);
  expect(result.deckBoard.sectionCardSearchParams).toBe(board.sectionCardSearchParams);
  expect(result.deckBoard.skillCardSearchParams).toBe(board.skillCardSearchParams);
});

test('一致しない上位検索を消費し、スキル検索では墓地候補を使わない', () => {
  const board = {
    ...createLiveDeckBoardState([1, 2], []),
    gradeCardSearchParams: [{ searchType: 'character-id' as const, searchId: 999 }],
    sectionCardSearchParams: [{ searchType: 'unit-id' as const, searchId: 999 }],
    skillCardSearchParams: [{ searchType: 'character-id' as const, searchId: 102 }],
  };
  const result = consumeLiveCardSearch(board, candidates.slice(0, 1), candidates.slice(1));
  expect(result.candidates).toEqual([candidates[0]]);
  expect(result.deckBoard.gradeCardSearchParams).toEqual([]);
  expect(result.deckBoard.sectionCardSearchParams).toEqual([]);
  expect(result.deckBoard.skillCardSearchParams).toEqual([]);
});

test('定義IDの検索は生成後の物理IDが違っても同じカードを対象にする', () => {
  const board = {
    ...createLiveDeckBoardState([1], []),
    cards: [],
    gradeCardSearchParams: [],
    sectionCardSearchParams: [],
    skillCardSearchParams: [
      {
        searchType: 'card-datas-id' as const,
        searchId: 'blueprint',
      },
    ],
  };
  const cards = ['copy-1', 'copy-2'].map((cardInstanceId) => ({
    cardInstanceId,
    cardDatasId: 'blueprint',
    skillMainEffect: null,
    charactersId: 0,
    unitIds: [],
    tokenCardSeriesIds: [],
  }));
  const other = {
    ...cards[0],
    cardInstanceId: 'other',
    cardDatasId: 'other-blueprint',
    skillMainEffect: null,
    charactersId: 0,
    unitIds: [],
    tokenCardSeriesIds: [],
  };
  const result = consumeLiveCardSearch(board, [...cards, other], []);
  expect(result.candidates).toEqual(cards);
  expect(result.deckBoard.skillCardSearchParams).toEqual([]);
});

test('同じ条件の別登録を参照で区別し、明示的resetは3種類をすべて消す', () => {
  const first = { searchType: 'character-id' as const, searchId: 101 };
  const second = { ...first };
  let board = createLiveDeckBoardState([1], []);
  for (const scope of ['grade', 'section', 'skill'] as const) {
    board = registerLiveCardSearchParam(board, scope, first);
    board = registerLiveCardSearchParam(board, scope, second);
  }
  const removed = removeLiveCardSearchParam(board, 'skill', second);
  expect(removed.skillCardSearchParams).toEqual([first]);
  expect(removed.skillCardSearchParams[0]).toBe(first);
  const reset = resetLiveCardSearchParams(removed);
  expect(reset.gradeCardSearchParams).toEqual([]);
  expect(reset.sectionCardSearchParams).toEqual([]);
  expect(reset.skillCardSearchParams).toEqual([]);
});

test('解除キーに対応する未消費指定だけを全検索リストから除く', () => {
  let board = createLiveDeckBoardState([1], []);
  const retained = { searchType: 'character-id' as const, searchId: 101 };
  for (const scope of ['grade', 'section', 'skill'] as const) {
    board = registerLiveCardSearchParam(board, scope, retained);
    board = registerLiveCardSearchParam(board, scope, { ...retained, deactivationKey: 'expired' });
  }
  const result = deactivateLiveCardSearchParams(board, 'expired');
  expect(result.gradeCardSearchParams).toEqual([retained]);
  expect(result.sectionCardSearchParams).toEqual([retained]);
  expect(result.skillCardSearchParams).toEqual([retained]);
});
