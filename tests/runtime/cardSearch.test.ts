import { expect, test } from 'vite-plus/test';
import { consumeLiveSkillCardSearch } from '../../src/runtime/cards/cardSearch.ts';
import { createLiveDeckBoardState } from '../../src/runtime/cards/deckBoardState.ts';

const candidates = [
  {
    cardInstanceId: 1,
    skillMainEffect: 10,
    charactersId: 101,
    unitIds: [1001],
    tokenCardSeriesIds: [],
  },
  {
    cardInstanceId: 2,
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

  expect(consumeLiveSkillCardSearch(deckBoard, candidates)).toEqual({
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

  expect(consumeLiveSkillCardSearch(deckBoard, candidates)).toEqual({
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
    expect(consumeLiveSkillCardSearch(deckBoard, candidates).candidates).toEqual([candidates[1]]);
  }
});
